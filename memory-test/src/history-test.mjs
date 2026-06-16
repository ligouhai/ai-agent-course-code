/*
 * @Date: 2026-05-08 11:01:13
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-08 18:33:21
 */
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

async function inMemoryDemo() {
  const history = new InMemoryChatMessageHistory();

  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。",
  );

  // 第一轮对话
  console.log("第一轮对话");
  const userMessage1 = new HumanMessage("你今天吃的什么？");
  await history.addMessage(userMessage1);
  const message1 = [systemMessage, ...(await history.getMessages())];
  const response1 = await model.invoke(message1);
  await history.addMessage(response1);
  console.log(`用户：${userMessage1.content}`);
  console.log(`助手：${response1.content}\n`);

  // 第二轮对话
  console.log("第二轮对话 - 基于历史对话的上下文");
  const userMessage2 = new HumanMessage("好吃吗？");
  await history.addMessage(userMessage2);

  const message2 = [systemMessage, ...(await history.getMessages())];
  const response2 = await model.invoke(message2);
  await history.addMessage(response2);
  console.log(`用户：${userMessage2.content}`);
  console.log(`助手：${response2.content}\n`);

  //   展示所有的历史消息
  console.log("所有的历史消息：");
  const allMessages = await history.getMessages();
  console.log(`共保存了${allMessages.length}条消息`);
  allMessages.forEach((message, index) => {
    const type = message.type === "human" ? "用户" : "助手";
    console.log(
      `${index + 1}. ${type}: ${message.content.substring(0, 50)}...`,
    );
  });
  console.log("\n");
}

inMemoryDemo().catch(console.error);
