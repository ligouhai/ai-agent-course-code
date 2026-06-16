import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tencentcloud from "tencentcloud-sdk-nodejs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const secretId = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;

const TtsClient = tencentcloud.tts.v20190823.Client;

const client = new TtsClient({
  credential: {
    secretId,
    secretKey,
  },
  region: "ap-beijing",
  profile: {
    httpProfile: {
      endpoint: "tts.tencentcloudapi.com",
    },
  },
});

const params = {
  Text: "下班路上，我还在为晚霞开心。突然电话响起：系统崩了。我的心一下揪紧，冲进办公室时几乎要绝望。可当大家一起排查、重启，屏幕终于恢复正常，我长长松了口气，笑着说：还好，我们没放弃。", // 要合成的文本
  SessionId: "session-001", // 会话ID
  VoiceType: 502006, // 101007：智瑜（女声）
  Codec: "mp3", // 音频格式
};

try {
  const result = await client.TextToVoice(params);
  const audioBuffer = Buffer.from(result.Audio, "base64");
  const outputPath = path.join(__dirname, "output.mp3");
  fs.writeFileSync(outputPath, audioBuffer);
  console.log("mp3文件已保存到：", outputPath);
} catch (error) {
  console.error("语音合成失败：", error.message);
}
