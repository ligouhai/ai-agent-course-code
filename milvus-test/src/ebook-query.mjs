/*
 * @Date: 2026-05-07 10:07:27
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-07 10:13:52
 */
import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';

const COLLECTION_NAME = 'ebook_collection';
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

const getEmbeddings = async (text) => {
  return await embeddings.embedQuery(text);
};

async function main() {
  try {
    console.log('Connecting to Milvus...');
    await milvusClient.connectPromise;
    console.log('✓ Connected\n');

    try {
      await milvusClient.loadCollection({
        collection_name: COLLECTION_NAME
      });
      console.log('✓ 集合已加载\n');
    } catch (error) {
      // 如果已经加载，会报错，忽略即可
      if (!error.message.includes('already loaded')) {
        throw error;
      }
      console.log('✓ 集合已处于加载状态\n');
    }

    // 向量搜索
    console.log('Searching for data...');
    const query = '虚竹会什么武功？';
    console.log(`Query: ${query}\n`);

    const queryVector = await getEmbeddings(query);
    const result = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: 3,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'book_id', 'chapter_num', 'index', 'book_content']
    });
    console.log(`Found ${result.results.length} results:\n`);

    result.results.forEach((item, index) => {
      console.log(`${index + 1}. [Score: ${item.score.toFixed(4)}]`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Book ID: ${item.book_id}`);
      console.log(`   Chapter: 第${item.chapter_num}章`);
      console.log(`   Index: ${item.index}`);
      console.log(`   Book Content: ${item.book_content}\n`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
