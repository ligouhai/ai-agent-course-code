/*
 * @Date: 2026-05-27 18:27:02
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-28 15:16:53
 */
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => {
        const modelName = configService.getOrThrow<string>('MODEL_NAME');
        const apiKey = configService.getOrThrow<string>('OPENAI_API_KEY');
        const baseURL = configService.getOrThrow<string>('OPENAI_BASE_URL');
        return new ChatOpenAI({
          modelName,
          apiKey,
          configuration: {
            baseURL,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AiModule {}
