/*
 * @Date: 2026-05-21 14:54:19
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-21 14:56:42
 */
import 'dotenv/config';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { RunnableSequence } from '@langchain/core/runnables';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

// 定义输出结构的 schema
const schema = z.object({
  translation: z.string().describe('翻译后的英文文本'),
  keywords: z.array(z.string()).length(3).describe('3个关键词')
});

const outputParser = StructuredOutputParser.fromZodSchema(schema);

const promptTemplate = PromptTemplate.fromTemplate(
  `将以下文本翻译成英文，然后总结为3个关键词。\n\n文本：{text}\n\n{format_instructions}`
);

// const chain = RunnableSequence.from([promptTemplate, model, outputParser]);
const chain = promptTemplate.pipe(model).pipe(outputParser);

const input = {
  text: 'LangChain 是一个强大的 AI 应用开发框架',
  format_instructions: outputParser.getFormatInstructions()
};

const result = await chain.invoke(input);

console.log('翻译结果：', result);
