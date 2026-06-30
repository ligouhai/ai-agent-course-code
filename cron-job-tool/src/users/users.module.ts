/*
 * @Date: 2026-06-01 17:08:25
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-01 17:58:33
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
