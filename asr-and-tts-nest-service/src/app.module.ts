/*
 * @Date: 2026-06-15 09:53:52
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-15 10:37:13
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpeechModule } from './speech/speech.module';
@Module({
  imports: [
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot({
      maxListeners: 200,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    SpeechModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
