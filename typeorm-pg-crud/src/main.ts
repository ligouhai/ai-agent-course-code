/*
 * @Date: 2026-07-15 10:12:19
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-15 11:37:13
 */
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
