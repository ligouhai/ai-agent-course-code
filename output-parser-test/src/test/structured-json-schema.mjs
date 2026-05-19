/*
 * @Date: 2026-05-18 17:40:45
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-18 17:47:11
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import chalk from 'chalk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const scientistSchema = z.object({
  name: z.string().describe(' 科学家姓名'),
  birth_year: z.string().describe('出生年份'),
  field: z.string().describe('研究领域'),
  achievements: z.string().describe('主要成就列表')
});

// 将 zod 转换为原生的 JSON Schema格式
const jsonSchema = zodToJsonSchema(scientistSchema);

// 初始化模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
  modelKwargs: {
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'scientist_info',
        strict: true,
        schema: jsonSchema
      }
    }
  }
});

async function testNativeJsonSchema() {
  console.log('正在测试原生 JSON Schema...');

  const res = await model.invoke([
    new SystemMessage('你是一个信息提取助手，请直接返回 JSON 数据'),
    new HumanMessage('介绍一下钱学森：')
  ]);

  console.log(chalk.green('\n✅ 收到响应 (纯净 JSON):'));
  console.log(res.content);

  const data = JSON.parse(res.content);
  console.log(chalk.cyan('\n📋 解析后的对象:'));
  console.log(data);
}

testNativeJsonSchema().catch(console.error);
