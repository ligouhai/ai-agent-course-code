/*
 * @Date: 2026-08-13 18:25:50
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-13 18:32:22
 */
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "qwen-vl-plus",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke([
  new HumanMessage({
    content: [
      {
        type: "image_url",
        image_url: {
          url: "https://agent-bucket-legalhigh.oss-cn-beijing.aliyuncs.com/386e3620305e4fa3848ff40896cedcef.png",
        },
      },
      {
        type: "text",
        text: "图中描绘的是什么景象?",
      },
    ],
  }),
]);

console.log("model:qwen-vl-plus", response.content);
