/*
 * @Date: 2026-06-16 10:24:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-16 14:31:40
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
