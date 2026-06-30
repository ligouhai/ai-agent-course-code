/*
 * @Date: 2026-06-16 10:28:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-16 15:14:07
 */
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { Inject, Injectable } from '@nestjs/common';
import { UIMessage } from 'ai';
import { AIMessageChunk, createAgent } from 'langchain';

@Injectable()
export class AiService {
  private readonly agent: ReturnType<typeof createAgent>;
  constructor(
    @Inject('WEB_SEARCH_TOOL')
    private readonly webSearchTool: StructuredToolInterface,
    @Inject('SEND_MAIL_TOOL')
    private readonly sendMailTool: StructuredToolInterface,
    @Inject('CHAT_MODEL') model: ChatOpenAI,
  ) {
    this.agent = createAgent({
      model,
      tools: [this.webSearchTool, this.sendMailTool],
      systemPrompt:
        '你是 AI 助手，需要最新消息、事实核查或者互联网信息时，请使用 web_search 工具进行搜索。',
    });
  }

  async stream(messages: UIMessage[]) {
    // 将 UI 消息转换为 LangChain 消息
    const lcMessages = await toBaseMessages(messages);
    // 流式执行 LangChain 代理
    const lgStream = await this.agent.stream(
      { messages: lcMessages },
      {
        streamMode: ['messages', 'values'],
        recursionLimit: 12,
      },
    );

    // 将 LangChain 消息转换为 UI 消息流
    return toUIMessageStream(lgStream as AsyncIterable<AIMessageChunk>);
  }
}
