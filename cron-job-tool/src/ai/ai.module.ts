/*
 * @Date: 2026-05-29 10:37:41
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-02 14:57:13
 */
import { tool } from '@langchain/core/tools';
import { Module } from '@nestjs/common';
import { ToolModule } from 'src/tool/tool.module';
import { UsersModule } from 'src/users/users.module';
import z from 'zod';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { UserService } from './user.service';
@Module({
  imports: [UsersModule, ToolModule],
  controllers: [AiController],
  providers: [
    AiService,
    UserService,

    {
      provide: 'QUERY_USER_TOOL',
      useFactory: (userService: UserService) => {
        const queryUserArgSchema = z.object({
          userId: z.string().describe('用户ID，例如：001，002，003'),
        });

        return tool(
          ({ userId }: { userId: string }) => {
            const user = userService.findOne(userId);
            if (!user) {
              const availableIds = userService
                .findAll()
                .map((user) => user.id)
                .join(', ');
              return `用户 ID${userId} 不存在。可用 ID: ${availableIds}`;
            }
            return `用户信息：\n- ID: ${userId}\n- 姓名: ${user.name}\n- 邮箱: ${user.email}\n- 角色: ${user.role}`;
          },
          {
            name: 'query_user',
            description:
              '查询数据库中的用户信息。输入用户 ID，返回该用户的详细信息（姓名、邮箱、角色）。',
            schema: queryUserArgSchema,
          },
        );
      },
      inject: [UserService],
    },
  ],
})
export class AiModule {}
