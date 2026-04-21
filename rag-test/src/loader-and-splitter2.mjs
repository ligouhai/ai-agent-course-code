/*
 * @Date: 2026-04-20 14:41:21
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-20 14:51:37
 */
import "dotenv/config";
import "cheerio";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const embeddings = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7233327509919547452",
  {
    selector: ".main-area p",
  },
);

const documents = await cheerioLoader.load();

console.assert(documents.length === 1);
console.log(`Total characters: ${documents[0].pageContent.length}`);

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ["。", "！", "？"],
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(`文档分割完成，共${splitDocuments.length}个分块\n`);

console.log("正在创建向量存储...");
const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocuments,
  embeddings,
);

console.log("向量存储创建完成");

const retriever = vectorStore.asRetriever({ k: 2 });

const questions = ["父亲的趋势对作者的人生态度产生了怎样的根本性逆转？"];

for (const question of questions) {
  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  const retrievedDocuments = await retriever.invoke(question);

  const scoreResults = await vectorStore.similaritySearchWithScore(question, 2);

  console.log("\n【检索到的文档】");
  retrievedDocuments.forEach((doc, index) => {
    // 找到对应的评分
    const scoredResult = scoreResults.find(
      ([scoredDoc]) => scoredDoc.pageContent === doc.pageContent,
    );
    const score = scoredResult ? scoredResult[1] : null;
    const similarity = score !== null ? (1 - score).toFixed(4) : "N/A";

    console.log(`文档${index + 1} 相似度: ${similarity}`);
    console.log("内容:" + doc.pageContent);
    if (doc.metadata && Object.keys(doc.metadata).length > 0) {
      console.log("元数据:", doc.metadata);
    }
  });

  const context = retrievedDocuments
    .map((doc, index) => `[片段${index + 1}]\n${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

  const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答：

  文章内容：
  ${context}
  
  问题: ${question}
  
  你的回答:`;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");
}
