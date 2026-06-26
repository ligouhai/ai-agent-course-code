import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// 固定加载 es-test/.env，不依赖 process.cwd()
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});
