/*
 * @Date: 2026-06-15 09:56:08
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 15:22:40
 */
import { Controller, Query, Sse } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, from, map } from 'rxjs';
import {
  AI_TTS_STREAM_EVENT,
  type AiTtsStreamEvent,
} from 'src/common/stream-events';
import { AiService } from './ai.service';
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Sse('chat/stream')
  chatStream(
    @Query('query') query: string,
    @Query('ttsSessionId') ttsSessionId?: string,
  ): Observable<{ data: string }> {
    const sessionId = ttsSessionId?.trim();
    if (sessionId) {
      const startEvent: AiTtsStreamEvent = {
        type: 'start',
        sessionId,
        query,
      };
      this.eventEmitter.emit(AI_TTS_STREAM_EVENT, startEvent);
    }
    return from(this.aiService.streamChain(query, sessionId)).pipe(
      map((chunk) => ({ data: chunk })),
    );
  }
}
