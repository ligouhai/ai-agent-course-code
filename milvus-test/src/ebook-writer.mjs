/*
 * @Date: 2026-05-06 09:14:14
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-06 10:09:17
 */
import 'dotenv/config';
import { parse } from 'path';
import {
  MilvusClient,
  DataType,
  IndexType,
  MetricType
} from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const COLLECTION_NAME = 'ebook_collection';
const VECTOR_DIMENSION = 1024;
const CHUNK_SIZE = 500; // 拆分到500个字符
const EPUB_FILE_PATH = './天龙八部.epub';

// 从文件名提取书名 （去掉扩展名）
const BOOK_NAME = parse(EPUB_FILE_PATH).name;

// 初始化 Embeddings 模型
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

// 获取文本的向量嵌入
async function getEmbeddings(text) {
  return await embeddings.embedQuery(text);
}

// 创建或获取集合
async function ensureCollection(bookId) {
  try {
    // 检查集合是否存在
    const hasCollection = await milvusClient.hasCollection({
      collection_name: COLLECTION_NAME
    });

    if (!hasCollection.value) {
      console.log('创建集合...');
      await milvusClient.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          {
            name: 'id',
            data_type: DataType.VarChar,
            max_length: 100,
            is_primary_key: true
          },
          {
            name: 'book_id',
            data_type: DataType.VarChar,
            max_length: 100
          },
          {
            name: 'book_name',
            data_type: DataType.VarChar,
            max_length: 100
          },
          {
            name: 'chapter_num',
            data_type: DataType.Int32
          },
          {
            name: 'index',
            data_type: DataType.Int32
          },
          {
            name: 'book_content',
            data_type: DataType.VarChar,
            max_length: 10000
          },
          {
            name: 'vector',
            data_type: DataType.FloatVector,
            dim: VECTOR_DIMENSION
          }
        ]
      });
      console.log('集合创建成功');

      // 创建索引
      await milvusClient.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'vector',
        index_type: IndexType.IVF_FLAT,
        metric_type: MetricType.COSINE,
        params: {
          nlist: 1024
        }
      });
      console.log('索引创建成功');

      // 加载集合
      try {
        await milvusClient.loadCollection({
          collection_name: COLLECTION_NAME
        });
        console.log('集合加载成功');
      } catch (error) {
        console.error('集合已处于加载状态');
      }
    }
  } catch (error) {
    console.error('创建或获取集合失败:', error.message);
    throw error;
  }
}

// 将文档块批量插入到Milvus（流式处理）
async function insertChunksBatch(chunks, bookId, chapterNum) {
  try {
    if (chunks.length === 0) {
      return;
    }
    const insertData = await Promise.all(
      chunks.map(async (chunk, index) => {
        const vector = await getEmbeddings(chunk);
        return {
          id: `${bookId}-${chapterNum}-${index}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          chapter_num: chapterNum,
          index: index,
          book_content: chunk,
          vector: vector
        };
      })
    );
    const insertResult = await milvusClient.insert({
      collection_name: COLLECTION_NAME,
      data: insertData
    });
    console.log(`插入 ${insertResult.insert_cnt} 个文档块`);
    return Number(insertResult.insert_cnt) || 0;
  } catch (error) {
    console.error('插入文档块失败:', error.message);
    throw error;
  }
}

// 加载 EPUB 文件并进行流式处理（边处理边插入）
async function loadAndProcessEPubStreaming(bookId, chapterNum) {
  try {
    console.log(`\n 开始加载 ${EPUB_FILE_PATH} 文件...`);
    // 使用 EPubLoader 加载文件,按章节拆分
    const loader = new EPubLoader(EPUB_FILE_PATH, { splitChapters: true });

    const documents = await loader.load();
    console.log(`\n 加载完成，共${documents.length}个章节\n`);

    // 创建文本拆分器，拆分到500个字符一个chunk
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: CHUNK_SIZE,
      chunkOverlap: 50
    });

    let totalInserted = 0;

    for (
      let chapterIndex = 0;
      chapterIndex < documents.length;
      chapterIndex++
    ) {
      const chapter = documents[chapterIndex];
      const chapterContent = chapter.pageContent;
      console.log(`开始处理第${chapterIndex + 1}章，共${documents.length}章`);
      const chunks = await textSplitter.splitText(chapterContent);
      console.log(` 拆分完成，共${chunks.length}个片段`);
      if (chunks.length === 0) {
        console.log(`  跳过空章节\n`);
        continue;
      }

      console.log(`  生成向量并插入到Milvus...`);
      const insertedCount = await insertChunksBatch(
        chunks,
        bookId,
        chapterIndex + 1
      );
      totalInserted += insertedCount;
      console.log(
        `  ✓ 已插入 ${insertedCount} 条记录（累计: ${totalInserted}）\n`
      );
    }

    console.log(`\n总共插入 ${totalInserted} 条记录\n`);
    return totalInserted;
  } catch (error) {
    console.error('加载 EPUB 文件时出错:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('电子书处理程序');
    console.log('='.repeat(80));

    // 连接 Milvus
    console.log('\n连接 Milvus...');
    await milvusClient.connectPromise;
    console.log('✓ 已连接\n');

    const bookId = 0;

    await ensureCollection(bookId);

    await loadAndProcessEPubStreaming(bookId);

    console.log('='.repeat(80));
    console.log('处理完成！');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\n错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
