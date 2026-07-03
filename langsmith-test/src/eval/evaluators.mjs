/*
 * @Date: 2026-07-03 14:35:34
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-03 14:53:26
 */

import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import {
  createLLMAsJudge,
  RAG_GROUNDEDNESS_PROMPT,
  RAG_HELPFULNESS_PROMPT,
  RAG_RETRIEVAL_RELEVANCE_PROMPT,
} from "openevals";
const judge = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// RAG_GROUNDEDNESS_PROMPT -- 忠实度：答案是否被检索上下文支撑，有无幻觉
const ragGroundednessJudge = createLLMAsJudge({
  prompt: RAG_GROUNDEDNESS_PROMPT,
  feedbackKey: "rag_groundedness",
  judge,
  continuous: true,
});

// 回答有用性
const ragHelpfulnessJudge = createLLMAsJudge({
  prompt: RAG_HELPFULNESS_PROMPT,
  feedbackKey: "rag_helpfulness",
  judge,
  continuous: true,
});

// RAG_RETRIEVAL_RELEVANCE_PROMPT -- 检索相关性：检索结果是否与问题相关
const ragRelevancyJudge = createLLMAsJudge({
  prompt: RAG_RETRIEVAL_RELEVANCE_PROMPT,
  feedbackKey: "rag_retrieval_relevance",
  judge,
  continuous: true,
});

export async function ragGroundednessEvaluator({ outputs }) {
  return ragGroundednessJudge({
    context: { documents: outputs.context },
    outputs: { answer: outputs.answer },
  });
}

export async function ragHelpfulnessEvaluator({ inputs, outputs }) {
  return ragHelpfulnessJudge({
    outputs: { answer: outputs.answer },
    inputs,
  });
}

export async function ragRelevancyEvaluator({ inputs, outputs }) {
  return ragRelevancyJudge({
    context: { documents: outputs.context },
    inputs,
  });
}

export const evaluators = [
  ragGroundednessEvaluator,
  ragHelpfulnessEvaluator,
  ragRelevancyEvaluator,
];
