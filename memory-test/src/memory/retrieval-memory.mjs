/*
 * @Date: 2026-05-09 15:39:01
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-09 16:01:50
 */
import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { MilvusClient, MetricType } from "@zilliz/milvus2-sdk-node";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const COLLECTION_NAME = "conversations";
const VECTOR_DIM = 1024;

// 初始化 OpenAI Chat 模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 初始化 OpenAI Embeddings 模型
const embeddings = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});
// 初始化 Milvus 客户端
const milvusClient = new MilvusClient({
  address: "localhost:19530",
});

// 获取文本的向量嵌入
async function getEmbeddings(text) {
  return await embeddings.embedQuery(text);
}

// 从 Milvus 中检索相关对话
async function retrieveRelevantConversations(query, k = 2) {
  try {
    const queryVector = await getEmbeddings(query);
    const result = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "round", "timestamp"],
    });
    return result.results;
  } catch (error) {
    console.error("检索对话出错：", error.message);
    return [];
  }
}

/**
 * 策略3: 检索（Retrieval）
 * 使用 Milvus 向量数据库存储历史对话，根据当前输入检索语义相关的历史
 * 实现 RAG（Retrieval-Augmented Generation）流程
 */
async function main() {
  try {
    console.log("连接到Milvus...");
    await milvusClient.connectPromise;
    console.log("✓ 已连接\n");
  } catch (error) {
    console.error("连接到Milvus出错：", error.message);
    console.error("请检查Milvus是否已启动");
    return;
  }

  //   创建历史消息存储器
  const history = new InMemoryChatMessageHistory();

  const conversations = [
    { input: "我之前提到的机器学习项目进展如何？" },
    { input: "我周末经常做什么？" },
    { input: "我的职业是什么？" },
  ];

  for (let index = 0; index < conversations.length; index++) {
    const { input } = conversations[index];
    const userMessage = new HumanMessage(input);
    console.log(`\n[第${index + 1}轮对话] 用户：${input}`);

    // 1. 检索相关对话
    const relevantConversations = await retrieveRelevantConversations(input, 2);

    let relevantHistory = "";
    if (relevantConversations.length > 0) {
      relevantConversations.forEach((conv, idx) => {
        console.log(`\n[历史对话 ${idx + 1}] 相似度: ${conv.score.toFixed(4)}`);
        console.log(`轮次: ${conv.round}`);
        console.log(`内容: ${conv.content}`);
      });

      // 构建上下文
      relevantHistory = relevantConversations
        .map((conv, idx) => {
          return `[历史对话 ${idx + 1}]
        轮次: ${conv.round}
        ${conv.content}`;
        })
        .join("\n\n━━━━━\n\n");
    } else {
      console.log("没有找到相关对话");
    }
    // 2. 构建prompt
    const contextMessages = relevantHistory
      ? [
          new HumanMessage(
            `相关历史对话：\n${relevantHistory}\n\n用户问题: ${input}`,
          ),
        ]
      : [userMessage];

    //   3. 使用模型回答问题
    const response = await model.invoke(contextMessages);

    // 保存当前对话到历史消息
    await history.addMessage(userMessage);
    await history.addMessage(response);

    // 4.将对话保存到 Milvus 向量数据库
    const conversationText = `用户: ${input}\n助手: ${response.content}`;
    const convId = `conv_${Date.now()}_${index + 1}`;
    const convVector = await getEmbeddings(conversationText);
    try {
      await milvusClient.insert({
        collection_name: COLLECTION_NAME,
        data: [
          {
            id: convId,
            vector: convVector,
            content: conversationText,
            round: index + 1,
            timestamp: new Date().toISOString(),
          },
        ],
      });
      console.log(`✓ 已经保存到 Milvus 向量数据库`);
    } catch (error) {
      console.error("保存对话到 Milvus 出错：", error.message);
    }
    console.log(`助手：${response.content}`);
  }
}

main().catch(console.error);
