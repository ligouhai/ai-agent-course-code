/*
 * @Date: 2026-03-10 14:25:43
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-04-10 15:34:44
 */
import { spawn } from "node:child_process";

const command = "ls -la";
const cwd = process.cwd();

const [cmd, ...args] = command.split(" ");

const child = spawn(cmd, args, { cwd, shell: true, stdio: "inherit" });

let errorMessage = "";
child.on("error", (error) => {
  errorMessage = error.message;
});

child.on("close", (code) => {
  if (code === 0) {
    process.exit(0);
  } else {
    if (errorMessage) {
      console.error(errorMessage);
    }
    process.exit(code || 1);
  }
});
