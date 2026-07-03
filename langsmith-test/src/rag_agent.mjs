/*
 * @Date: 2026-07-01 16:39:24
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-01 17:38:52
 */
import { Milvus } from "@langchain/community/vectorstores/milvus";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME ?? "text-embedding-v3",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME ?? "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const vectorStore = await Milvus.fromExistingCollection(embeddings, {
  collectionName: process.env.MILVUS_COLLECTION_NAME ?? "rag_docs",
  url: process.env.MILVUS_ADDRESS ?? "http://localhost:19530",
  primaryField: "langchain_primary_id",
});

const retriever = vectorStore.asRetriever({ k: 4 });

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是客服助手。仅根据下面 [上下文] 回答问题；上下文没有的信息请明确说不知道，不要编造。\n\n 上下文：\n{context}",
  ],
  ["human", "{question}"],
]);

const chain = RunnableSequence.from([
  prompt,
  llm,
  new StringOutputParser(),
]);

const GraphState = Annotation.Root({
  question: Annotation,
  context: Annotation,
  answer: Annotation,
});

async function retrieve(state) {
  const docs = await retriever.invoke(state.question);
  return {
    context: docs,
  };
}

async function generate(state) {
  const contentText = state.context
    .map((doc) => `[${doc.metadata.source}] ${doc.pageContent}`)
    .join("\n\n");
  const answer = await chain.invoke({
    question: state.question,
    context: contentText,
  });
  return {
    answer,
  };
}

const workflow = new StateGraph(GraphState)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge(START, "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", END);

const ragApp = workflow.compile();

export async function ask(question) {
  const result = await ragApp.invoke({
    question,
  });
  return {
    answer: result.answer,
    context: result.context ?? [],
  };
}
