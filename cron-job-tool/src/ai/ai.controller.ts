/*
 * @Date: 2026-05-29 10:37:41
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-29 11:40:38
 */
import { Controller, Get, Query, Sse, MessageEvent } from '@nestjs/common';
import { AiService } from './ai.service';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}
  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query);
    return { answer };
  }
  @Sse('chat/stream')
  chatStream(@Query('query') query: string): Observable<MessageEvent> {
    return from(this.aiService.runStreamChain(query)).pipe(
      map((chunk) => ({ data: chunk })),
    );
  }
}
