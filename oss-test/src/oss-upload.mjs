import OSS from "ali-oss";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const client = new OSS({
  // yourregion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
  region: process.env.OSS_REGION,
  // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  authorizationV4: true,
  // 填写Bucket名称。
  bucket: process.env.OSS_BUCKET,
});

async function put() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const result = await client.put(
      "images/20260804-183440.jpg",
      path.join(__dirname, "20260804-183440.jpg"),
    );
    console.log(result);
  } catch (e) {
    console.log(e);
  }
}

put();
