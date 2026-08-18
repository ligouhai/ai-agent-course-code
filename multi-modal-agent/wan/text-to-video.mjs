/*
 * @Date: 2026-08-14 15:22:39
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-14 15:26:40
 */
import { Configuration, VideoSynthesis } from "dashscope-sdk-official";
import "dotenv/config";
import { writeFileSync } from "node:fs";

const prompt = "一只橘猫在阳台晒太阳，微风吹动窗帘，镜头缓慢推进，电影质感";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new VideoSynthesis(configuration);

const result = await client.call({
  model: "wan2.7-t2v",
  prompt,
  resolution: "720P",
  ratio: "16:9",
  prompt_extend: true,
  watermark: false,
  duration: 5,
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
  "output-wan-text-to-video.mp4",
  Buffer.from(await videoResponse.arrayBuffer()),
);
console.log("Saved to output-wan-text-to-video.mp4");
