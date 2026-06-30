/*
 * @Date: 2026-06-02 14:51:43
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-02 14:51:45
 */
import { ChatOpenAI } from '@langchain/openai';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  getModel() {
    return new ChatOpenAI({
      model: this.configService.get('MODEL_NAME'),
      apiKey: this.configService.get('OPENAI_API_KEY'),
      configuration: {
        baseURL: this.configService.get('OPENAI_BASE_URL'),
      },
    });
  }
}
