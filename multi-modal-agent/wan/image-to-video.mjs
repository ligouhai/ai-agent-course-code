/*
 * @Date: 2026-08-14 14:52:45
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-14 15:14:13
 */
/*
 * @Date: 2026-08-14 14:52:45
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-14 15:00:53
 */
import { Configuration, VideoSynthesis } from "dashscope-sdk-official";
import "dotenv/config";
import { writeFileSync } from "node:fs";
const imageUrl =
  "https://agent-bucket-legalhigh.oss-cn-beijing.aliyuncs.com/386e3620305e4fa3848ff40896cedcef.png";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new VideoSynthesis(configuration);

const result = await client.call({
  model: "wan2.6-i2v-flash",
  prompt: "让模特由远到近走过来",
  img_url: imageUrl,
  resolution: "720P",
  duration: 5,
  prompt_extend: true,
  watermark: false,
});

const taskStatus = result.output?.task_status;
console.log("task_status:", taskStatus);

if (taskStatus === "FAILED") {
  throw new Error(result.output?.message ?? result.message ?? "Task failed");
}

const videoUrl = result.output?.video_url;
if (!videoUrl) {
  throw new Error(`No video URL in response: ${JSON.stringify(result)}`);
}

console.log("video URL:", videoUrl);
const videoResponse = await fetch(videoUrl);
writeFileSync(
  "output-wan-image-to-video.mp4",
  Buffer.from(await videoResponse.arrayBuffer()),
);
console.log("Saved to output-wan-image-to-video.mp4");
