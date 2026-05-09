/*
 * @Date: 2026-05-09 15:28:47
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-09 15:32:13
 */
import "dotenv/config";
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";
import { OpenAIEmbeddings } from "@langchain/openai";

const COLLECTION_NAME = "conversations";
const VECTOR_DIMENSION = 1024;

const embeddings = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIMENSION,
});

const milvusClient = new MilvusClient({
  address: "localhost:19530",
});

async function getEmbeddings(text) {
  return await embeddings.embedQuery(text);
}

async function main() {
  try {
    console.log("Connecting to Milvus...");
    await milvusClient.connectPromise;
    console.log("✓ Connected");

    // 创建集合
    console.log("Creating collection...");
    await milvusClient.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 50,
          is_primary_key: true,
        },
        {
          name: "vector",
          data_type: DataType.FloatVector,
          dim: VECTOR_DIMENSION,
        },
        { name: "content", data_type: DataType.VarChar, max_length: 5000 },
        { name: "round", data_type: DataType.Int64 },
        { name: "timestamp", data_type: DataType.VarChar, max_length: 100 },
      ],
    });
    console.log("✓ Collection created");

    // 创建索引
    console.log("Creating index...");
    await milvusClient.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
    });
    console.log("✓ Index created");

    // 加载集合

    console.log("Loading collection...");
    await milvusClient.loadCollection({
      collection_name: COLLECTION_NAME,
    });
    console.log("✓ Collection loaded"); // 插入对话数据

    console.log("\n插入对话数据...");
    const conversations = [
      {
        id: "conv_001",
        content:
          "用户: 我叫赵六，是一名数据科学家\n助手: 很高兴认识你，赵六！数据科学是一个很有趣的领域。",
        round: 1,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_002",
        content:
          "用户: 我最近在研究机器学习算法\n助手: 机器学习确实很有意思，你在研究哪些算法呢？",
        round: 2,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_003",
        content:
          "用户: 我喜欢打篮球和看电影\n助手: 运动和文化娱乐都是很好的爱好！",
        round: 3,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_004",
        content: "用户: 我周末经常去电影院\n助手: 看电影是很好的放松方式。",
        round: 4,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_005",
        content:
          "用户: 我的职业是软件工程师\n助手: 软件工程师是个很有前景的职业！",
        round: 5,
        timestamp: new Date().toISOString(),
      },
    ];
    console.log("生成向量签署...");

    const conversationData = await Promise.all(
      conversations.map(async (conversation) => {
        const vector = await getEmbeddings(conversation.content);
        return {
          ...conversation,
          vector: vector,
        };
      }),
    );
    const insertResult = await milvusClient.insert({
      collection_name: COLLECTION_NAME,
      data: conversationData,
    });
    console.log(`✓ Inserted ${insertResult.insert_cnt} records\n`);

    console.log("=".repeat(60));
    console.log("说明：已成功将对话数据插入到 Milvus 向量数据库");
    console.log("这些对话数据将用于后续的 RAG 检索");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
