/*
 * @Date: 2026-05-27 18:27:02
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-28 14:56:42
 */
import { Controller, Get, Query, Sse } from '@nestjs/common';
import { AiService } from './ai.service';
import { Observable, from, map } from 'rxjs';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query);

    return { answer };
  }

  @Sse('chat/stream')
  chatStream(@Query('query') query: string): Observable<{ data: string }> {
    return from(this.aiService.streamChain(query)).pipe(
      map((chunk) => ({ data: chunk })),
    );
  }
}
