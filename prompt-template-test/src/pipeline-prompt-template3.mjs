/*
 * @Date: 2026-05-19 16:29:13
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-19 16:43:58
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  PipelinePromptTemplate,
  PromptTemplate,
  ChatPromptTemplate
} from '@langchain/core/prompts';
import { personPrompt, contextPrompt } from './pipeline-prompt-template.mjs';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
});

// A. 本场景自己的任务说明模块
const weeklyTaskPrompt = PromptTemplate.fromTemplate(
  `以下是本周与你所在团队相关的关键事实与数据（Git / Jira / 运维等）：
    {dev_activities}
    
    请你基于这些信息，帮我生成一份【技术周报】，重点包含：
    1. 本周整体达成情况
    2. 关键成果与亮点
    3. 主要问题 / 风险
    4. 下周的改进方向与优先级建议
    `
);

// B. 本场景自己的格式要求模块
const weeklyFormatPrompt = PromptTemplate.fromTemplate(
  `请用 Markdown 写这份周报，结构建议为：
    1. 本周概览（2-3 句话）
    2. 详细拆分（按项目或模块分段）
    3. 关键指标表格（字段示例：模块 / 亮点 / 风险 / 下周计划）
    
    语气要求：{tone}，既专业清晰，又适合发给老板并抄送团队。`
);

// C. 最终的 ChatPromptTemplate: 接受由 Pipeline 拼好的几块内容
const finalChatPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    '你是一名资深工程团队负责人，擅长用结构化、易读的方式写技术周报。写作风格要求：{tone}。请根据后续用户提供的信息，帮他生成一份适合给老板和团队同时抄送的周报草稿。'
  ],
  [
    'human',
    `人设与写作风格：
    {persona_prompt}
    
    本周背景信息：
    {context_prompt}
    
    本周任务说明：
    {weekly_task_prompt}
    
    输出格式要求：
    {weekly_format_prompt}

    现在请基于以上信息，直接输出最终的周报结果
    `
  ]
]);

const weeklyChatPipelinePrompt = new PipelinePromptTemplate({
  pipelinePrompts: [
    {
      name: 'persona_prompt',
      prompt: personPrompt
    },
    {
      name: 'context_prompt',
      prompt: contextPrompt
    },
    {
      name: 'weekly_task_prompt',
      prompt: weeklyTaskPrompt
    },
    {
      name: 'weekly_format_prompt',
      prompt: weeklyFormatPrompt
    }
  ],
  finalPrompt: finalChatPrompt,
  inputVariables: [
    'tone',
    'company_name',
    'department_name',
    'manager_name',
    'week_range',
    'team_goal',
    'dev_activities'
  ]
});

// E.示例：构造一份消息数组并喂给 Chat 模型
const promptValue = await weeklyChatPipelinePrompt.formatPromptValue({
  tone: '专业、清晰、略带鼓励',
  company_name: '星航科技',
  team_name: 'AI 平台组',
  manager_name: '王总',
  week_range: '2025-05-12 ~ 2025-05-18',
  team_goal: '完成周报自动生成能力的灰度验证，并收集团队反馈。',
  dev_activities:
    '- Git：本周合并 4 个主要特性分支，包含 Prompt 配置化和日志观测优化\n' +
    '- Jira：关闭 9 个 Story / 5 个 Bug，新增 2 个 TechDebt 任务\n' +
    '- 运维：本周线上 P1 事故 0 起，P2 1 起（由配置变更引起，已完成复盘）\n' +
    '- 其他：完成与数据平台、运维平台两次联合评审会议'
});

console.log('Pipeline + ChatPromptTemplate 生成的消息:');
console.log(promptValue.toChatMessages());
