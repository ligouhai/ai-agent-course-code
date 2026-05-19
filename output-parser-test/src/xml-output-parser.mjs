/*
 * @Date: 2026-05-15 17:53:32
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-15 18:00:24
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { XMLOutputParser } from "@langchain/core/output_parsers";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const parser = new XMLOutputParser();

const question = `请提取一下文本中的任务信息：阿尔伯特·爱因斯坦出生于 1897 年，是一位伟大的物理学家。
${parser.getFormatInstructions()}`;
console.log("question", question);

try {
  console.log("正在调用大模型（使用 XMLOutputParser 解析） \n");
  const response = await model.invoke(question);
  console.log("模型原始响应: \n");
  console.log(response.content);

  const result = await parser.parse(response.content);

  console.log("\nXML 解析结果: \n");
  console.log(result);
} catch (error) {
  console.error("调用大模型失败：", error.message);
}
