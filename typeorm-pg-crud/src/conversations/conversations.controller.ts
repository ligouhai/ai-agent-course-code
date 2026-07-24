/*
 * @Date: 2026-07-15 10:16:20
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-15 11:36:26
 */
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SemanticSearchDto } from './dto/semantic-search.dto';
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('users/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.conversationsService.findConversationsByUserId(userId);
  }

  @Get(':id/messages')
  findMessages(@Param('id', ParseIntPipe) id: number) {
    return this.conversationsService.findMessagesByConversationId(id);
  }

  @Post(':id/search')
  searchSimilarMessages(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SemanticSearchDto,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) queryLimit?: number,
  ) {
    const limit = dto.limit ?? queryLimit ?? 5;
    return this.conversationsService.searchSimilarMessages(
      id,
      dto.query,
      limit,
    );
  }
}
