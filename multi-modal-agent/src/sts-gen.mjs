/*
 * @Date: 2026-08-14 15:31:22
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-14 15:44:56
 */
import OSS from "ali-oss";
import "dotenv/config";

async function main() {
  const config = {
    region: "oss-cn-beijing",
    bucket: "agent-bucket-legalhigh",
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  };

  const client = new OSS(config);

  const date = new Date();

  date.setDate(date.getDate() + 1);

  const res = client.calculatePostSignature({
    expiration: date.toISOString(),
    conditions: [["content-length-range", 0, 104857600]],
  });

  console.log(res);

  const location = await client.getBucketLocation();
  const host = `https://${config.bucket}.${location.location}.aliyuncs.com`;

  console.log(host);
}

main();
