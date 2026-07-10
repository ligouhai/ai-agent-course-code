/*
 * @Date: 2026-07-03 16:41:13
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-07 09:48:57
 */
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import {
  AIMessage,
  HumanMessage,
  createAgent,
  createMiddleware,
} from "langchain";
import { z } from "zod";
// 自定义 Middleware

const loggingMiddleware = createMiddleware({
  name: "loggingMiddleware",
  description: "日志记录中间件",
  stateSchema: z.object({
    modelCallCount: z.number().default(0),
  }),
  beforeAgent: (state) => {
    console.log("\n[Logging] agent开始，消息数：", state.messages.length);
  },
  afterAgent: (state) => {
    console.log(
      `[Logging] agent结束，累计模型调用：${state.modelCallCount}次\n`,
    );
  },
  beforeModel: (state) => {
    console.log(
      `[Logging] 即将调用模型，当前消息数：${state.messages.length},累计模型调用：${state.modelCallCount}次`,
    );
  },
  afterModel: (state) => {
    const last = state.messages.at(-1);
    const preview =
      typeof last?.content === "string"
        ? last.content.slice(0, 80)
        : JSON.stringify(last?.content)?.slice(0, 80);

    console.log(`[Logging] 模型返回：${preview}...`);

    return {
      modelCallCount: state.modelCallCount + 1,
    };
  },
});

// 在每次调用前追加 system 上下文
const addContextMiddleware = createMiddleware({
  name: "addContextMiddleware",
  description: "在每次调用前追加 system 上下文",
  wrapModelCall: async (request, handler) => {
    console.log("[AddContext] 注入额外 system 上下文");

    return handler({
      ...request,
      systemMessage: request.systemMessage.concat("\n\n 请用一句话简单回答"),
    });
  },
});

// 拦截器敏感词，直接结束 agent

const blockedContentMiddleware = createMiddleware({
  name: "blockedContentMiddleware",
  description: "拦截器敏感词，直接结束 agent",
  beforeModel: {
    canJumpTo: ["end"],
    hook: (state) => {
      const last = state.messages.at(-1);
      const text =
        typeof last?.content === "string"
          ? last.content
          : JSON.stringify(last?.content ?? "");
      if (text.includes("BLOCKED")) {
        return {
          messages: [new AIMessage("该请求已被 middleware 拦截，无法处理。")],
          jumpTo: "end",
        };
      }
    },
  },
});

// Agent
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const agent = createAgent({
  model,
  tools: [],
  systemPrompt: "你是一个助手",
  middleware: [
    loggingMiddleware,
    addContextMiddleware,
    blockedContentMiddleware,
  ],
});

for (const text of [
  "请用中文说：middleware 是什么",
  "这句话包含 BLOCKED 关键词",
]) {
  console.log("\n用户：", text);
  const { messages, modelCallCount } = await agent.invoke({
    messages: [new HumanMessage(text)],
  });
  console.log("回复：", messages.at(-1)?.content);
  console.log("累计模型调用次数：", modelCallCount);
}
