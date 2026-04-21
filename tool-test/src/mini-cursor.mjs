/*
 * @Date: 2026-03-10 16:04:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-10 15:54:12
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
} from "./all-tools.mjs";
import chalk from "chalk";

const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const tools = [
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
];

// 绑定工具到模型
const modelWithTools = model.bindTools(tools);
// Agent 执行函数
async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(
      `你是一个项目管理助手，使用工具完成任务
        当前工作目录：${process.cwd()}

        工具：
        1. read_file: 读取文件内容
        2. write_file: 写入文件内容
        3. exec_command: 执行命令 （支持 workingDirectory 参数指定工作目录）
        4. list_directory: 列出目录内容

        重要规则 - exec_command:
        - workingDirectory 参数会自动切换到指定目录
        - 当使用 workingDirectory 参数时，不要在命令中使用 cd 命令切换目录
        - 错误示例： { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
        - 正确示例： { command: "pnpm install", workingDirectory: "react-todo-app" }
        这样就对了！workingDirectory 参数会自动切换到 react-todo-app ,直接执行命令即可

        回复要简洁，只说做了什么
    `,
    ),
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen("⏳ 正在等待 AI 思考..."));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name);
      if (foundTool) {
        const result = await foundTool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({ content: result, tool_call_id: toolCall.id }),
        );
      }
    }
  }

  return messages[messages.length - 1].content;
}

const case1 = `将react-todo-app跑起来`;

try {
  await runAgentWithTools(case1);
} catch (error) {
  console.error(`\n❌ 错误: ${error.message}\n`);
}
