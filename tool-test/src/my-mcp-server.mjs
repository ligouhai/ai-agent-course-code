/*
 * @Date: 2026-04-13 10:26:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-13 11:42:32
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 数据库
const database = {
  users: {
    "001": {
      id: "001",
      name: "张三",
      email: "zhangsan@example.com",
      role: "admin",
    },
    "002": { id: "002", name: "李四", email: "lisi@example.com", role: "user" },
    "003": {
      id: "003",
      name: "王五",
      email: "wangwu@example.com",
      role: "user",
    },
  },
};

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
  description: "一个简单的MCP服务器",
});

// 注册工具：查询用户信息
// 注意：registerTool 第三个参数必须是 (args, extra) => ... 回调函数，不能写成 { execute: ... }
server.registerTool(
  "query_user",
  {
    description:
      "查询数据库中的用户信息。输入用户ID，返回该用户的详细信息（姓名、邮箱、角色）",
    inputSchema: {
      userId: z.string().describe("用户ID"),
    },
  },
  async ({ userId }) => {
    const user = database.users[userId];
    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: `用户 ${userId} 不存在。可用 ID: 001，002，003`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `用户信息：\n- ID: ${userId}\n- 姓名: ${user.name}\n- 邮箱: ${user.email}\n- 角色: ${user.role}`,
        },
      ],
    };
  },
);

server.registerResource(
  "使用指南",
  "docs://guide",
  {
    description: "使用指南",
    mimeType: "text/plain",
  },
  async ({}) => {
    return {
      contents: [
        {
          uri: "docs://guide",
          mimeType: "text/plain",
          text: `MCP Server 使用指南

            功能：提供用户查询等工具。
            
            使用：在 Cursor 等 MCP Client 中通过自然语言对话，Cursor 会自动调用相应工具。`,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
