/*
 * @Date: 2026-08-14 10:40:29
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-14 10:47:48
 */
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "qwen3.5-omni-plus",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke([
  new HumanMessage({
    content: [
      {
        type: "input_audio",
        input_audio: {
          data: "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250211/tixcef/cherry.wav",
          format: "wav",
        },
      },
      { type: "text", text: "这段音频在说什么" },
    ],
  }),
]);

console.log("model:qwen3.5-omni-plus", response.content);
