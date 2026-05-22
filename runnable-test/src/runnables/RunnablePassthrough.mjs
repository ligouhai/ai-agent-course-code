/*
 * @Date: 2026-05-21 15:24:09
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-21 15:31:43
 */
import 'dotenv/config';
import {
  RunnablePassthrough,
  RunnableLambda,
  RunnableSequence,
  RunnableMap
} from '@langchain/core/runnables';

// const chain = RunnableSequence.from([
//   RunnableLambda.from((input) => ({ concept: input })),
//   RunnableMap.from({
//     original: new RunnablePassthrough(),
//     processed: RunnableLambda.from((obj) => ({
//       concept: input,
//       upper: obj.concept.toUpperCase(),
//       length: obj.concept.length
//     }))
//   })
// ]);

const chain = RunnableSequence.from([
  (input) => ({ concept: input }),
  RunnablePassthrough.assign({
    original: new RunnablePassthrough(),
    processed: (obj) => ({
      concept: input,
      upper: obj.concept.toUpperCase(),
      length: obj.concept.length
    })
  })
]);

const input = '神说要有光';
const result = await chain.invoke(input);
console.log(result);
