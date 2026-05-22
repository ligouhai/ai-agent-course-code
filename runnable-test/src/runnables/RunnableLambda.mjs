/*
 * @Date: 2026-05-21 15:01:36
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-21 15:03:31
 */
import 'dotenv/config';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';

const addOne = RunnableLambda.from((input) => {
  console.log('输入：' + input);
  return input + 1;
});

const multiplyByTwo = RunnableLambda.from((input) => {
  console.log('输入：' + input);
  return input * 2;
});

const chain = RunnableSequence.from([addOne, multiplyByTwo, addOne]);

const result = await chain.invoke(5);

console.log(result);
