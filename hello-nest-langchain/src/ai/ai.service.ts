/*
 * @Date: 2026-05-27 18:27:02
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-01 09:52:24
 */
import type { Runnable } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { Inject, Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
// import { ConfigService } from '@nestjs/config';
@Injectable()
export class AiService {
  private readonly chain: Runnable<{ query: string }, string>;

  // @Inject(ConfigService) configService: ConfigService;
  constructor(@Inject('CHAT_MODEL') model: ChatOpenAI) {
    const prompt = PromptTemplate.fromTemplate('请回答一下问题：\n\n${query}');

    // const modelName = configService.getOrThrow<string>('MODEL_NAME');
    // const apiKey = configService.getOrThrow<string>('OPENAI_API_KEY');
    // const baseURL = configService.getOrThrow<string>('OPENAI_BASE_URL');
    // cosnt model =  new ChatOpenAI({
    //   modelName,
    //   apiKey,
    //   configuration: {
    //     baseURL,
    //   },
    // });
    this.chain = prompt.pipe(model).pipe(new StringOutputParser());
  }

  async runChain(query: string): Promise<string> {
    return await this.chain.invoke({ query });
  }

  async *streamChain(query: string): AsyncGenerator<string> {
    const stream = await this.chain.stream({ query });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
