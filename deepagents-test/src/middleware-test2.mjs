/*
 * @Date: 2026-07-07 10:04:39
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-07 10:19:16
 */
import { Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import {
  HumanMessage,
  ToolMessage,
  createAgent,
  createMiddleware,
  tool,
} from "langchain";
import { z } from "zod";

const getCurrentTime = tool(() => new Date().toISOString(), {
  name: "get_current_time",
  description: "返回当前 UTC 时间 ISO 8601 格式",
  schema: z.object({}),
});

// 通过 middleware 注册工具，并用 wrapToolCall 包装执行
const extendedToolsMiddleware = createMiddleware({
  name: "ExtendedToolsMiddleware",
  stateSchema: z.object({
    toolInvocationCount: z.number().default(0),
  }),
  tools: [getCurrentTime],
  wrapToolCall: async (request, handler) => {
    const toolName = request.tool?.name ?? request.toolCall?.name;
    console.log(
      `[Tools] 即将执行：${toolName}`,
      "args:",
      request.toolCall.args ?? {},
    );
    const result = await handler(request);
    if (!ToolMessage.isInstance(result)) return result;

    const wrapped = new ToolMessage({
      name: result.name,
      content: `${result.content} \n[wrapToolCall] 已由 ExtendedToolsMiddleware 包装执行`,
      tool_call_id: result.tool_call_id,
    });

    console.log(
      `[Tools] 执行完成：${toolName}`,
      typeof wrapped.content === "string"
        ? wrapped.content.slice(0, 120)
        : wrapped,
    );

    return new Command({
      update: {
        toolInvocationCount: request.state.toolInvocationCount + 1,
        messages: [wrapped],
      },
    });
  },
  afterAgent: (state) => {
    console.log(
      `[Tools] agent 结束，middleware 统计工具调用：${state.toolInvocationCount}`,
    );
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
  middleware: [extendedToolsMiddleware],
});

for (const text of ["请返回当前时间"]) {
  console.log("\n用户：", text);
  const { messages, toolInvocationCount } = await agent.invoke({
    messages: [new HumanMessage(text)],
  });
  console.log("回复：", messages.at(-1)?.content);
  console.log("toolInvocationCount:", toolInvocationCount);
}
