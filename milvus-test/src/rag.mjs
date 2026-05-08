import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

const COLLECTION_NAME = 'ai_diary';
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

// 获取文本向量的输入
async function getEmbeddings(text) {
  return await embeddings.embedQuery(text);
}

// 从Milvus中检索相关日记条目
async function retrieveRelevantDiaryEntries(query, k = 2) {
  try {
    const queryVector = await getEmbeddings(query);
    const result = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'content', 'date', 'mood', 'tags']
    });
    return result.results;
  } catch (error) {
    console.error('检索日记出错：', error.message);
    return [];
  }
}

// 使用 RAG 回答关于日记的问题
async function answerQuestion(query, k = 2) {
  try {
    console.log('='.repeat(80));
    console.log(`问题: ${query}`);
    console.log('='.repeat(80));
    // 1.检索相关日记
    const relevantEntries = await retrieveRelevantDiaryEntries(query, k);

    if (relevantEntries.length === 0) {
      console.log('没有找到相关的日记条目。');
      return '抱歉，我没有找到相关的日记内容';
    }

    // 2.打印检索到日记及相似度
    relevantEntries.forEach((diary, i) => {
      console.log(`\n[日记 ${i + 1}] 相似度: ${diary.score.toFixed(4)}`);
      console.log(`日期: ${diary.date}`);
      console.log(`心情: ${diary.mood}`);
      console.log(`标签: ${diary.tags?.join(', ')}`);
      console.log(`内容: ${diary.content}`);
    });

    // 3.构建上下文
    const context = relevantEntries
      .map((diary, i) => {
        return `[日记 ${i + 1}]
      日期: ${diary.date}
      心情: ${diary.mood}
      标签: ${diary.tags?.join(', ')}
      内容: ${diary.content}`;
      })
      .join('\n\n━━━━━\n\n');

    // 4.构建提示词
    const prompt = `你是一个温暖贴心的 AI 日记助手。基于用户的日记内容回答问题，用亲切自然的语言。

    请根据以下日记内容回答问题：
    ${context}

    用户问题: ${question}

    回答要求：
    1. 如果日记中有相关信息，请结合日记内容给出详细、温暖的回答
    2. 可以总结多篇日记的内容，找出共同点或趋势
    3. 如果日记中没有相关信息，请温和地告知用户
    4. 用第一人称"你"来称呼日记的作者
    5. 回答要有同理心，让用户感到被理解和关心

    AI 助手的回答:`;

    // 5.使用模型回答问题
    console.log('\n【AI 回答】');
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log('\n');

    return response.content;
  } catch (error) {
    console.error('回答问题出错：', error.message);
    return '回答问题时出错。';
  }
}

async function main() {
  try {
    console.log('连接到 Milvus...');
    await milvusClient.connectPromise;
    console.log('✓ 已连接\n');

    const question = '我最近做了什么让我感到快乐的事情？';
    await answerQuestion(question, 2);
  } catch (error) {
    console.error('错误:', error.message);
  }
}

main();
