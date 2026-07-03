/*
 * @Date: 2026-06-30 15:01:31
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-30 15:29:08
 */
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  DataType,
  IndexType,
  MetricType,
  MilvusClient,
} from "@zilliz/milvus2-sdk-node";
import "dotenv/config";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

const COLLECTION_NAME = process.env.MILVUS_COLLECTION_NAME ?? "rag_docs";
const MILVUS_ADDRESS =
  process.env.MILVUS_ADDRESS_URL?.replace(/^https?:\/\//, "") ??
  "localhost:19530";
const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const milvusClient = new MilvusClient({
  address: MILVUS_ADDRESS,
});

async function loadChunk(dataDir = "./data") {
  if (!existsSync(dataDir)) {
    throw new Error(`数据目录不存在：${dataDir}`);
  }
  const files = readdirSync(dataDir).filter((file) =>
    /\.(txt|md)$/i.test(file),
  );
  if (files.length === 0) {
    throw new Error(`数据目录下没有txt或md文件：${dataDir}`);
  }
  const docs = files.map((file) => {
    const filePath = join(dataDir, file);
    const content = readFileSync(filePath, "utf8");
    return {
      pageContent: content,
      metadata: {
        source: file,
      },
    };
  });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  return splitter.splitDocuments(docs);
}

async function main() {
  try {
    console.log("Connecting to Milvus...");
    await milvusClient.connectPromise;
    console.log("✓ Connected");

    const chunks = await loadChunk();
    if (
      (await milvusClient.hasCollection({ collection_name: COLLECTION_NAME }))
        .value
    ) {
      await milvusClient.dropCollection({ collection_name: COLLECTION_NAME });
      console.log("Collection dropped");
    }

    console.log("Generating embeddings...");
    const vectors = await embeddings.embedDocuments(
      chunks.map((chunk) => chunk.pageContent),
    );
    console.log("✓ Embeddings generated");

    const dim = vectors[0].length;

    console.log("Creating collection...");
    await milvusClient.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: "langchain_primary_id",
          data_type: DataType.Int64,
          is_primary_key: true,
          autoID: true,
        },
        {
          name: "langchain_vector",
          data_type: DataType.FloatVector,
          dim: dim,
        },
        {
          name: "langchain_text",
          data_type: DataType.VarChar,
          max_length: 8000,
        },
        {
          name: "source",
          data_type: DataType.VarChar,
          max_length: 256,
        },
      ],
    });
    console.log("✓ Collection created");

    console.log("Creating index...");
    await milvusClient.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: "langchain_vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.L2,
      params: {
        nlist: 128,
      },
    });
    console.log("✓ Index created");

    console.log("Loading collection...");
    await milvusClient.loadCollection({
      collection_name: COLLECTION_NAME,
    });
    console.log("✓ Collection loaded");

    const data = chunks.map((chunk, index) => ({
      langchain_vector: vectors[index],
      langchain_text: chunk.pageContent,
      source: chunk.metadata.source,
    }));

    console.log("Inserting data...");
    const result = await milvusClient.insert({
      collection_name: COLLECTION_NAME,
      data,
    });
    if (result.status?.error_code !== "Success" || result.err_index?.length) {
      throw new Error(
        result.status?.reason ?? `Insert failed for rows: ${result.err_index}`,
      );
    }
    await milvusClient.flushSync({ collection_names: [COLLECTION_NAME] });
    console.log(`✓ Inserted ${result.insert_cnt} records`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
