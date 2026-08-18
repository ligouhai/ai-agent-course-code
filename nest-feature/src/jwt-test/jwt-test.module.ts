/*
 * @Date: 2026-08-11 11:42:40
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-12 10:36:12
 */
import { Module } from '@nestjs/common';
import { JwtTestController } from './jwt-test.controller';
import { JwtTestService } from './jwt-test.service';

@Module({
  controllers: [JwtTestController],
  providers: [JwtTestService],
})
export class JwtTestModule {}
