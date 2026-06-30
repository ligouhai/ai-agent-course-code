/*
 * @Date: 2026-06-16 10:28:11
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-16 15:16:00
 */
import { tool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import z from 'zod';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { MailerService } from '@nestjs-modules/mailer';
@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => {
        return new ChatOpenAI({
          modelName: configService.getOrThrow<string>('MODEL_NAME'),
          apiKey: configService.getOrThrow<string>('OPENAI_API_KEY'),
          configuration: {
            baseURL: configService.getOrThrow<string>('OPENAI_BASE_URL'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'WEB_SEARCH_TOOL',
      useFactory: (configService: ConfigService) => {
        const webSearchArgsSchema = z.object({
          query: z
            .string()
            .min(1)
            .describe('搜索关键词，例如：公司年报、某个事件等'),
          count: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('返回的搜索结果数量，默认 10 条'),
        });
        return tool(
          async ({ query, count }: { query: string; count?: number }) => {
            const apiKey = configService.getOrThrow<string>('BOCHA_API_KEY');
            if (!apiKey) {
              return 'Bocha Web Search 的 API Key 未配置（环境变量 BOCHA_API_KEY），请先在服务端配置后再重试。';
            }
            const url = 'https://api.bochaai.com/v1/web-search';
            const body = {
              query,
              freshness: 'noLimit',
              summary: true,
              count: count ?? 10,
            };
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            });
            if (!response.ok) {
              return `搜索 API 请求失败，状态码: ${response.status}, 错误信息: ${response.statusText}`;
            }
            let json: {
              code: number;
              data: {
                webPages: {
                  value: {
                    name: string;
                    url: string;
                    summary: string;
                  }[];
                };
              };
              msg: string;
            };
            try {
              json = await response.json();
            } catch (e) {
              return `搜索 API 请求失败，原因是：搜索结果解析失败 ${(e as Error).message}`;
            }

            try {
              if (json.code !== 200 || !json.data) {
                return `搜索 API 请求失败，原因是: ${json.msg ?? '未知错误'}`;
              }

              const webpages = json.data.webPages?.value ?? [];
              if (!webpages.length) {
                return '未找到相关结果。';
              }
              const formatted = webpages
                .map(
                  (page: any, idx: number) =>
                    `引用: ${idx + 1}
                    标题: ${page.name}
                    URL: ${page.url}
                    摘要: ${page.summary}
                    网站名称: ${page.siteName}
                    网站图标: ${page.siteIcon}
                    发布时间: ${page.dateLastCrawled}`,
                )
                .join('\n\n');
              return formatted;
            } catch (error) {
              return `搜索 API 请求失败，原因是：搜索结果解析失败 ${(error as Error).message}`;
            }
          },
          {
            name: 'web_search',
            description:
              '使用 Bocha Web Search API 搜索互联网网页。输入为搜索关键词（可选 count 指定结果数量），返回包含标题、URL、摘要、网站名称、图标和时间等信息的结果列表。',
            schema: webSearchArgsSchema,
          },
        );
      },
      inject: [ConfigService],
    },
    {
      provide: 'SEND_MAIL_TOOL',
      useFactory: (
        configService: ConfigService,
        mailerService: MailerService,
      ) => {
        const sendMailArgsSchema = z.object({
          to: z
            .string()
            .email()
            .describe('收件人邮箱地址，例如：someone@example.com'),
          subject: z.string().describe('邮件主题'),
          text: z.string().optional().describe('纯文本内容，可选'),
          html: z.string().optional().describe('HTML 内容，可选'),
        });
        return tool(
          async ({
            to,
            subject,
            text,
            html,
          }: {
            to: string;
            subject: string;
            text: string;
            html: string;
          }) => {
            const fallbackFrom = configService.get<string>('MAIL_FROM');

            await mailerService.sendMail({
              to,
              subject,
              text: text ?? '（无文本内容）',
              html: html ?? `<p>${text ?? '（无 HTML 内容）'}</p>`,
              from: fallbackFrom,
            });
            return `邮件已发送到 ${to}，主题为「${subject}」`;
          },
          {
            name: 'send_mail',
            description:
              '发送电子邮件。需要提供收件人邮箱、主题，可选文本内容和 HTML 内容。',
            schema: sendMailArgsSchema,
          },
        );
      },
      inject: [ConfigService, MailerService],
    },
  ],
})
export class AiModule {}
