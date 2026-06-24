/*
 * Multi-hop RAG — 多跳检索增强生成
 *
 * 适用场景：需要链式推理的问题（如「A 是谁 → A 的父亲公开身份是什么」），
 * 单次检索难以覆盖全部事实，需拆成多个子问题依次检索并累积证据。
 *
 * 流程：
 *   START → route_question ─┬─ simple  → direct_answer → END
 *                           └─ complex → decompose_question
 *                                              ↓
 *                                         retrieve（按子问题逐轮检索）
 *                                              ↓
 *                                         plan_next_step ─┬─ retrieve（继续下一轮）
 *                                                         └─ generate → END
 *
 * 技术栈：LangGraph（状态图编排）+ Milvus（向量检索）+ OpenAI 兼容 API
 */

import { Milvus } from "@langchain/community/vectorstores/milvus";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";
import { z } from "zod";

// 对话模型：用于路由、子问题拆解、检索规划与最终生成
const llm = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 嵌入模型：将子问题转为向量，用于 Milvus 相似度检索
// dimensions 必须与建库时向量维度一致（此处 1024）
const embeddings = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: 1024,
});

// LangGraph 共享状态：各节点读取/写入这些字段，在图中流转
const GraphState = Annotation.Root({
  question: Annotation, // 用户原始问题
  k: Annotation, // 每轮检索返回的 top-k 文档数
  strategy: Annotation, // 路由结果：simple | complex
  routeReason: Annotation, // 路由理由（便于调试）
  subQuestions: Annotation, // 拆解得到的有序子问题列表，仅用于检索
  nextSubQuestionIndex: Annotation, // 下一轮 retrieve 要用的下标（指向下一条未检索的子问题）
  documents: Annotation, // 多轮检索累积的文档（按 id 去重、按 score 排序）
  currentQuery: Annotation, // 当前轮实际使用的检索查询（某条子问题）
  retrievalCount: Annotation, // 已完成的检索轮数
  maxRetrievalCount: Annotation, // 最大检索轮数上限，防止无限循环
  plannedNext: Annotation, // 规划器决策：retrieve | generate
  generation: Annotation, // 最终生成的回答
});

// 向量库实例在 main() 中初始化，供 retrieveRelevantContent 使用
let vectorStore;

/**
 * 向量相似度检索：将问题 embedding 后在 Milvus 中查找最相关的 k 个片段
 */
async function retrieveRelevantContent(question, k) {
  try {
    const docsWithScores = await vectorStore.similaritySearchWithScore(
      question,
      k,
    );
    return docsWithScores.map(([doc, score]) => ({
      score,
      content: doc.pageContent,
      id: doc.metadata?.id ?? "unknown",
      book_id: doc.metadata?.book_id ?? "未知",
      chapter_num: doc.metadata?.chapter_num ?? "未知",
      index: doc.metadata?.index ?? "未知",
    }));
  } catch (error) {
    console.error("检索内容时出错:", error.message);
    return [];
  }
}

/**
 * 多轮检索结果合并：按文档 id 去重，同一 id 保留相似度更高的那条
 * 最终按 score 降序排列，便于 generate 节点优先使用高相关片段
 */
function mergeUnique(existingDocs, newDocs) {
  const map = new Map();
  for (const doc of [...existingDocs, ...newDocs]) {
    const key = String(doc.id);
    const prev = map.get(key);
    if (!prev || Number(doc.score) > Number(prev.score)) {
      map.set(key, doc);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => Number(b.score) - Number(a.score),
  );
}

// 路由器结构化输出：LLM 必须返回 strategy + reason
const RouteSchema = z.object({
  strategy: z.enum(["simple", "complex"]),
  reason: z.string(),
});

// 子问题拆解器结构化输出：有序子问题列表 + 拆解理由
const DecomposeSchema = z.object({
  sub_questions: z.array(z.string()).min(1).max(8),
  reason: z.string(),
});

// 检索规划器结构化输出：决定继续检索还是生成答案
const NextStepSchema = z.object({
  next_step: z.enum(["retrieve", "generate"]),
  reason: z.string(),
});

/**
 * 节点 1：问题路由
 * 判断问题是常识级（simple）还是需要小说细节的多跳问题（complex）
 */
const routeQuestionNode = async (state) => {
  console.log("---ROUTE_QUESTION_NODE---");
  const router = llm.withStructuredOutput(RouteSchema);
  const route = await router.invoke(`
你是问答路由器。请判断用户问题是否需要外部检索。

规则：
- simple: 常识问答、简短定义、无需特定小说细节即可回答。
- complex: 需要《天龙八部》具体情节、人物关系、章节事实、原文细节或证据支持。

用户问题：${state.question}
    `);

  console.log(`路由策略: ${route.strategy} (${route.reason})`);
  return {
    strategy: route.strategy,
    routeReason: route.reason,
    retrievalCount: 0,
    maxRetrievalCount: state.maxRetrievalCount ?? 8,
    documents: [],
    subQuestions: [],
    nextSubQuestionIndex: 0,
    currentQuery: "",
  };
};

/**
 * 节点 2：子问题拆解（仅 complex 路径）
 * 将多跳问题拆成有序、可独立检索的子问题链，避免指代词导致检索失败
 */
const decomposeQuestionNode = async (state) => {
  console.log("---DECOMPOSE_QUESTION_NODE---");
  const decomposer = llm.withStructuredOutput(DecomposeSchema);
  const out = await decomposer.invoke(`
你是《天龙八部》多跳问答的「子问题拆解器」。

用户原始问题：
${state.question}

任务：将问题拆成**有序**子问题列表 sub_questions，用于**依次向量检索**。要求：
1. 链式推理、多层关系、因果先后的问题，必须拆成多条；单跳即可答的也可只输出 1 条。
2. 每条子问题必须是**可独立检索**的完整中文问句，**禁止**使用「他/她/此人/上文」等指代；可写全人物名与事件名。
3. 顺序必须符合推理链：先搞清前置实体/事实，再查后续结论。
4. **不要**把整句原题原样复制成唯一一条（除非确实无法拆分）；不要拆成过碎的关键词列表。
5. 输出 1～8 条即可。

请输出 sub_questions 与简短 reason。
`);
  const subQuestions = out.sub_questions.map((q) => q.trim()).filter(Boolean);
  if (subQuestions.length === 0) {
    throw new Error("decompose_question: sub_questions 为空");
  }
  console.log(`拆解为 ${subQuestions.length} 条子问题：${out.reason}`);
  subQuestions.forEach((q, i) => {
    console.log(`  [${i + 1}] ${q}`);
  });
  return {
    subQuestions,
    nextSubQuestionIndex: 0,
    currentQuery: subQuestions[0],
  };
};

/**
 * 节点 3：向量检索（每轮取一条子问题）
 * 按 nextSubQuestionIndex 依次检索，结果 merge 进 documents 并推进下标
 */
const retrieveNode = async (state) => {
  const subs = state.subQuestions ?? [];
  const index = state.nextSubQuestionIndex ?? 0;
  const q = subs[index]?.trim() ?? "";
  if (!q) {
    throw new Error(
      `retrieve: 子问题下标${index}无有效文本 共${subs.length}条`,
    );
  }

  const round = state.retrievalCount + 1;

  console.log(`---[R${round}], 子问题${index + 1}/${subs.length}---`);

  console.log(`检索: ${q}`);

  const newDocs = await retrieveRelevantContent(q, state.k);
  const merged = mergeUnique(state.documents ?? [], newDocs);

  if (newDocs.length === 0) {
    console.log("RETRIEVE结果：未命中文档");
  } else {
    console.log(
      `RETRIEVE结果：命中文档: ${newDocs.length} 个，累计去重后${merged.length}个`,
    );
    newDocs.forEach((doc, i) => {
      const preview =
        doc.content.length > 120
          ? doc.content.substring(0, 120) + "..."
          : doc.content;
      console.log(
        `  [${i + 1}] score=${Number(doc.score).toFixed(4)} chapter=${doc.chapter_num} index=${doc.index}`,
        preview,
      );
      console.log(`      ${preview}`);
    });
  }
  return {
    documents: merged,
    currentQuery: q,
    nextSubQuestionIndex: index + 1,
    retrievalCount: round,
  };
};

/**
 * 节点 4：检索规划
 * 根据已召回文档与子问题剩余情况，决定继续 retrieve 还是进入 generate
 * 硬性规则：子问题用尽或达到轮数上限时强制 generate
 */
const planNextStepNode = async (state) => {
  console.log("---PLAN_NEXT_STEP_NODE---");
  const subs = state.subQuestions ?? [];
  const nextIndex = state.nextSubQuestionIndex ?? 0;
  const remaining = subs.length - nextIndex;

  const subList = subs
    .map(
      (s, i) =>
        `${i + 1}. ${s}${i < nextIndex ? " （已检索）" : i === nextIndex ? " （下一轮将检索，若选择继续）" : " （未检索）"}`,
    )
    .join("\n");

  const docStr =
    state.documents.length === 0
      ? "（尚无检索结果）"
      : state.documents
          .slice(0, 6)
          .map(
            (d, i) =>
              `[${i + 1}] score=${Number(d.score).toFixed(4)} 第${d.chapter_num}章: ${d.content.slice(0, 200)}${d.content.length > 200 ? "..." : ""}`,
          )
          .join("\n\n");

  const prompt = `你是多跳 RAG 规划器。检索查询已由前置步骤拆解为**有序子问题**；若需继续检索，下一轮将自动使用「下一条子问题」做向量检索，你**不要**自拟新的检索句。

          用户原始问题：${state.question}
          
          子问题序列：
          ${subList || "（无）"}
          
          已检索轮数：${state.retrievalCount}；剩余未检索子问题条数：${remaining}
          最大检索轮数上限：${state.maxRetrievalCount}
          
          已召回文档摘要：
          ${docStr}
          
          请判断下一步：
          1) 已有足够依据回答用户原始问题 → next_step=generate
          2) 仍缺关键事实、且仍存在未检索的子问题、且未超过轮数上限 → next_step=retrieve
          
          硬性规则：
          - 若剩余未检索子问题条数为 0，必须 next_step=generate。
          - 若已检索轮数已达到或超过最大检索轮数，必须 next_step=generate。`;

  const model = llm.withStructuredOutput(NextStepSchema);
  const { next_step: nextStep, reason } = await model.invoke(prompt);

  let finalNext = nextStep;
  if (state.retrievalCount >= state.maxRetrievalCount) finalNext = "generate";
  if (remaining <= 0) finalNext = "generate";

  console.log(
    `[决策] plannedNext=${finalNext} (模型建议=${nextStep}) (${reason})`,
  );

  return {
    plannedNext: finalNext,
  };
};

/** 条件路由：simple 直接回答，complex 进入拆解 */
function afterRoute(state) {
  return state.strategy === "simple" ? "direct_answer" : "decompose_question";
}

/** 条件路由：规划器决定继续检索或生成答案（形成 retrieve ↔ plan 循环） */
function afterPlan(state) {
  return state.plannedNext === "retrieve" ? "retrieve" : "generate";
}

/** 节点 5a：直接回答（simple 路径，不查向量库） */
const directAnswerNode = async (state) => {
  console.log("---DIRECT_ANSWER_NODE---");
  let generation = "";
  const stream = await llm.stream(`
    你是一个中文问答助手，请直接简洁回到问题
    
    问题：${state.question}
  `);

  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    if (!text) continue;
    process.stdout.write(text);
    generation += text;
  }
  process.stdout.write("\n");
  return {
    generation,
  };
};

/**
 * 节点 5b：RAG 生成（complex 路径，多轮检索结束后）
 * 将累积的 documents 拼成 context，基于原文回答用户原始问题
 */
const generateNode = async (state) => {
  console.log("---GENERATE---");
  const context = state.documents
    .map(
      (item, i) => `[片段 ${i + 1}]
    章节: 第 ${item.chapter_num} 章
    内容: ${item.content}`,
    )
    .join("\n\n━━━━━\n\n");
  process.stdout.write("\n【AI 回答（流式）】\n");
  let generation = "";
  const stream =
    await llm.stream(`你是一个专业的《天龙八部》小说助手。基于小说内容回答问题，用准确、详细的语言。
    
    请根据以下《天龙八部》小说片段内容回答问题：
    ${context || "（未检索到相关内容）"}
    
    用户问题: ${state.question}
    
    回答要求：
    1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
    2. 可以综合多个片段的内容，提供完整的答案
    3. 如果片段中没有相关信息，请如实告知用户
    4. 回答要准确，符合小说的情节和人物设定
    5. 可以引用原文内容来支持你的回答
    
    AI 助手的回答:`);
  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    if (!text) continue;
    generation += text;
    process.stdout.write(text);
  }
  process.stdout.write("\n");
  return { generation };
};

/*
 * 构建 LangGraph 状态图（多跳核心：retrieve → plan_next_step 可循环）：
 *
 *   START → route_question ─┬─ simple  → direct_answer → END
 *                           └─ complex → decompose_question → retrieve
 *                                                                  ↓
 *                                                            plan_next_step
 *                                                                  ↓
 *                                              ┌─ retrieve（继续）─┘
 *                                              └─ generate → END
 */
const graph = new StateGraph(GraphState)
  .addNode("route_question", routeQuestionNode)
  .addNode("direct_answer", directAnswerNode)
  .addNode("decompose_question", decomposeQuestionNode)
  .addNode("retrieve", retrieveNode)
  .addNode("plan_next_step", planNextStepNode)
  .addNode("generate", generateNode)
  .addEdge(START, "route_question")
  .addConditionalEdges("route_question", afterRoute, {
    direct_answer: "direct_answer",
    decompose_question: "decompose_question",
  })
  .addEdge("decompose_question", "retrieve")
  .addEdge("retrieve", "plan_next_step")
  .addConditionalEdges("plan_next_step", afterPlan, {
    retrieve: "retrieve",
    generate: "generate",
  })
  .addEdge("direct_answer", END)
  .addEdge("generate", END)
  .compile();

async function main() {
  // 典型多跳问题：需先查「四大恶人老二是谁」，再查「其生父公开身份」
  const question =
    "《天龙八部》中「四大恶人」排行第二的是谁？此人之子在身世揭晓前，其生父在武林中的公开身份是什么？";
  const k = 5;

  // 导出 Mermaid 图，可复制到 https://mermaid.live 可视化
  const drawable = await graph.getGraphAsync();
  console.log(drawable.drawMermaid({ withStyles: true }));

  console.log("连接到 Milvus...");
  // 连接已有集合；字段名需与 Milvus schema 一致
  vectorStore = await Milvus.fromExistingCollection(embeddings, {
    collectionName: "ebook_collection",
    url: "localhost:19530",
    textField: "content",
    primaryField: "id",
    vectorField: "vector",
    indexCreateOptions: {
      metric_type: "COSINE", // 距离度量，必须与建库时一致
      index_type: "HNSW", // 图索引，适合高维向量近似最近邻
      params: { M: 16, efConstruction: 200 },
      search_params: { ef: 64 }, // 查询时搜索宽度，越大越准但越慢
    },
  });
  // 显式覆盖搜索参数，确保查询时使用 COSINE + ef=64
  vectorStore.indexSearchParams = {
    metric_type: "COSINE",
    params: JSON.stringify({ ef: 64 }),
  };
  console.log("✓ 已连接\n");

  // 集合必须先 load 到内存，search 才能执行
  try {
    await vectorStore.client.loadCollection({
      collection_name: "ebook_collection",
    });
    console.log("✓ 集合 ebook_collection 已加载\n");
  } catch (error) {
    if (!error.message.includes("already loaded")) {
      throw error;
    }
    console.log("✓ 集合 ebook_collection 已处于加载状态\n");
  }

  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  const result = await graph.invoke({
    question,
    k: Number.isFinite(k) ? k : 5,
    strategy: "",
    routeReason: "",
    subQuestions: [],
    nextSubQuestionIndex: 0,
    documents: [],
    currentQuery: "",
    retrievalCount: 0,
    maxRetrievalCount: 8,
    plannedNext: "",
    generation: "",
  });

  if (result.strategy === "complex") {
    if (result.subQuestions?.length) {
      console.log("\n【子问题序列】");
      result.subQuestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    }
    console.log("\n【检索相关内容（累计）】");
    if (result.documents.length === 0) {
      console.log("未找到相关内容");
    } else {
      result.documents.forEach((item, i) => {
        console.log(
          `\n[片段 ${i + 1}] 相似度: ${Number(item.score).toFixed(4)}`,
        );
        console.log(`书籍: ${item.book_id}`);
        console.log(`章节: 第 ${item.chapter_num} 章`);
        console.log(`片段索引: ${item.index}`);
        console.log(
          `内容: ${item.content.substring(0, 200)}${item.content.length > 200 ? "..." : ""}`,
        );
      });
    }
    console.log(
      `\n检索轮数: ${result.retrievalCount} / ${result.maxRetrievalCount}`,
    );
  }

  console.log(`\n最终策略: ${result.strategy}`);
  if (!result.generation?.trim()) {
    console.log("模型未返回内容。");
  }
}

main().catch((err) => {
  console.error("运行失败:", err);
  process.exit(1);
});
