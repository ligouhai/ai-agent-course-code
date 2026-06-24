/*
 * @Date: 2026-06-22 15:09:01
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-23 10:30:06
 */
import { Milvus } from "@langchain/community/vectorstores/milvus";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";

const COLLECTION_NAME = "ebook_collection";
const TOP_K = 5;

const GraphState = Annotation.Root({
  question: Annotation,
  k: Annotation,
  documents: Annotation,
  generation: Annotation,
});

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: 1024,
});

const RouteSchema = z.object({
  strategy: z.enum(["simple", "complex"]),
  reason: z.string(),
});

let vectorStore;

async function retrieveRelevantDocuments(question, k = TOP_K) {
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
    console.error("检索相关文档出错：", error.message);
    return [];
  }
}

const retrieveNode = async (state) => {
  const { question, k } = state;
  const documents = await retrieveRelevantDocuments(question, k);
  return {
    question,
    k,
    documents,
  };
};

const generateAnswerNode = async (state) => {
  const context = state.documents
    .map(
      (item, i) => `[片段 ${i + 1}]
    章节: 第 ${item.chapter_num} 章
    内容: ${item.content}`,
    )
    .join("\n\n━━━━━\n\n");

  const prompt = `你是一个专业的《天龙八部》小说助手。基于小说内容回答问题，用准确、详细的语言。

    请根据以下《天龙八部》小说片段内容回答问题：
    ${context}
    
    用户问题: ${state.question}
    
    回答要求：
    1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
    2. 可以综合多个片段的内容，提供完整的答案
    3. 如果片段中没有相关信息，请如实告知用户
    4. 回答要准确，符合小说的情节和人物设定
    5. 可以引用原文内容来支持你的回答
    
    AI 助手的回答:`;

  process.stdout.write("\n【AI 回答（流式）】\n");
  let generatedAnswer = "";
  const stream = await model.stream(prompt);
  for await (const chunk of stream) {
    const text = typeof chunk.content === "string" ? chunk.content : "";
    generatedAnswer += text;
    process.stdout.write(text);
  }
  process.stdout.write("\n");
  return {
    question: state.question,
    k: state.k,
    documents: state.documents,
    generation: generatedAnswer,
  };
};

const graph = new StateGraph(GraphState)
  .addNode("retrieve", retrieveNode)
  .addNode("generateAnswer", generateAnswerNode)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "generateAnswer")
  .addEdge("generateAnswer", END)
  .compile();

async function main() {
  const question = "阿朱的结局是什么？";
  const kArg = 5;

  // 导出为 Mermaid：可复制到 https://mermaid.live 或 Markdown的 ``` Mermaid 代码块

  const drawable = await graph.getGraphAsync();
  const mermaid = drawable.drawMermaid({ withStyle: true });
  console.log(mermaid);

  console.log("连接到Milvus...");
  vectorStore = await Milvus.fromExistingCollection(embeddings, {
    collectionName: COLLECTION_NAME,
    url: process.env.MILVUS_URL,
    textField: "book_content",
    primaryField: "id",
    vectorField: "vector",
    indexCreateOptions: {
      index_type: "HNSW",
      metric_type: "COSINE",
      params: {
        M: 16,
        efConstruction: 200,
      },
      search_params: {
        ef: 64,
      },
    },
  });

  vectorStore.indexSearchParams = {
    metric_type: "COSINE",
    params: JSON.stringify({ ef: 64 }),
  };
  console.log("✓ 已连接\n");

  try {
    await vectorStore.client.loadCollection({
      collection_name: COLLECTION_NAME,
    });
    console.log(`✓ 集合 ${COLLECTION_NAME} 已加载\n`);
  } catch (error) {
    if (!error.message.includes("already loaded")) {
      throw error;
    }
    console.log(`✓ 集合 ${COLLECTION_NAME} 已处于加载状态\n`);
  }

  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  const result = await graph.invoke({
    question,
    k: Number.isFinite(kArg) ? kArg : TOP_K,
    documents: [],
    generation: "",
  });

  console.log("\n【检索相关内容】");
  if (result.documents.length === 0) {
    console.log("未找到相关内容");
    console.log("\n【AI 回答】");
    console.log("抱歉，我没有找到相关的《天龙八部》内容。");
    return;
  } else {
    result.documents.forEach((item, i) => {
      console.log(`\n[片段 ${i + 1}] 相似度: ${item.score.toFixed(4)}`);
      console.log(`书籍: ${item.book_id}`);
      console.log(`章节: 第 ${item.chapter_num} 章`);
      console.log(`片段索引: ${item.index}`);
      console.log(
        `内容: ${item.content.substring(0, 200)}${item.content.length > 200 ? "..." : ""}`,
      );
    });
  }

  if (!result.generation) {
    console.log("\n【AI 回答】");
    console.log("模型未返回内容。");
  }
}

main();
