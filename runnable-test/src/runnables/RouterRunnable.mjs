/*
 * @Date: 2026-05-21 15:20:52
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-21 15:23:38
 */
import 'dotenv/config';
import { RouterRunnable, RunnableLambda } from '@langchain/core/runnables';

// 创建两个简单的 RunnableLambda
const toUpperCase = RunnableLambda.from((input) => input.toUpperCase());
const reverseString = RunnableLambda.from((input) =>
  input.split('').reverse().join('')
);

// 创建 RouterRunnable
const router = new RouterRunnable({
  runnables: {
    toUpperCase: toUpperCase,
    reverseString: reverseString
  }
});

// 测试：调用 reverseString
const result1 = await router.invoke({
  key: 'reverseString',
  input: 'Hello world'
});
console.log(result1);

// 测试：调用 toUpperCase
const result2 = await router.invoke({
  key: 'toUpperCase',
  input: 'Hello world'
});
console.log(result2);
