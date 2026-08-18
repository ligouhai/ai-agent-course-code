/*
 * @Date: 2026-08-13 10:43:45
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-13 10:49:27
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import "dotenv/config";
import fs from "fs";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
  signatureVersion: "v4",
  region: "aaa",
});

async function putStream(objectKey, stream, contentType = "image/png") {
  try {
    const command = new PutObjectCommand({
      Bucket: "hello",
      Key: objectKey,
      Body: stream,
      ContentType: contentType,
    });
    await s3Client.send(command);
    console.log("上传成功");
  } catch (error) {
    console.error("上传失败", error);
    throw error;
  }
}

async function main() {
  const stream = fs.createReadStream("./avatar.png");
  await putStream("aaa/bbb/first.png", stream, "image/png");
}

main();
