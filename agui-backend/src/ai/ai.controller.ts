/*
 * @Date: 2026-06-16 10:28:21
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-16 11:13:50
 */
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UIMessage, pipeUIMessageStreamToResponse } from 'ai';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
 本地测试：
 curl -N -sS -X POST 'http://localhost:3000/ai/chat' \
 -H 'Content-Type: application/json' \
 -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"北京今天的天气"}]}]}'
*/
  @Post('chat')
  async postChat(
    @Body() body: { messages?: UIMessage[] },
    @Res() res: Response,
  ): Promise<void> {
    if (!body?.messages || !Array.isArray(body.messages)) {
      throw new BadRequestException('Invalid JSON');
    }

    const stream = await this.aiService.stream(body.messages);
    pipeUIMessageStreamToResponse({
      response: res,
      stream,
    });
  }
}
