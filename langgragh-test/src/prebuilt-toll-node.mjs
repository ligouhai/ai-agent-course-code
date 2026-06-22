/*
 * @Date: 2026-06-22 10:35:12
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-22 10:56:05
 */
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { z } from "zod";
import { getProductBySku } from "./inventory.mock.mjs";

const getProductStock = tool(async ({ sku }) => getProductBySku(sku), {
  name: "get_product_stock",
  description: "根据 SKU 查商品名与库存，SKU 如 SKU-001。",
  schema: z.object({
    sku: z.string().describe("商品 SKU"),
  }),
});

const tools = [getProductStock];
const llm = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
}).bindTools(tools);

async function agent(state) {
  const response = await llm.invoke(state.messages);
  return {
    messages: response,
  };
}
const toolNode = new ToolNode(tools);

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent) // 调用大模型生成回答
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", toolsCondition, ["tools", END])
  .addEdge("tools", "agent")
  .compile();

const result = await graph.invoke({
  messages: [
    new HumanMessage("请查询 SKU-001 的库存还有多少，回答里带上商品名和数字"),
  ],
});

// 导出为 Mermaid：可复制到 https://mermaid.live 或Markdown 的```mermaid`` `代码块里
const drawable = await graph.getGraphAsync();
const mermaid = drawable.drawMermaid({ withStyle: true });
console.log(mermaid);

const last = result.messages.at(-1);
console.log(last?.content ?? result.messages);
