/*
 * @Date: 2026-03-09 09:43:04
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-03 17:13:41
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke("介绍下自己");
console.log(response.content);
