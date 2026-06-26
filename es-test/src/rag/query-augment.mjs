/*
 * @Date: 2026-06-26 15:38:39
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-26 15:49:10
 *
 * Query Augmentation（多路检索问句扩展）
 * 将 1 条用户问题扩成 3 条不同角度的检索问句，配合 retrievalQueryStrings
 * 得到「原问题 + 3 条改写」共 4 条，分别去向量库/ES 检索，提高召回率。
 */
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

// 约束 LLM 输出结构：必须是恰好 3 条字符串，避免自由文本难以解析
export const QueryAugmentationSchema = z.object({
  queries: z
    .array(z.string())
    .length(3)
    .describe(
      "恰好3 条中文检索问句：不同角度改写或扩写；保留订单号、品牌等字面信息；不要编造事实",
    ),
});

// 提示词：system 定义改写规则，human 占位符 {query} 在 invoke 时填入用户原问题
const AUGMENT_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一个检索问句改写助手。
用户会给出一句中文问题。请另外生成恰好 3 条检索用问句，用于搜索引擎或向量库分别召回。
要求：
- 与原意一致，角度尽量不同
- 可改写说法、换提问角度，或略加限定词
- 专有名词、型号、订单号等必须保留原样，不得编造事实
- 只输出 queries 字段（长度为 3 的字符串数组）`,
  ],
  ["human", "{query}"],
]);

// 兜底：LLM 返回不足 3 条时用原问题补齐，超过 3 条则截断
function normalizeThreeQueries(original, list) {
  const out = (list ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  while (out.length < 3) {
    out.push(original);
  }
  return out.slice(0, 3);
}

/**
 * 调用 LLM 将用户问题改写为 3 条检索问句。
 * @param {import("@langchain/openai").ChatOpenAI} chatModel - 支持 withStructuredOutput 的聊天模型
 * @param {string} query - 用户原始问题
 * @returns {Promise<{ queries: string[] }>}
 */
export async function augmentQuery(chatModel, query) {
  // withStructuredOutput 强制模型按 Zod schema 输出 JSON
  const structured = chatModel.withStructuredOutput(QueryAugmentationSchema);
  // Prompt → 结构化 LLM，串成一条调用链
  const chain = AUGMENT_PROMPT.pipe(structured);
  try {
    const result = await chain.invoke({ query });
    return { queries: normalizeThreeQueries(query, result.queries) };
  } catch (error) {
    console.error("Error augmenting query:", error);
    // 失败时返回 3 条原问题，保证下游检索链路不中断
    return { queries: normalizeThreeQueries(query, []) };
  }
}

/**
 * 合并为最终检索列表：原问题 + 3 条改写 = 共 4 条，供 multi-query 检索使用。
 * @param {string} original - 用户原始问题
 * @param {{ queries: string[] }} augmentation - augmentQuery 的返回值
 * @returns {string[]}
 */
export function retrievalQueryStrings(original, augmentation) {
  return [original, ...augmentation.queries]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
}
