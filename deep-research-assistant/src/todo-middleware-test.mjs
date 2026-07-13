/*
 * @Date: 2026-07-13 11:44:00
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-13 11:52:49
 */
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { HumanMessage, createAgent, todoListMiddleware } from "langchain";

const model = new ChatOpenAI({
  temperature: 0,
  model: process.env.MODEL_NAME,

  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});
const agent = createAgent({
  model: model,
  tools: [],
  systemPrompt:
    "你是生活规划助手。收到需要多步完成的请求时，先用 write_todos 列出中文执行步骤，然后简要说明你的计划。",
  middleware: [todoListMiddleware()],
});

const query =
  "我下周末想带爸妈去杭州玩两天，帮我规划一下：交通怎么选、住哪里方便、必去经典和吃什么，预算控制在人均 1500 左右。";

const result = await agent.invoke({
  messages: [new HumanMessage(query)],
});

console.log("todos:", JSON.stringify(result.todos, null, 2));
console.log("-".repeat(80));
console.log("回复:", result.messages.at(-1)?.content);
