/*
 * @Date: 2026-07-15 10:16:20
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-15 11:42:54
 */
import { OpenAIEmbeddings } from '@langchain/openai';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { User } from './entities/user.entity';
export interface SemanticSearchResult {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: Date;
  similarity: number;
}

@Injectable()
export class ConversationsService {
  private embeddings: OpenAIEmbeddings | null = null;

  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  // 用户 → 会话 （一对多）
  async findConversationsByUserId(userId: number) {
    const user = await this.em.findOneOrFail(User, {
      where: { id: userId },
      relations: { conversations: true },
      order: { conversations: { createdAt: 'DESC' } },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // 会话 → 消息 （一对多）
  async findMessagesByConversationId(conversationId: number) {
    const conversation = await this.em.findOneOrFail(Conversation, {
      where: { id: conversationId },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
  }

  // 会话内语义检索（pgvector 余弦距离）

  async searchSimilarMessages(
    conversationId: number,
    searchText: string,
    limit = 5,
  ) {
    const conversation = await this.em.findOneOrFail(Conversation, {
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const vector = await this.embedQuery(searchText);

    const rows: SemanticSearchResult[] = await this.em.query(
      `
      SELECT id, conversation_id, role, content, created_at,
        1 - (embedding <=> $1::vector) AS similarity
      FROM messages
      WHERE conversation_id = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector 
      LIMIT $3
      `,
      [JSON.stringify(vector), conversationId, limit],
    );

    return rows.map((row) => ({
      ...row,
      similarity: Number(row.similarity),
    }));
  }

  private getEmbeddings(): OpenAIEmbeddings {
    if (!this.embeddings) {
      if (!process.env.OPENAI_API_KEY) {
        throw new BadRequestException(
          '语义检索需要配置 OPENAI_API_KEY (与 pgsql-test 相同)',
        );
      }
      this.embeddings = new OpenAIEmbeddings({
        model:
          process.env.EMBEDDINGS_MODEL_NAME ||
          process.env.EMBEDDING_MODEL ||
          'text-embedding-v3',
        apiKey: process.env.OPENAI_API_KEY,
        configuration: {
          baseURL: process.env.OPENAI_BASE_URL,
        },
      });
    }
    return this.embeddings;
  }

  private embedQuery(query: string): Promise<number[]> {
    return this.getEmbeddings().embedQuery(query);
  }
}
