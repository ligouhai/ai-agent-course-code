/*
 * @Date: 2026-06-15 10:10:54
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 12:00:17
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as AsrClient } from 'tencentcloud-sdk-nodejs/tencentcloud/services/asr/v20190614/asr_client';
import { SpeechController } from './speech.controller';
import { SpeechService } from './speech.service';
import { TtsRelayService } from './tts-relay.service';
@Module({
  providers: [
    SpeechService,
    TtsRelayService,
    {
      provide: 'ASR_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new AsrClient({
          credential: {
            secretId: configService.getOrThrow<string>('TENCENT_SECRET_ID'),
            secretKey: configService.getOrThrow<string>('TENCENT_SECRET_KEY'),
          },
          region: 'ap-shanghai',
          profile: {
            httpProfile: {
              reqMethod: 'POST',
              reqTimeout: 30,
            },
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  controllers: [SpeechController],
  exports: [TtsRelayService],
})
export class SpeechModule {}
