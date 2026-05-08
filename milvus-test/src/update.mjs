/*
 * @Date: 2026-04-23 20:52:56
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-23 20:57:10
 */
import 'dotenv/config';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';

const COLLECTION_NAME = 'ai_diary';
const VECTOR_DIMENSION = 1024;

const embeddings = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
  dimensions: VECTOR_DIMENSION
});

const milvusClient = new MilvusClient({
  address: 'localhost:19530'
});

async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

async function main() {
  try {
    console.log('Connecting to Milvus...');
    await milvusClient.connectPromise;
    console.log('✓ Connected \n');

    // 更新数据 （Milvus 通过 upsert 实现更新）
    console.log('Updating data...');
    const updateId = 'diary_001';

    const updatedContent = {
      id: updateId,
      content:
        '今天下了一整天的雨，心情很糟糕。工作上遇到了很多困难，感觉压力很大。一个人在家，感觉特别孤独。',
      date: '2026-01-10',
      mood: 'sad',
      tags: ['生活', '散步', '朋友']
    };

    console.log('Generating new embedding...');

    const vector = await getEmbedding(updatedContent.content);
    const updateData = { ...updatedContent, vector };

    const updateResult = await milvusClient.upsert({
      collection_name: COLLECTION_NAME,
      data: [updateData]
    });

    console.log(`✓ Updated diary entry: ${updateId}`);
    console.log(`  New content: ${updatedContent.content}`);
    console.log(`  New mood: ${updatedContent.mood}`);
    console.log(`  New tags: ${updatedContent.tags.join(', ')}\n`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
