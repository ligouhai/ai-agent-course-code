/*
 * @Date: 2026-06-02 10:26:10
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-02 15:06:49
 */
import { forwardRef, Module } from '@nestjs/common';
import { JobAgentService } from 'src/ai/ai.job-agent.service';
import { ToolModule } from 'src/tool/tool.module';
import { JobService } from './job.service';

@Module({
  imports: [forwardRef(() => ToolModule)],
  providers: [JobService, JobAgentService],
  exports: [JobService],
})
export class JobModule {}
