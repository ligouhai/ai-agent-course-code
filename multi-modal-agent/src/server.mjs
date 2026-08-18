import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OSS from "ali-oss";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const ossClient = new OSS({
  region: "oss-cn-beijing",
  bucket: "agent-bucket-legalhigh",
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
});

app.get("/api/oss-post-policy", async (_req, res) => {
  try {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 1);

    const policy = ossClient.calculatePostSignature({
      expiration: expiration.toISOString(),
      conditions: [["content-length-range", 0, 104857600]],
    });

    const { location } = await ossClient.getBucketLocation();
    const host = `https://agent-bucket-legalhigh.${location}.aliyuncs.com`;

    res.json({ ...policy, host });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "生成 OSS 上传凭证失败" });
  }
});

app.use(express.static(path.join(__dirname, "../public")));

app.listen(3000, () => {
  console.log("OSS 上传页面: http://localhost:3000");
});
