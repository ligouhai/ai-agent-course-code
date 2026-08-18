/*
 * @Date: 2026-08-13 09:32:59
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-13 09:39:39
 */

import fs from "fs";
import * as Minio from "minio";
const minioClient = new Minio.Client({
  endPoint: "localhost",
  port: 9000,
  useSSL: false,
  accessKey: "aS5o1FOTKGIuoiV7yGMC",
  secretKey: "0AyxlrsvGY11LfL2btAqua0LinatxyVqn2I2CHNt",
});

async function putStream() {
  try {
    const stream = fs.createReadStream("./avatar.png");
    const result = await minioClient.putObject(
      "aaa",
      "ccc/bbb/hello.png",
      stream,
    );
    console.log(result);
    console.log("上传成功");
  } catch (error) {
    console.log(error);
  }
}

putStream();
