/*
 * @Date: 2026-06-30 10:39:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-30 11:18:31
 */
import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { HumanMessage } from "@langchain/core/messages";
import { END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const graph = new Neo4jGraph({
  url: "bolt://localhost:7687",
  username: "neo4j",
  password: "12345678",
});

const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const state = {
  messages: {
    value: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  },
  query: null,
  cypher: null,
  context: null,
  answer: null,
};

// 步骤 1：解析问题
async function parseQuestion(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  return { query: lastMessage.content };
}

// 步骤 2：生成 Cypher 查询
async function generateCypher(state) {
  const prompt = `
    你是一个专业的 Neo4j Cypher 生成器。
    严格按照下面的结构生成正确语句，只返回纯 Cypher 语句，不要返回任何解释或说明、不要 markdown。

    节点：
      - Product: 奶茶产品
      - Ingredient: 配料
      - Type: 奶茶分类
      - Method: 奶茶制作方法
      - People: 奶茶受众

    关系方向（必须严格遵守）：
      - (Product)-[:属于]->(Type)
      - (Product)-[:使用]->(Method)
      - (Product)-[:适合]->(People)
      - (Product)-[:包含]->(Ingredient)

    规则：
    1.关系方向绝对不能反
    2.多跳查询请使用多个 MATCH，不要连错路径
    3.只返回最终可运行的 Cypher 语句

    用户问题：${state.query}
    `;

  const res = await llm.invoke(prompt);
  return { cypher: res.content };
}

// 步骤 3：执行图查询
async function executeGraph(state) {
  try {
    const res = await graph.query(state.cypher);
    return { context: JSON.stringify(res) };
  } catch (error) {
    return { context: `执行图查询失败：${error.message}` };
  }
}

// 步骤 4：生成回答
async function generateAnswer(state) {
  const prompt = `
   你是奶茶专家，根据下方[检索结果]回答用户问题；检索结果为空或不足时请简要说明无法从图谱得到答案，不要编造。
   回答要求：
   - 直接列出事实，不要推断图谱里未出现的配料（如水、冰、添加剂等）。

   检索结果：${state.context}
   用户问题：${state.query}
    `;

  const res = await llm.invoke([new HumanMessage(prompt)]);
  return { answer: res.content };
}

// 构建 LangGraph 流程
const workflow = new StateGraph({ channels: state })
  .addNode("parseQuestion", parseQuestion)
  .addNode("generateCypher", generateCypher)
  .addNode("executeGraph", executeGraph)
  .addNode("generateAnswer", generateAnswer)
  .addEdge(START, "parseQuestion")
  .addEdge("parseQuestion", "generateCypher")
  .addEdge("generateCypher", "executeGraph")
  .addEdge("executeGraph", "generateAnswer")
  .addEdge("generateAnswer", END);

const app = workflow.compile();

async function printWorkflowMermaid() {
  const drawable = await app.getGraphAsync();
  const mermaid = await drawable.drawMermaid({ withStyle: true });
  console.log("--- LangGraph 工作流（Mermaid）---");
  console.log(mermaid);
  console.log("--------------------------------");
}

// 运行 GraphRAG
async function runGraphRAG(question) {
  const result = await app.invoke({ messages: [new HumanMessage(question)] });

  console.log("================================================");
  console.log("问题:", question);
  console.log("Cypher:", result.cypher);
  console.log("检索结果:", result.context);
  console.log("回答:", result.answer);
  console.log("================================================");
}

(async () => {
  await printWorkflowMermaid();
  await Promise.all([
    runGraphRAG("我们这款珍珠奶茶有哪些配料"),
    runGraphRAG("台式奶茶的饮品都有哪些配料？"),
    runGraphRAG("奶茶有哪些受众？"),
  ]);
})().catch(console.error);
