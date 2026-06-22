/*
 * @Date: 2026-06-22 11:33:40
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-22 14:13:42
 */
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { createAgent } from "langchain";
import { z } from "zod";
import { lookupCityTrivia, lookupWeather } from "./simple-mock.mjs";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const lookupWeatherTool = tool(async ({ city }) => lookupWeather(city), {
  name: "lookup_weather",
  description: "查询某城市当日天气概况（气温区间、天气、空气质量等）",
  schema: z.object({
    city: z.string().describe("城市名，如 杭州"),
  }),
});

const lookupCityTriviaTool = tool(async ({ city }) => lookupCityTrivia(city), {
  name: "lookup_city_trivia",
  description: "查询某城市相关的依据趣味知识",
  schema: z.object({
    city: z.string().describe("城市名，如 杭州"),
  }),
});

// 子代理 A：只回答【天气】类问题
const agentA = createAgent({
  name: "weather_agent",
  model,
  description: "专门查天气",
  tools: [lookupWeatherTool],
  prompt: new SystemMessage(
    "你只处理天气。用户提到城市时，用 lookup_weather 查询后再用中文简短说明。",
  ),
});

// 子代理 B：只回答【城市趣味知识】类问题
const agentB = createAgent({
  name: "trivia_agent",
  model,
  description: "专门讲与城市相关的小知识；必须调用 lookup_city_trivia。",
  tools: [lookupCityTriviaTool],
  systemPrompt: `
    你只讲城市小知识。先 lookup_city_trivia，再用人话转述，不要编造工具里没有的内容
  `,
});

// 主代理：根据问题类型选择子代理
const workflow = createSupervisor({
  llm: model,
  agents: [agentA.graph, agentB.graph],
  systemPrompt: `你是调度员，只负责选人，不要自己报气温、也不要自己讲城市百科。

- 问天气、气温、下不下雨、空气 → 用 weather_agent
- 问小知识、名胜、历史、一句介绍 → 用 trivia_agent`,
});

const app = workflow.compile();

const drawable = await app.getGraphAsync();
console.log(drawable.drawMermaid({ withStyles: true }));

const input = {
  messages: [new HumanMessage("查下北京的天气，再讲一条和北京有关的小知识")],
};

const nodePath = [];
let finalState = null;

const stream = await app.stream(input, { streamMode: ["updates", "values"] });

for await (const chunk of stream) {
  const [mode, payload] = chunk;
  if (mode === "updates" && payload && typeof payload === "object") {
    nodePath.push(...Object.keys(payload));
  } else if (mode === "values") {
    finalState = payload;
  }
}

console.log("路径:", nodePath.join(" -> "));
const last = finalState?.messages?.at(-1);
console.log("最终状态:", last?.content ?? finalState?.messages);
