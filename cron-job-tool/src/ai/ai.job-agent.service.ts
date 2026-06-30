import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { Inject, Injectable, Logger } from '@nestjs/common';

/*
 * @Date: 2026-06-02 15:00:48
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-02 15:06:21
 */
@Injectable()
export class JobAgentService {
  private readonly logger = new Logger(JobAgentService.name);
  private readonly modelWithTools: Runnable<BaseMessage[], AIMessage>;

  constructor(
    @Inject('CHAT_MODEL') model: ChatOpenAI,
    @Inject('SEND_MAIL_TOOL') private readonly sendMailTool: any,
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: any,
    @Inject('DB_USERS_CRUD_TOOL') private readonly dbUsersCrudTool: any,
    @Inject('TIME_NOW_TOOL') private readonly timeNowTool: any,
  ) {
    this.modelWithTools = model.bindTools([
      this.sendMailTool,
      this.webSearchTool,
      this.dbUsersCrudTool,
      this.timeNowTool,
    ]);
  }

  async runJob(instruction: string): Promise<string> {
    const messages: BaseMessage[] = [
      new SystemMessage(
        '你是一个智能助手，可以在需要时调用工具（如 send_mail）来发送邮件，再用结果回答用户的问题。',
      ),
      new HumanMessage(instruction),
    ];
    while (true) {
      const aiMessage = await this.modelWithTools.invoke(messages);
      messages.push(aiMessage);

      const toolCalls = aiMessage.tool_calls ?? [];
      if (!toolCalls.length) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return String(aiMessage.content ?? '');
      }
      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id || '';
        const toolCallName = toolCall.name;
        if (toolCallName === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args);
          messages.push(
            new ToolMessage({
              name: toolCallName,
              content: result,
              tool_call_id: toolCallId,
            }),
          );
        } else if (toolCallName === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args);
          messages.push(
            new ToolMessage({
              name: toolCallName,
              content: result,
              tool_call_id: toolCallId,
            }),
          );
        } else if (toolCallName === 'db_users_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args);
          messages.push(
            new ToolMessage({
              name: toolCallName,
              content: result,
              tool_call_id: toolCallId,
            }),
          );
        } else if (toolCallName === 'time_now') {
          const result = await this.timeNowTool.invoke();
          messages.push(
            new ToolMessage({
              name: toolCallName,
              content: result,
              tool_call_id: toolCallId,
            }),
          );
        } else {
          this.logger.error(`未知工具调用: ${toolCallName}`);
        }
      }
    }
  }
}
