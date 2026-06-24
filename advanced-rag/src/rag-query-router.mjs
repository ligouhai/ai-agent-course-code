/*
 * Query Router RAG — 带路由的检索增强生成
 *
 * 流程：用户问题 → LLM 判断是否需要检索 →
 *   simple  → 直接由 LLM 回答（跳过向量库）
 *   complex → Milvus 检索相关片段 → 基于片段生成回答
 *
 * 技术栈：LangGraph（状态图编排）+ Milvus（向量检索）+ OpenAI 兼容 API
 */

import { Milvus } from "@langchain/community/vectorstores/milvus";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";
import { z } from "zod";

// 对话模型：temperature=0 保证路由判断和回答的稳定性
const llm = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 嵌入模型：将问题转为向量，用于 Milvus 相似度检索
// dimensions 必须与建库时向量维度一致（此处 1024）
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: 1024,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  apiKey: process.env.OPENAI_API_KEY,
});

// 路由器的结构化输出约束：LLM 必须返回 strategy + reason
const RouteSchema = z.object({
  strategy: z.enum(["simple", "complex"]),
  reason: z.string(),
});

// LangGraph 共享状态：各节点读取/写入这些字段，在图中流转
const GraphState = Annotation.Root({
  question: Annotation, // 用户问题
  k: Annotation, // 检索返回的 top-k 文档数
  strategy: Annotation, // 路由结果：simple | complex
  routeReason: Annotation, // 路由理由（便于调试）
  documents: Annotation, // 检索到的文档列表
  generation: Annotation, // 最终生成的回答
});

// 向量库实例在 main() 中初始化，供检索函数使用
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
 * 节点 1：问题路由
 * 用 withStructuredOutput 强制 LLM 输出 JSON，避免自由文本解析失败
 */
const routeQuestionNode = async (state) => {
  console.log("---ROUTE_QUESTION---");
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
    question: state.question,
    k: state.k,
    strategy: route.strategy,
    routeReason: route.reason,
  };
};

/** 节点 2：向量检索（仅 complex 路径会进入） */
const retrieveNode = async (state) => {
  console.log("---RETRIEVE_NODE---");
  const documents = await retrieveRelevantContent(state.question, state.k);
  if (documents.length === 0) {
    console.log("RETRIEVE结果：未命中文档");
  } else {
    console.log(`RETRIEVE结果：命中文档: ${documents.length} 个`);
    documents.forEach((item, i) => {
      const preview =
        item.content.length > 120
          ? item.content.substring(0, 120) + "..."
          : item.content;
      console.log(
        `[R${i + 1}] score=${Number(item.score).toFixed(4)} chapter=${item.chapter_num} index=${item.index}`,
      );
      console.log(`      ${preview}`);
    });
  }
  return {
    question: state.question,
    k: state.k,
    strategy: state.strategy,
    routeReason: state.routeReason,
    documents,
  };
};

/**
 * 节点 3a：直接回答（simple 路径）
 * 不查向量库，由 LLM 凭自身知识回答，节省检索开销
 */
const directAnswerNode = async (state) => {
  console.log("---DIRECT_ANSWER_NODE---");
  process.stdout.write("\n 【AI 回答（流式）】\n");
  let generation = "";
  const stream = await llm.stream(`你是一个中文问答助手，请直接简洁回答问题。
    问题：${state.question}
    `);
  for await (const chunk of stream) {
    const text =
      typeof chunk.content === "string"
        ? chunk.content
        : JSON.stringify(chunk.content);
    if (!text) continue;
    generation += text;
    process.stdout.write(text);
  }

  process.stdout.write("\n");
  return {
    question: state.question,
    k: state.k,
    strategy: state.strategy,
    routeReason: state.routeReason,
    documents: [],
    generation: generation,
  };
};

/**
 * 节点 3b：RAG 生成（complex 路径，检索之后执行）
 * 将检索到的片段拼成 context，注入 prompt 让 LLM 基于原文回答
 */
const ragGenerateNode = async (state) => {
  console.log("---RAG_GENERATE_NODE---");
  const context = state.documents
    .map(
      (item, i) => `[片段${i + 1}]
章节：第${item.chapter_num}章
内容：${item.content}
`,
    )
    .join("\n\n━━━━━\n\n");
  process.stdout.write("\n 【AI 回答（流式）】\n");
  let generation = "";
  const stream =
    await llm.stream(`你是一个专业的《天龙八部》小说阅读助手。基于以下小说片段内容回答问题，用准确、详细的语言。
请根据以下《天龙八部》小说片段内容回答问题：
${context || "（未检索到相关内容）"}

用户问题: ${state.question}

回答要求：
1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容，提供完整的答案
3. 如果片段中没有相关信息，请如实告知用户
4. 回答要准确，符合小说的情节和人物设定
5. 可以引用原文内容来支持你的回答

AI助手回答：`);
  for await (const chunk of stream) {
    const text =
      typeof chunk.content === "string"
        ? chunk.content
        : JSON.stringify(chunk.content);
    if (!text) continue;
    generation += text;
    process.stdout.write(text);
  }

  process.stdout.write("\n");
  return {
    question: state.question,
    k: state.k,
    strategy: state.strategy,
    routeReason: state.routeReason,
    documents: state.documents,
    generation: generation,
  };
};

/** 条件路由函数：根据 strategy 决定走哪条分支 */
function decideNext(state) {
  return state.strategy === "simple" ? "direct_answer" : "retrieve";
}

/*
 * 构建 LangGraph 状态图：
 *
 *   START → route_question ─┬─ simple  → direct_answer → END
 *                           └─ complex → retrieve → rag_generate → END
 */
const graph = new StateGraph(GraphState)
  .addNode("route_question", routeQuestionNode)
  .addNode("retrieve", retrieveNode)
  .addNode("direct_answer", directAnswerNode)
  .addNode("rag_generate", ragGenerateNode)
  .addEdge(START, "route_question")
  .addConditionalEdges("route_question", decideNext, {
    direct_answer: "direct_answer",
    retrieve: "retrieve",
  })
  .addEdge("retrieve", "rag_generate")
  .addEdge("direct_answer", END)
  .addEdge("rag_generate", END)
  .compile();

async function main() {
  const question = "段誉遇到的第一个神仙姐姐画像，是谁的弟子";
  const k = 5;

  // 导出为 Mermaid：可复制到 https://mermaid.live 或 Markdown 的 ```mermaid 代码块
  const drawable = await graph.getGraphAsync();
  const mermaid = drawable.drawMermaid({ withStyles: true });
  console.log(mermaid);

  console.log("连接到 Milvus...");
  // 连接已有集合（非新建）；字段名需与 Milvus schema 一致
  vectorStore = await Milvus.fromExistingCollection(embeddings, {
    collectionName: "ebook_collection",
    url: process.env.MILVUS_URL,
    textField: "book_content", // 存储原文的字段
    vectorField: "vector", // 存储 embedding 的字段
    primaryKeyField: "id",
    indexCreateOptions: {
      index_type: "HNSW", // 索引算法（图索引，适合高维向量）
      metric_type: "COSINE", // 距离度量，必须与建库时一致
      params: {
        M: 16, // HNSW 每层最大连接数
        efConstruction: 200, // 建索引时的搜索宽度
      },
      search_params: {
        ef: 64, // 查询时的搜索宽度，越大越准但越慢
      },
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
    console.log(`✓ 集合 ebook_collection 已加载\n`);
  } catch (error) {
    if (!error.message.includes("already loaded")) {
      throw error;
    }
    console.log(`✓ 集合 ebook_collection 已处于加载状态\n`);
  }

  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  const result = await graph.invoke({
    question,
    k: Number.isFinite(k) ? k : 5,
    strategy: "",
    routeReason: "",
    documents: [],
    generation: "",
  });

  if (result.strategy === "complex") {
    console.log("\n【检索相关内容】");
    if (result.documents.length === 0) {
      console.log("未找到相关内容");
    } else {
      result.documents.forEach((item, i) => {
        console.log(`\n[片段 ${i + 1}] 相似度: ${item.score.toFixed(4)}`);
        console.log(`书籍: ${item.book_id}`);
        console.log(`章节: 第 ${item.chapter_num} 章`);
        console.log(`片段索引: ${item.index}`);
        console.log(
          `内容: ${item.content.substring(0, 200)}${item.content.length > 200 ? "..." : ""}`,
        );
      });
    }
  }

  console.log(`\n最终策略: ${result.strategy}`);
  if (!result.generation?.trim()) {
    console.log("模型未返回内容。");
  }
}

main();
