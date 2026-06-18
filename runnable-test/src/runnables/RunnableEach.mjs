/*
 * @Date: 2026-05-21 15:34:21
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-17 16:09:58
 */
import 'dotenv/config';
import {
  RunnableEach,
  RunnableLambda,
  RunnableSequence
} from '@langchain/core/runnables';

const toUpperCase = RunnableLambda.from((input) => input.toUpperCase());
const addGreeting = RunnableLambda.from((input) => `Hello, ${input}`);
const addGoodbye = RunnableLambda.from((input) => `Goodbye, ${input}`);

const processItem = RunnableSequence.from([
  toUpperCase,
  addGreeting,
  addGoodbye
]);

const chain = new RunnableEach({
  bound: processItem
});
const input = ['alice', 'bob', 'carol'];
const result = await chain.invoke(input);

console.log('✅ RunnableEach - 数组元素处理:');
console.log('输入:', input);
console.log('输出:', result);
