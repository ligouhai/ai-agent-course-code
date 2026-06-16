/*
 * @Date: 2026-05-15 16:44:21
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 17:55:09
 */
import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

const prompt = '详细介绍下莫扎特的信息。';

console.log('普通流式输出演示（无结构化）\n');

try {
  const stream = await model.stream(prompt);

  let fullContent = '';
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;

    const content = chunk.content;
    fullContent += content;

    process.stdout.write(content);
  }
  console.log(`\n\n 共接收了 ${chunkCount} 个块`);
  console.log(`完整内容长度：${fullContent.length}字符`);
} catch (error) {
  console.error('调用大模型失败：', error.message);
}
