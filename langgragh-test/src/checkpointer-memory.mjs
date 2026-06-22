/*
 * @Date: 2026-06-18 16:30:03
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-18 16:44:12
 */
import {
  Annotation,
  END,
  MemorySaver,
  START,
  StateGraph,
} from "@langchain/langgraph";

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

// 每跑一轮图，给【当前会话】访问次数+1
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

const checkpointer = new MemorySaver();
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
