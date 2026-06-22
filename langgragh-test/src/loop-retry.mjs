/*
 * LangGraph 循环重试示例
 *
 * 核心概念：
 * - state 是整张图共享的全局状态，不是某个节点函数内的局部变量
 * - 节点执行完后，return 的字段会按 reducer 合并进 state
 * - 条件路由函数拿到的 state，是「上一节点 return 已合并之后」的快照
 *
 * 执行流程：
 * START → attempt → (state.ok ? END : 回到 attempt)
 */
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

// 声明全局 state 的字段结构；只有在这里定义（或通过 return 写入）的字段，路由函数才能读到
const StateAnnotation = Annotation.Root({
  tries: Annotation({
    reducer: (_prev, next) => next, // 合并策略：用新值覆盖旧值
    default: () => 0,
  }),
  ok: Annotation({
    reducer: (_prev, next) => next,
    default: () => false, // 初始未成功
  }),
  message: Annotation({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
});

// attempt 节点：模拟一次尝试
const attempt = (state) => {
  // 以下 ok / message 是函数内局部变量，路由函数读不到
  const tries = state.tries + 1;
  const ok = tries >= 3;

  // 只有通过 return 写回的字段，才会进入全局 state，供后续节点/条件边使用
  return {
    tries,
    ok,
    message: ok ? `第${tries}次成功` : `第${tries}次失败，继续重试`,
  };
};

const graph = new StateGraph(StateAnnotation)
  .addNode("attempt", attempt)
  .addEdge(START, "attempt")
  .addConditionalEdges(
    "attempt",
    // 这里的 state 不是 attempt 的局部作用域，而是 attempt 执行完、return 合并后的全局 state
    // 所以 state.ok 能读到，是因为上面 return { ok } 已经写进了 state
    (state) => (state.ok ? "done" : "retry"),
    {
      done: END,
      retry: "attempt", // 失败时回到 attempt，形成循环
    },
  )
  .compile();

// 导出 Mermaid 图：可复制到 https://mermaid.live 预览
const drawable = await graph.getGraphAsync();
const mermaid = drawable.drawMermaid({ withStyles: true });
console.log(mermaid);

// 初始 state 只需传入已有字段；ok / message 会由 attempt 节点逐步写入
const result = await graph.invoke({ tries: 0 });
console.log("result:", result);
