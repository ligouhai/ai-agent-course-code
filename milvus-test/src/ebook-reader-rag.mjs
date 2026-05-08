/*
 * @Date: 2026-05-07 10:07:27
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-07 10:43:15
 */
import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

const COLLECTION_NAME = 'ebook_collection';
const VECTOR_DIMENSION = 1024;

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
  temperature: 0.7
});

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

async function retrieveRelevantEbookContent(query, k = 2) {
  try {
    const queryVector = await getEmbeddings(query);
    const result = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'book_id', 'chapter_num', 'index', 'book_content']
    });
    return result.results;
  } catch (error) {
    console.error('检索图书内容出错：', error.message);
    return [];
  }
}

async function answerQuestion(query, k = 3) {
  try {
    console.log('='.repeat(80));
    console.log(`问题: ${query}`);
    console.log('='.repeat(80));

    // 1.检索相关图书内容
    const relevantContent = await retrieveRelevantEbookContent(query, k);
    if (relevantContent.length === 0) {
      console.log('没有找到相关内容');
      return '抱歉，我没有找到相关内容';
    }

    // 2.打印检索到的内容及相似度
    relevantContent.forEach((content, index) => {
      console.log(`\n[片段 ${index + 1}] 相似度: ${content.score.toFixed(4)}`);
      console.log(`图书 ID: ${content.book_id}`);
      console.log(`章节: 第${content.chapter_num}章`);
      console.log(`索引: ${content.index}`);
      console.log(`内容: ${content.book_content}`);
    });

    // 3.构建上下文
    const context = relevantContent
      .map((content, index) => {
        return `[片段 ${index + 1}]
          章节: 第${content.chapter_num}章
          内容: ${content.book_content}`;
      })
      .join('\n\n━━━━━\n\n');

    // 4.构建prompt
    const prompt = `你是一个专业的《天龙八部》小说阅读助手。基于以下小说内容回答问题，用准确、详细的语言。

        请根据以下小说片段内容回答问题：
        ${context}

        用户问题: ${query}

        回答要求：
        1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
        2. 可以综合多个片段的内容，提供完整的答案
        3. 如果片段中没有相关信息，请如实告知用户
        4. 回答要准确，符合小说的情节和人物设定
        5. 可以引用原文内容来支持你的回答

        AI助手回答：`;

    // 5.使用模型回答问题
    console.log('\n【AI 回答】');
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log('\n');
    return response.content;
  } catch (error) {
    console.error('回答问题出错：', error.message);
    return '抱歉，处理您的问题时出现了错误';
  }
}

async function main() {
  try {
    console.log('连接到 Milvus...');
    await milvusClient.connectPromise;
    console.log('✓ 已连接\n');

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

    const question = '虚竹喜欢哪个女的？';
    await answerQuestion(question, 5);
  } catch (error) {
    console.error('错误:', error.message);
  }
}

main();
