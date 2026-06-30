/*
 * @Date: 2026-06-15 09:56:15
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 11:28:35
 */
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const AI_TTS_STREAM_EVENT = 'ai.tts.stream';

export interface AiTtsStreamEvent {
  type: 'chunk' | 'end';
  sessionId: string;
  chunk?: string;
}

@Injectable()
export class AiService {
  private readonly chain: Runnable<{ query: string }, string>;

  constructor(
    @Inject('CHAIN_MODEL') model: ChatOpenAI,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const prompt = PromptTemplate.fromTemplate('请回答一下问题：\n\n${query}');

    this.chain = prompt.pipe(model).pipe(new StringOutputParser());
  }

  async *streamChain(
    query: string,
    ttsSessionId?: string,
  ): AsyncGenerator<string> {
    const stream = await this.chain.stream({ query });
    for await (const chunk of stream) {
      if (ttsSessionId) {
        const event: AiTtsStreamEvent = {
          type: 'chunk',
          sessionId: ttsSessionId,
          chunk,
        };
        this.eventEmitter.emit(AI_TTS_STREAM_EVENT, event);
      }
      yield chunk;
    }
  }
}
