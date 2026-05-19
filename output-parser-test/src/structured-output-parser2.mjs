/*
 * @Date: 2026-05-15 15:58:51
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-15 16:07:47
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const schema = z.object({
  name: z.string().describe("科学家的全名"),
  birth_year: z.number().describe("出生年月"),
  death_year: z.number().describe("去世年份，如果还在世则不填"),
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
  awards: z
    .array(
      z.object({
        year: z.number().describe("获奖年份"),
        name: z.string().describe("获奖名称"),
        category: z.string().describe("获奖原因"),
      }),
    )
    .describe("获得的重要奖项列表"),
  major_achievements: z.array(z.string()).describe("主要成就列表"),
  famous_theories: z
    .array(
      z.object({
        year: z.number().describe("提出年份"),
        name: z.string().describe("理论名称"),
        description: z.string().describe("理论简要描述"),
      }),
    )
    .describe("著名理论列表"),
  education: z
    .array(
      z.object({
        year: z.number().describe("毕业年份"),
        school: z.string().describe("毕业学校"),
        degree: z.string().describe("学位"),
      }),
    )
    .optional()
    .describe("教育背景"),
});

const parser = StructuredOutputParser.fromZodSchema(schema);

const question = `请介绍下居里夫人(Marie Curie)的详细信息，包括她的教育背景、研究领域、获得的奖项、主要成就和著名理论。
${parser.getFormatInstructions()}`;

console.log("生成的提示词：\n");
console.log("question:", question);

try {
  console.log("正在调用大模型（使用 StructuredOutputParser）...\n");
  const result = await model.invoke(question);
  console.log("模型原始响应：\n");
  console.log(result.content);

  const autoParsedResult = await parser.parse(result.content);

  console.log("自动解析结果：\n");
  console.log(JSON.stringify(result, null, 2));
  console.log("姓名：", autoParsedResult.name);
  console.log("出生年份：", autoParsedResult.birth_year);
  console.log("去世年份：", autoParsedResult.death_year);
  console.log("国籍：", autoParsedResult.nationality);
  console.log("研究领域：", autoParsedResult.fields);
  console.log("教育背景：");
  autoParsedResult.education.forEach((education) => {
    console.log(`- ${education.year} ${education.school} ${education.degree}`);
  });
  console.log("获得的重要奖项：");
  autoParsedResult.awards.forEach((award) => {
    console.log(`- ${award.year} ${award.name} ${award.category}`);
  });
  console.log("主要成就：");
  autoParsedResult.major_achievements.forEach((achievement) => {
    console.log(`- ${achievement}`);
  });
  console.log("著名理论：");
  autoParsedResult.famous_theories.forEach((theory) => {
    console.log(`- ${theory.year} ${theory.name} ${theory.description}`);
  });
} catch (error) {
  console.error("调用大模型失败：", error.message);
}
