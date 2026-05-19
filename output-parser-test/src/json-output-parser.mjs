/*
 * @Date: 2026-05-15 15:37:30
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-15 15:38:50
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";

// 初始化模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const parser = new JsonOutputParser();

const question = `请介绍下爱因斯坦的信息。请以JSON 格式输出，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍）、major_achievements（主要成就，数组）、famous_theory（著名理论）。${parser.getFormatInstructions()}`;

console.log("question:", question);

try {
  console.log("正在调用大模型（使用 JsonOutputParser）...\n");
  const result = await model.invoke(question);
  console.log("模型原始响应：\n");
  console.log(result.content);

  const autoParsedResult = await parser.parse(result.content);
  console.log("自动解析结果：\n");
  console.log(autoParsedResult);
  console.log("姓名：", autoParsedResult.name);
  console.log("出生年份：", autoParsedResult.birth_year);
  console.log("国籍：", autoParsedResult.nationality);
  console.log("主要成就：", autoParsedResult.major_achievements);
  console.log("著名理论：", autoParsedResult.famous_theory);
} catch (error) {
  console.error("调用大模型失败：", error.message);
}
