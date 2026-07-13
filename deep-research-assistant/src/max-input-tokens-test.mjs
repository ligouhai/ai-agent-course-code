/*
 * @Date: 2026-07-13 11:57:31
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-13 11:59:17
 */
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
const model = new ChatOpenAI({
  temperature: 0,
  model: process.env.MODEL_NAME,

  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

console.log(model.profile.maxInputTokens);

Object.defineProperty(model, "profile", {
  get: () => ({ maxInputTokens: 1_024 }),
});

console.log(model.profile.maxInputTokens);
