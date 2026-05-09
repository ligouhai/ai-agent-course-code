/*
 * @Date: 2026-05-09 14:22:12
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-09 14:56:57
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  getBufferString,
} from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// ========== 总结策略演示 ==========
async function summarizeMemoryDemo() {
  const history = new InMemoryChatMessageHistory();
  const maxMessages = 6; // 超过6条消息时触发总结
  const messages = [
    { type: "human", content: "我想学做红烧肉，你能教我吗？" },
    {
      type: "ai",
      content:
        "当然可以！红烧肉是一道经典的中式菜肴。首先需要准备五花肉、冰糖、生抽、老抽、料酒等材料。",
    },
    { type: "human", content: "五花肉需要切多大块？" },
    {
      type: "ai",
      content:
        "建议切成3-4厘米见方的块，这样既容易入味，口感也更好。切好后可以用开水焯一下去除血沫。",
    },
    { type: "human", content: "炒糖色的时候有什么技巧吗？" },
    {
      type: "ai",
      content:
        "炒糖色是关键步骤。用小火慢慢炒，等冰糖完全融化变成焦糖色，冒小泡时就可以下肉了。注意不要炒过头，否则会发苦。",
    },
    { type: "human", content: "需要炖多长时间？" },
    {
      type: "ai",
      content:
        "一般需要炖40-60分钟，用小火慢炖，直到肉变得软糯入味。可以用筷子戳一下，能轻松戳透就说明好了。",
    },
    { type: "human", content: "最后收汁的时候要注意什么？" },
    {
      type: "ai",
      content:
        "收汁时要用大火，不断翻动，让汤汁均匀包裹在肉块上。看到汤汁变得浓稠，颜色红亮就可以出锅了。",
    },
  ];
  for (const message of messages) {
    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    } else {
      await history.addMessage(new AIMessage(message.content));
    }
  }

  let allMessages = await history.getMessages();
  console.log("原始消息数量：", allMessages.length);
  console.log(
    "原始消息：",
    allMessages
      .map((message) => `${message.constructor.name}: ${message.content}`)
      .join("\n  "),
  );

  if (allMessages.length > maxMessages) {
    const keepRecent = 2; // 保留最近2条消息

    // 分离要保留和要总结的消息
    const toKeep = allMessages.slice(-keepRecent);
    const toSummarize = allMessages.slice(0, -keepRecent);
    console.log("\n💡 历史消息过多，开始总结...");
    console.log(`📝 将被总结的消息数量: ${toSummarize.length}`);
    console.log(`📝 将被保留的消息数量: ${toKeep.length}`);

    // 总结将被丢弃的消息
    const summary = await summarizeHistory(toSummarize);

    // 清空历史消息，只保留最近的消息
    await history.clear();
    for (const message of toKeep) {
      await history.addMessage(message);
    }

    console.log(`\n保留消息数量: ${toKeep.length}`);
    console.log(
      "保留消息：",
      toKeep
        .map((message) => `${message.constructor.name}: ${message.content}`)
        .join("\n  "),
    );
    console.log(`\n总结内容 （不包含保留的消息）：${summary}`);
  } else {
    console.log("\n消息数量未超过阈值，无需总结");
  }
}

summarizeMemoryDemo().catch(console.error);

// 总结历史对话函数
async function summarizeHistory(messages) {
  if (messages.length === 0) return "";

  const conversationText = getBufferString(messages, {
    humanPrefix: "用户",
    aiPrefix: "助手",
  });

  const summaryPrompt = `请总结一下对话的核心内容，保留重要信息：
  
  ${conversationText}

  总结：`;

  const summaryResponse = await model.invoke([
    new SystemMessage(summaryPrompt),
  ]);
  return summaryResponse.content;
}
