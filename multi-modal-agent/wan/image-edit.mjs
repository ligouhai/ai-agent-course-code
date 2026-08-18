import { Configuration, MultiModalConversation } from "dashscope-sdk-official";
import "dotenv/config";
import { writeFileSync } from "fs";
const imageUrl =
  "https://agent-bucket-legalhigh.oss-cn-beijing.aliyuncs.com/386e3620305e4fa3848ff40896cedcef.png";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new MultiModalConversation(configuration);

const result = await client.call({
  model: "wan2.7-image",
  messages: [
    {
      role: "user",
      content: [{ image: imageUrl }, { text: "将任务衣服的颜色改为黑色" }],
    },
  ],
  parameters: {
    size: "1K",
    n: 1,
    watermark: false,
  },
});

if (result.status_code !== 200 || result.code) {
  throw new Error(result.message ?? `Request failed: ${result.status_code}`);
}

const resultUrl = result.output?.choices?.[0]?.message?.content?.[0]?.image;
if (!resultUrl) {
  throw new Error(`No image URL in response: ${JSON.stringify(result)}`);
}

console.log("model: wan2.6-image");
console.log("edited image URL:", resultUrl);

const imageResponse = await fetch(resultUrl);
writeFileSync(
  "output-wan-image-edit.png",
  Buffer.from(await imageResponse.arrayBuffer()),
);
console.log("Saved to output-wan-image-edit.png");
