/*
 * @Date: 2026-05-21 15:04:25
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-21 15:09:04
 */
import 'dotenv/config';
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

const addOne = RunnableLambda.from((input) => input.num + 1);
const multiplyTwo = RunnableLambda.from((input) => input.num * 2);
const square = RunnableLambda.from((input) => input.num * input.num);

const greetTemplate = PromptTemplate.fromTemplate('你好, {name}!');
const weatherTemplate = PromptTemplate.fromTemplate('今天天气{weather}');

// 创建 RunnableMap,并执行多个 runnable
const runnableMap = RunnableMap.from({
  add: addOne,
  multiply: multiplyTwo,
  square: square,
  greeting: greetTemplate,
  weather: weatherTemplate
});

const result = await runnableMap.invoke({
  name: '神光',
  weather: '多云',
  num: 5
});

console.log(result);
