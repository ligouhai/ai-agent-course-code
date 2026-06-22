/*
 * @Date: 2026-06-18 15:06:09
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-18 15:40:51
 */
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  query: Annotation({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  route: Annotation({
    reducer: (_prev, next) => next,
    default: () => "chat",
  }),
  answer: Annotation({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

const router = (state) => {
  const isMath = /[+\-*/]/.test(state.query);
  return { route: isMath ? "math" : "chat" };
};

const mathNode = (state) => {
  try {
    return { answer: String(eval(state.query)) };
  } catch (error) {
    return { answer: "表达式无法计算" };
  }
};

const chatNode = (state) => ({ answer: `你说的是${state.query}` });

const graph = new StateGraph(StateAnnotation)
  .addNode("router", router)
  .addNode("math", mathNode)
  .addNode("chat", chatNode)
  .addEdge(START, "router")
  .addConditionalEdges("router", (state) => state.route, {
    math: "math",
    chat: "chat",
  })
  .addEdge("math", END)
  .addEdge("chat", END)
  .compile();

// 导出
const drawable = await graph.getGraphAsync();
const mermaid = drawable.drawMermaid({ withStyle: true });
console.log(mermaid);

const result1 = await graph.invoke({ query: "你好" });
console.log(result1);

const result2 = await graph.invoke({ query: "10*8" });
console.log(result2);
