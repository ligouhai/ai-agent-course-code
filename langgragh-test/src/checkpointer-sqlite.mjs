/*
 * @Date: 2026-06-18 16:44:42
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-18 16:50:01
 */
import { existsSync, unlinkSync } from "node:fs";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

const dbPath = "./src/checkpointer-demo.sqlite";

const StateAnnotation = Annotation.Root({
  visitCount: Annotation({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  message: Annotation({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

function recordVisit(state) {
  const visitCount = state.visitCount + 1;
  return {
    visitCount,
    message:
      visitCount === 1
        ? "这是你在本会话里第 1 次进入"
        : `这是你在本会话里第 ${visitCount} 次进入`,
  };
}

const graph = new StateGraph(StateAnnotation)
  .addNode("recordVisit", recordVisit)
  .addEdge(START, "recordVisit")
  .addEdge("recordVisit", END);

if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}

const checkpointer = SqliteSaver.fromConnString(dbPath);
const compiledGraph = graph.compile({ checkpointer });

const user1 = { configurable: { thread_id: "用户-小张" } };
const user2 = { configurable: { thread_id: "用户-小李" } };

const result1 = await compiledGraph.invoke({}, user1);
const result2 = await compiledGraph.invoke({}, user1);
const result3 = await compiledGraph.invoke({}, user1);
const result4 = await compiledGraph.invoke({}, user2);

console.log(result1);
console.log(result2);
console.log(result3);
console.log(result4);
