/*
 * @Date: 2026-05-19 15:41:24
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-19 15:49:24
 */
import {
  PromptTemplate,
  PipelinePromptTemplate
} from '@langchain/core/prompts';
import { personPrompt, contextPrompt } from './pipeline-prompt-template.mjs';

// 示例：复用[ 人设+背景]模块，用于一个“季度 OKR 回顾邮件”场景

// 1.本场景自己的任务说明模块

const okrReviewTaskPrompt = PromptTemplate.fromTemplate(`
以下是本季度与你所在团队相关的关键事实与数据（OKR 进展、重要事件等）：
{okr_facts}

请你基于这些信息，整理一份发给 {manager_name} 的【季度 OKR 回顾邮件】，重点包含：
1. 本季度整体达成情况（相对 OKR 的完成度）
2. 关键成果与亮点
3. 暴露出的主要问题 / 风险
4. 下季度的改进方向与优先级建议
  `);

// 2.本场景自己的格式要求模块
const okrReviewFormatPrompt = PromptTemplate.fromTemplate(`
请用 Markdown 输出季度 OKR 回顾邮件，结构包含：
1. 邮件开头（1-2 句话的问候 + 本邮件目的）
2. 本季度整体概览
3. 逐条 OKR 的回顾（可分小节）
4. 主要问题 / 风险
5. 下季度计划与请求支持

语气保持专业、克制但真诚，既让老板看到成绩，也能感受到你在主动暴露问题、寻求改进。
  `);

// 3.用 PipelinePromptTemplate 组合模块
const okrReviewPipeline = new PipelinePromptTemplate({
  pipelinePrompts: [
    {
      name: 'person_prompt', // 复用人设
      prompt: personPrompt
    },
    {
      name: 'context_prompt', // 复用背景
      prompt: contextPrompt
    },
    {
      name: 'okr_review_task_prompt',
      prompt: okrReviewTaskPrompt
    },
    {
      name: 'okr_review_format_prompt',
      prompt: okrReviewFormatPrompt
    }
  ],
  finalPrompt: PromptTemplate.fromTemplate(`
    {person_prompt}
    {context_prompt}
    {okr_review_task_prompt}
    {okr_review_format_prompt}
  `),
  inputVariables: [
    'tone',
    'company_name',
    'department_name',
    'manager_name',
    'week_range',
    'team_goal',
    'okr_facts'
  ]
});

// 4. 示例：构造一个季度 OKR 回顾场景的 Prompt
const promptForReview = await okrReviewPipeline.format({
  tone: '专业、真诚、偏书面表达',
  company_name: '星航科技',
  department_name: 'AI 平台组',
  manager_name: '王总',
  week_range: '2025 Q1',
  team_goal: '支撑公司核心 AI 能力建设，完成三大基础平台的落地与稳定运行。',
  okr_facts:
    '- O1：完成在线特征平台的 V1 上线，覆盖 3 条核心业务链路；\n' +
    '- O2：训练并上线新一代推荐模型，首页 CTR 提升 6.3%；\n' +
    '- O3：推动 GPU 资源利用率优化项目，整体利用率从 42% 提升到 67%；\n' +
    '- 重要事件：一次线上 P1 事故，一次跨部门联合专项；\n' +
    '- 团队：新增 2 位同学，整体人效相比去年同期提升约 18%。'
});

console.log('季度 OKR 回顾邮件 Prompt：\n');
console.log(promptForReview);
