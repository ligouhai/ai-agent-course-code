import { Configuration, MultiModalConversation } from "dashscope-sdk-official";
import "dotenv/config";
import { writeFileSync } from "fs";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new MultiModalConversation(configuration);

const result = await client.call({
  model: "wan2.6-t2i",
  messages: [
    {
      role: "user",
      content: [{ text: "以及那有静止窗户的花店，漂亮的木质门，摆放着花朵" }],
    },
  ],
  size: "1280*1280",
  n: 1,
  watermark: false,
});

if (result.status_code !== 200 || result.code) {
  throw new Error(result.message ?? `Request failed: ${result.status_code}`);
}

const resultUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;
if (!resultUrl) {
  throw new Error(`No image URL in response: ${JSON.stringify(result)}`);
}

console.log("model: wan2.6-t2i");
console.log("generated image URL:", resultUrl);

const imageResponse = await fetch(resultUrl);
writeFileSync(
  "output-wan-text-to-image.png",
  Buffer.from(await imageResponse.arrayBuffer()),
);
console.log("Saved to output-wan-text-to-image.png");
