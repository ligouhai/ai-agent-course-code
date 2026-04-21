import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-2.5-flash",
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "my-mcp-server": {
      command: "node",
      args: ["/Users/legalhigh/Code/ai-code/tool-test/src/my-mcp-server.mjs"],
    },
    "amap-maps-streamableHTTP": {
      url: `https://mcp.amap.com/mcp?key=${process.env.AMAP_MAPS_API_KEY}`,
    },
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        ...(process.env.ALLOWED_PATHS?.split(",").filter(Boolean) ?? []),
      ],
    },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
    },
  },
});

function containsUnsupportedGeminiKeyword(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsUnsupportedGeminiKeyword(item));
  }
  if (Object.prototype.hasOwnProperty.call(value, "exclusiveMinimum")) {
    return true;
  }
  if (Object.prototype.hasOwnProperty.call(value, "exclusiveMaximum")) {
    return true;
  }
  return Object.values(value).some((item) =>
    containsUnsupportedGeminiKeyword(item),
  );
}

function getToolSchema(tool) {
  const candidateKeys = [
    "schema",
    "toolCallSchema",
    "tool_call_schema",
    "args_schema",
    "inputSchema",
    "jsonSchema",
  ];
  for (const key of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(tool, key) && tool[key]) {
      return tool[key];
    }
  }
  return null;
}

const tools = await mcpClient.getTools();
let geminiCompatibleTools = tools.filter((tool) => {
  const schema = getToolSchema(tool);
  if (!schema) {
    return true;
  }
  return !containsUnsupportedGeminiKeyword(schema);
});
const skippedToolNames = tools
  .filter((tool) => !geminiCompatibleTools.includes(tool))
  .map((tool) => tool.name);
if (skippedToolNames.length > 0) {
  console.warn("Gemini不兼容的工具已跳过:", skippedToolNames.join(", "));
}
const modelWithTools = model.bindTools(geminiCompatibleTools);

function extractUnsupportedToolIndexes(errorMessage) {
  const matches = [...errorMessage.matchAll(/function_declarations\[(\d+)\]/g)];
  const indexes = matches
    .map((match) => Number.parseInt(match[1], 10))
    .filter((value) => Number.isInteger(value));
  return [...new Set(indexes)].sort((a, b) => b - a);
}

function removeUnsupportedToolsByIndexes(currentTools, indexes) {
  if (!indexes.length) {
    return { updatedTools: currentTools, removedNames: [] };
  }
  const nextTools = [...currentTools];
  const removedNames = [];
  for (const index of indexes) {
    if (index < 0 || index >= nextTools.length) {
      continue;
    }
    const [removed] = nextTools.splice(index, 1);
    if (removed?.name) {
      removedNames.push(`${removed.name}(index:${index})`);
    }
  }
  return { updatedTools: nextTools, removedNames };
}

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new HumanMessage(query)];
  let currentModelWithTools = modelWithTools;
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen("⏳ 正在等待 AI 思考..."));
    let response;
    try {
      response = await currentModelWithTools.invoke(messages);
    } catch (error) {
      const errorMessage = String(error?.message ?? error);
      const unsupportedIndexes = extractUnsupportedToolIndexes(errorMessage);
      if (!unsupportedIndexes.length) {
        throw error;
      }
      const { updatedTools, removedNames } = removeUnsupportedToolsByIndexes(
        geminiCompatibleTools,
        unsupportedIndexes,
      );
      if (!removedNames.length) {
        throw error;
      }
      geminiCompatibleTools = updatedTools;
      currentModelWithTools = model.bindTools(geminiCompatibleTools);
      console.warn(
        "检测到Gemini不兼容参数，已自动移除工具并重试:",
        removedNames.join(", "),
      );
      response = await currentModelWithTools.invoke(messages);
    }
    messages.push(response);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }
    console.log(
      chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`),
    );
    console.log(
      chalk.bgBlue(
        `🔍 工具调用: ${response.tool_calls.map((t) => t.name).join(", ")}`,
      ),
    );

    for (const toolCall of response.tool_calls) {
      const foundTool = geminiCompatibleTools.find(
        (t) => t.name === toolCall.name,
      );
      if (foundTool) {
        const result = await foundTool.invoke(toolCall.args);

        let contentStr = "";
        if (typeof result === "string") {
          contentStr = result;
        } else if (result && result.text) {
          contentStr = result.text;
        } else {
          contentStr = JSON.stringify(result ?? "");
        }
        messages.push(
          new ToolMessage({ content: contentStr, tool_call_id: toolCall.id }),
        );
      }
    }
  }
  return messages[messages.length - 1].content;
}

// await runAgentWithTools(
//   "汉口北站附近的5个酒店，以及去的路线，路线规划生成文档保存到 /Users/legalhigh/Desktop 的一个md文件",
// );
await runAgentWithTools(
  "汉口北站附近的3个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个tab一个url展示，并且把那个页面标题改为酒店名",
);
await mcpClient.close();
