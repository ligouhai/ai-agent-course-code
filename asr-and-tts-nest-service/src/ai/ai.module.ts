/*
 * @Date: 2026-06-15 09:55:55
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 10:05:39
 */
import { ChatOpenAI } from '@langchain/openai';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'CHAIN_MODEL',
      useFactory: (configService: ConfigService) => {
        return new ChatOpenAI({
          modelName: configService.getOrThrow<string>('MODEL_NAME'),
          apiKey: configService.getOrThrow<string>('OPENAI_API_KEY'),
          configuration: {
            baseURL: configService.getOrThrow<string>('OPENAI_BASE_URL'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AiModule {}
