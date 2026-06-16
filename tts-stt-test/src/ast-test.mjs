/*
 * @Date: 2026-06-12 16:30:36
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 09:52:29
 */
import "dotenv/config";
import fs from "node:fs";
import tencentcloud from "tencentcloud-sdk-nodejs";

const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;
const APP_ID = process.env.TENCENT_APP_ID;

const AsrClient = tencentcloud.asr.v20190614.Client;
const AUDIO_FILE_PATH = "./output.mp3";

const client = new AsrClient({
  credential: {
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
  },
  region: "ap-shanghai",
  profile: {
    httpProfile: {
      reqMethod: "POST",
      reqTimeout: 30,
    },
  },
});

async function run() {
  const audioBase64 = fs.readFileSync(AUDIO_FILE_PATH).toString("base64");

  const params = {
    EngSerViceType: "16k_zh",
    SourceType: 1,
    Data: audioBase64,
    DataLen: Buffer.byteLength(audioBase64),
    VoiceFormat: "mp3",
  };

  try {
    const response = await client.SentenceRecognition(params);
    console.log("识别结果：", response.Result);
  } catch (error) {
    console.error("识别失败：", error);
  }
}

run();
