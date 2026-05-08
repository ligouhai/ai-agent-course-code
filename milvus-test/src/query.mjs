/*
 * @Date: 2026-04-23 20:30:13
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-23 20:40:29
 */
/*
 * @Date: 2026-04-23 20:30:13
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-23 20:36:24
 */
import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
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

async function getEmbeddings(text) {
  return await embeddings.embedQuery(text);
}

async function main() {
  try {
    console.log('Connecting to Milvus...');
    await milvusClient.connectPromise;
    console.log('✓ Connected');

    console.log('Searching for data...');
    const query = '我做饭或学习的日记';
    console.log(`Query: ${query}`);

    const queryVector = await getEmbeddings(query);
    const result = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: 2,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'content', 'date', 'mood', 'tags']
    });
    console.log(`Found ${result.results.length} results:\n`);

    result.results.forEach((item, index) => {
      console.log(`${index + 1}. [Score: ${item.score.toFixed(4)}]`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Date: ${item.date}`);
      console.log(`   Mood: ${item.mood}`);
      console.log(`   Tags: ${item.tags?.join(', ')}`);
      console.log(`   Content: ${item.content}\n`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
