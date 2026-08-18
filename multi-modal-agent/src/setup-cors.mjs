import OSS from "ali-oss";
import "dotenv/config";

const client = new OSS({
  region: "oss-cn-beijing",
  bucket: "agent-bucket-legalhigh",
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
});

async function main() {
  await client.putBucketCORS("agent-bucket-legalhigh", [
    {
      allowedOrigin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      allowedMethod: ["GET", "POST", "PUT", "HEAD"],
      allowedHeader: ["*"],
      exposeHeader: ["ETag", "x-oss-request-id"],
      maxAgeSeconds: 3600,
    },
  ]);

  const rules = await client.getBucketCORS("agent-bucket-legalhigh");
  console.log("CORS 配置成功：", JSON.stringify(rules, null, 2));
}

main().catch(console.error);
