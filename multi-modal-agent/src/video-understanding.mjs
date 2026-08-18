/*
 * @Date: 2026-08-14 10:40:29
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-14 14:27:18
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
        type: "video_url",
        video_url: {
          url: "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20241115/cqqkru/1.mp4",
        },
      },
      { type: "text", text: "视频的内容是什么?" },
    ],
  }),
]);

console.log("model:qwen3.5-omni-plus", response.content);
