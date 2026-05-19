/*
 * @Date: 2026-05-15 15:30:27
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-15 15:34:03
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 简单的问题，要求 JSON 格式输出
const question =
  "请介绍下爱因斯坦的信息。请以JSON 格式输出，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍）、major_achievements（主要成就，数组）、famous_theory（著名理论）。";
try {
  console.log("正在调用大模型...\n");
  const result = await model.invoke(question);

  console.log("收到响应：\n");
  console.log(result.content);

  //   解析 JSON
  const json = JSON.parse(result.content);
  console.log("解析结果：\n");
  console.log(json);
} catch (error) {
  console.error("调用大模型失败：", error.message);
}
