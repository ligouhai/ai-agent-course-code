/*
 * @Date: 2026-04-20 14:26:56
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-20 14:40:47
 */
import "dotenv/config";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7233327509919547452",
  {
    selector: ".main-area p",
  },
);

const documents = await cheerioLoader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400, // 400个字符一个chunk
  chunkOverlap: 50, // 分块之间的重叠字符数
  separators: ["。", "！", "？"], // 分块之间的分隔符
});

const chunks = await textSplitter.splitDocuments(documents);

console.log(chunks);
