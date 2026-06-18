/*
 * @Date: 2026-03-10 16:04:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-17 09:47:43
 */
import {
  HumanMessage,
  SystemMessage,
  ToolMessage
} from '@langchain/core/messages';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { JsonOutputToolsParser } from '@langchain/core/output_parsers/openai_tools';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import 'dotenv/config';
import {
  executeCommandTool,
  listDirectoryTool,
  readFileTool,
  writeFileTool
} from './all-tools.mjs';

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

const tools = [
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool
];

// 绑定工具到模型：模型回复时会输出 tool_calls 结构，而非纯文本
const modelWithTools = model.bindTools(tools);

/**
 * ReAct 风格 Agent 主循环：
 * 1. 模型流式生成 → 2. 解析/预览 → 3. 执行工具 → 4. 把结果写回 history → 重复
 */
async function runAgentWithTools(query, maxIterations = 30) {
  const history = new InMemoryChatMessageHistory();

  await history.addMessage(
    new SystemMessage(`你是一个项目管理助手，使用工具完成任务
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


      重要规则 - write_file:
      - 当写入 React 组件文件（如 App.tsx）时，如果存在对应 CSS 文件（如 App.css），在其他 import 语句后加上这个 css 的导入

    `)
  );

  await history.addMessage(new HumanMessage(query));

  // 外层循环：每一轮 = 一次「思考 → 可能调工具 → 观察结果」
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen('⏳ 正在等待 AI 思考...'));

    const messages = await history.getMessages();
    // stream 返回 AIMessageChunk 序列，tool_calls 参数是逐 token 拼出来的
    const rawStream = await modelWithTools.stream(messages);

    // 用 concat 把 chunk 还原成完整的 AIMessage（含 tool_calls）
    let fullAIMessage = null;

    // JsonOutputToolsParser：把「尚未完整的 JSON 字符串」尽量解析成结构化 tool args
    // 关键能力：流式过程中 args.content 会从 "import" → "import React" → ... 逐步变长
    const toolCallChunksParser = new JsonOutputToolsParser();

    // 增量打印 write_file 内容时，记录每个 tool call 已输出到第几个字符，避免重复打印
    const printedLengths = new Map();

    console.log(chalk.bgGreen('Agent 开始思考并生成流...'));

    for await (const chunk of rawStream) {
      fullAIMessage = fullAIMessage ? fullAIMessage.concat(chunk) : chunk;
      let parsedTools = null;

      try {
        // 每次都用「当前已拼接的完整 message」重新解析，拿到最新的 args 快照
        parsedTools = await toolCallChunksParser.parseResult([
          { message: fullAIMessage }
        ]);
      } catch (error) {
        // JSON 还不完整时会抛错，忽略即可，等下一个 chunk 再试
      }

      if (parsedTools && parsedTools.length > 0) {
        // 已识别出工具调用：对流式 write_file 做「打字机效果」预览
        for (const toolCall of parsedTools) {
          if (toolCall.type === 'write_file' && toolCall.args?.content) {
            const toolCallId =
              toolCall.id || toolCall.args.filePath || 'default';
            const currentContent = String(toolCall.args.content);
            let previousLength = printedLengths.get(toolCallId);

            if (previousLength === undefined) {
              previousLength = 0;
              printedLengths.set(toolCallId, 0);
            }

            // 只输出比上次更长的新增部分
            if (currentContent.length > previousLength) {
              const newContent = currentContent.slice(previousLength);
              process.stdout.write(newContent);
              printedLengths.set(toolCallId, currentContent.length);
            }
          }
        }
      } else {
        // 还没解析出 tool_calls 时，说明模型在输出普通文本，直接打印 content
        if (chunk.content) {
          process.stdout.write(
            typeof chunk.content === 'string'
              ? chunk.content
              : JSON.stringify(chunk.content)
          );
        }
      }
    }

    // 流结束：fullAIMessage.tool_calls 已是完整结构，写入 history 供下一轮使用
    await history.addMessage(fullAIMessage);
    console.log(chalk.bgGreen('消息已完整存入历史'));

    // 没有 tool_calls → 任务完成，返回最终文本
    if (!fullAIMessage.tool_calls || fullAIMessage.tool_calls.length === 0) {
      console.log(`\n AI最终回复：\n${fullAIMessage.content}\n`);
      return fullAIMessage.content;
    }

    // 有 tool_calls → 逐个执行，结果以 ToolMessage 回灌给模型
    for (const toolCall of fullAIMessage.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name);
      if (foundTool) {
        const result = await foundTool.invoke(toolCall.args);
        await history.addMessage(
          new ToolMessage({ content: result, tool_call_id: toolCall.id })
        );
      }
    }
  }

  const finalMessages = await history.getMessages();

  return finalMessages[finalMessages.length - 1].content;
}

const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
  - 添加、删除、编辑、标记完成
  - 分类筛选（全部/进行中/已完成）
  - 统计信息显示
  - localStorage 数据持久化
3. 添加复杂样式：
  - 渐变背景（蓝到紫）
  - 卡片阴影、圆角
  - 悬停效果
4. 添加动画：
  - 添加/删除时的过渡动画
  - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

去掉 main.tsx 里的 index.css 导入

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;

try {
  await runAgentWithTools(case1);
} catch (error) {
  console.error(`\n❌ 错误: ${error.message}\n`);
}
