/*
 * @Date: 2026-05-15 17:10:04
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-15 17:13:21
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
  name: z.string().describe("姓名"),
  birth_year: z.number().describe("出生年份"),
  death_year: z.number().describe("去世年份"),
  nationality: z.string().describe("国籍"),
  occupation: z.string().describe("职业"),
  famous_works: z.array(z.string()).describe("著名作品列表"),
  biography: z.array(z.string()).describe("简讯传记"),
});

const parser = StructuredOutputParser.fromZodSchema(schema);

const prompt = `详细介绍莫扎特的信息。\n\n${parser.getFormatInstructions()}`;

console.log("流式结构化输出演示\n");

try {
  const stream = await model.stream(prompt);

  let fullContent = "";
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    const content = chunk.content;
    fullContent += content;

    process.stdout.write(content);
  }

  console.log(`\n\n 共接收了 ${chunkCount} 个块`);

  //   解析完整内容为结构化数据
  const result = await parser.parse(fullContent);

  console.log("结构化结果：", result);
  console.log("\n📝 格式化输出:");
  console.log(`姓名: ${result.name}`);
  console.log(`出生年份: ${result.birth_year}`);
  console.log(`去世年份: ${result.death_year}`);
  console.log(`国籍: ${result.nationality}`);
  console.log(`职业: ${result.occupation}`);
  console.log(`著名作品: ${result.famous_works.join(", ")}`);
  console.log(`传记: ${result.biography}`);
} catch (error) {
  console.error("调用大模型失败：", error.message);
}
