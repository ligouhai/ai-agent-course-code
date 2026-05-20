/*
 * @Date: 2026-05-20 11:51:13
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-20 14:51:45
 */
import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { SemanticSimilarityExampleSelector } from '@langchain/core/example_selectors';
import { Milvus } from '@langchain/community/vectorstores/milvus';

const COLLECTION_NAME =
  process.env.MILVUS_COLLECTION_NAME ?? 'weekly_report_examples';
const VECTOR_DIM = 1024;
// 1.初始化 Chat 模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

// 2.初始化 Embeddings 模型
const embeddings = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDINGS_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  },
  dimension: VECTOR_DIM
});

// 3. 定义单条示例 Prompt 模板
const examplePrompt = PromptTemplate.fromTemplate(
  `用户需求：{scenario}
    生成的周报片段：
    {report_snippet}
    ---`
);

// 4. 连接 Milvus，并给予已存在的集合创建向量库
const milvusAddress = process.env.MILVUS_ADDRESS ?? 'localhost:19530';
const vectorStore = await Milvus.fromExistingCollection(embeddings, {
  clientConfig: {
    address: milvusAddress
  },
  collectionName: COLLECTION_NAME,
  indexCreateOptions: {
    index_type: 'IVF_FLAT',
    metric_type: 'COSINE',
    params: {
      nlist: 1024
    },
    search_params: {
      nprobe: 10
    }
  }
});

const exampleSelector = new SemanticSimilarityExampleSelector({
  vectorStore,
  k: 2
});

// 5.用 selector 构建 FewShotPromptTemplate
const fewShotPrompt = new FewShotPromptTemplate({
  examplePrompt,
  exampleSelector,
  prefix:
    '下面是一些不同类型的周报示例，你可以从中学习语气和结构（系统会自动从 Milvus 选出和当前场景最相近的示例）：\n',
  suffix:
    '\n\n现在请根据上面的示例风格，为下面这个场景写一份新的周报：\n' +
    '场景描述：{current_scenario}\n' +
    '请输出一份适合发给老板和团队同步的 Markdown 周报草稿。',
  inputVariables: ['current_scenario']
});

// 6.演示：给定几个不同的场景描述，让 selector 选出最相近的示例
const currentScenario1 =
  '我们本周主要是在清理历史技术债：重构老旧的订单模块、补齐核心接口的单测，' +
  '同时也完善了一些文档，方便后面新人接手。整体没有对外大范围发布的新功能。';

const currentScenario2 =
  '本周完成新一代运营看板的首批功能上线，重点打通埋点和实时数仓链路，' +
  '并面向运营和市场同学做了多场宣讲，希望更多同学开始使用新能力。';

console.log('\n===== 场景 1：技术债清理为主 =====\n');
const result1 = await fewShotPrompt.format({
  current_scenario: currentScenario1
});
console.log(result1);

console.log('\n\n===== 场景 2：新功能首发 + 对外宣传 =====\n');
const result2 = await fewShotPrompt.format({
  current_scenario: currentScenario2
});
console.log(result2);
