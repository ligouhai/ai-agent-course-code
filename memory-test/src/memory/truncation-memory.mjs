/*
 * @Date: 2026-05-08 11:39:52
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-08 12:07:08
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  trimMessages,
} from "@langchain/core/messages";
import { getEncoding } from "js-tiktoken";

// 1.按消息数量截断
async function messageCountTruncation() {
  const history = new InMemoryChatMessageHistory();
  const maxMessages = 4;
  const messages = [
    { type: "human", content: "我叫张三" },
    { type: "ai", content: "你好张三，很高兴认识你！" },
    { type: "human", content: "我今年25岁" },
    { type: "ai", content: "25岁正是青春年华，有什么我可以帮助你的吗？" },
    { type: "human", content: "我喜欢编程" },
    { type: "ai", content: "编程很有趣！你主要用什么语言？" },
    { type: "human", content: "我住在北京" },
    { type: "ai", content: "北京是个很棒的城市！" },
    { type: "human", content: "我的职业是软件工程师" },
    { type: "ai", content: "软件工程师是个很有前景的职业！" },
  ];
  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }
  let allMessages = await history.getMessages();
  //   按消息数量截断：保留最近maxMessages条消息
  const trimmedMessages = allMessages.slice(-maxMessages);
  console.log("截断后的消息数量：", trimmedMessages.length);
  console.log("截断后的消息：", trimmedMessages);
}

// 计算消息数组的总 token 数量
function countTokens(messages, encoder) {
  let total = 0;
  for (const message of messages) {
    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    total += encoder.encode(content).length;
  }
  return total;
}

// 2.按消息总 token 数量截断
async function tokenCountTruncation() {
  const history = new InMemoryChatMessageHistory();
  const maxTokens = 100;
  const encoder = getEncoding("cl100k_base");

  const messages = [
    { type: "human", content: "我叫李四" },
    { type: "ai", content: "你好李四，很高兴认识你！" },
    { type: "human", content: "我是一名设计师" },
    {
      type: "ai",
      content: "设计师是个很有创造力的职业！你主要做什么类型的设计？",
    },
    { type: "human", content: "我喜欢艺术和音乐" },
    { type: "ai", content: "艺术和音乐都是很好的爱好，它们能激发创作灵感。" },
    { type: "human", content: "我擅长 UI/UX 设计" },
    { type: "ai", content: "UI/UX 设计非常重要，好的用户体验能让产品更成功！" },
  ];

  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }
  let allMessages = await history.getMessages();

  //   使用 trimMessages API: 使用js-tiktoken计算消息总 token 数量
  const truncatedMessages = await trimMessages(allMessages, {
    maxTokens,
    tokenCounter: (messages) => countTokens(messages, encoder),
    strategy: "last", // 保留最后一条消息
  });

  //   计算试剂 token 数用于显示
  const totalTokens = countTokens(truncatedMessages, encoder);
  console.log(`总 token 数：${totalTokens / maxTokens}`);
  console.log("截断后的消息数量：", truncatedMessages.length);
  console.log(
    "截断后的消息：",
    truncatedMessages
      .map((message) => {
        const content =
          typeof message.content === "string"
            ? message.content
            : JSON.stringify(message.content);
        const tokenLength = encoder.encode(content).length;
        return `${message.constructor.name}(${tokenLength} tokens): ${content}`;
      })
      .join("\n"),
  );
}

async function runAll() {
  await messageCountTruncation();
  await tokenCountTruncation();
}

runAll().catch(console.error);
