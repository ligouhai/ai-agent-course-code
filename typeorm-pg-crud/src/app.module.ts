/*
 * @Date: 2026-07-15 10:12:19
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-15 10:53:42
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationsModule } from './conversations/conversations.module';
import { Conversation } from './conversations/entities/conversation.entity';
import { Message } from './conversations/entities/message.entity';
import { User } from './conversations/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: '123456',
      database: 'hello_pg',
      synchronize: true,
      logging: true,
      entities: [User, Conversation, Message],
    }),
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
