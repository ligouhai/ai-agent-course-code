/*
 * @Date: 2026-06-02 10:26:27
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-02 15:18:20
 */
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { JobAgentService } from 'src/ai/ai.job-agent.service';
import { EntityManager } from 'typeorm';
import { Job } from './entities/job.entity';

/**
 * 定时任务业务服务：负责任务的持久化（数据库）与运行时调度（内存）两层协作。
 *
 * - 持久层：Job 实体存 instruction、cron/at/everyMs、isEnabled 等配置
 * - 运行时：通过 SchedulerRegistry 注册 cron / interval / timeout，真正触发执行
 * - 应用启动时会恢复所有 isEnabled=true 的任务到调度器
 */
@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  /** TypeORM 实体管理器，用于读写 Job 表 */
  @Inject(EntityManager)
  private readonly entityManager: EntityManager;

  /** Nest 调度注册表：统一管理本进程内所有 cron / interval / timeout 句柄 */
  @Inject(SchedulerRegistry)
  private readonly schedulerRegistry: SchedulerRegistry;

  @Inject(JobAgentService)
  private readonly jobAgentService: JobAgentService;

  /**
   * 应用启动钩子：从数据库加载已启用的任务，若尚未在注册表中则启动调度。
   * 避免重启后“库里有任务、内存里没跑”的状态不一致。
   */
  async onApplicationBootstrap() {
    const enabledJobs = await this.entityManager.find(Job, {
      where: { isEnabled: true },
    });

    const cronJobs = this.schedulerRegistry.getCronJobs();
    const intervals = this.schedulerRegistry.getIntervals();
    const timeouts = this.schedulerRegistry.getTimeouts();

    for (const job of enabledJobs) {
      // 按类型判断该 job.id 是否已在对应注册表中，防止重复注册
      const alreadyRegistered =
        (job.type === 'cron' && cronJobs.has(job.id)) ||
        (job.type === 'every' && intervals.includes(job.id)) ||
        (job.type === 'at' && timeouts.includes(job.id));
      if (alreadyRegistered) {
        continue;
      }

      await this.startRuntime(job);
    }
  }

  /** 查询全部任务，并附带 running 字段表示当前进程内是否正在调度 */
  async listJobs() {
    const jobs = await this.entityManager.find(Job, {
      order: {
        createdAt: 'DESC',
      },
    });

    const cronJobs = this.schedulerRegistry.getCronJobs();
    const intervals = this.schedulerRegistry.getIntervals();
    const timeouts = this.schedulerRegistry.getTimeouts();

    return jobs.map((job) => {
      // running：库中启用 且 注册表里存在同名 id 的调度句柄
      const running =
        (job.isEnabled && job.type === 'cron' && cronJobs.has(job.id)) ||
        (job.type === 'every' && intervals.includes(job.id)) ||
        (job.type === 'at' && timeouts.includes(job.id));

      return {
        ...job,
        running,
      };
    });
  }

  /**
   * 新增任务：先落库，再按 isEnabled 决定是否立即 startRuntime。
   * 三种类型互斥字段：cron 用 cron 表达式，every 用 everyMs，at 用绝对时间 at。
   */
  async addJob(
    input:
      | { type: 'cron'; instruction: string; cron: string; isEnabled?: boolean }
      | {
          type: 'every';
          instruction: string;
          everyMs: number;
          isEnabled?: boolean;
        }
      | { type: 'at'; instruction: string; at: Date; isEnabled?: boolean },
  ) {
    const entity = this.entityManager.create(Job, {
      instruction: input.instruction,
      type: input.type,
      cron: input.type === 'cron' ? input.cron : null,
      at: input.type === 'at' ? input.at : null,
      everyMs: input.type === 'every' ? input.everyMs : null,
      isEnabled: input.isEnabled ?? true,
      lastRun: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await this.entityManager.save(Job, entity);
    if (saved.isEnabled) {
      await this.startRuntime(saved);
    }

    return saved;
  }

  /**
   * 启用/停用任务：更新 isEnabled 后同步内存调度（start 或 stop）。
   * isEnabled 未传时取反，实现开关切换。
   */
  async toggleJob(id: string, isEnabled?: boolean) {
    const job = await this.entityManager.findOne(Job, { where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    const nextEnabled = isEnabled ?? !job.isEnabled;
    if (job.isEnabled !== nextEnabled) {
      job.isEnabled = nextEnabled;
      await this.entityManager.save(Job, job);
    }
    if (job.isEnabled) {
      await this.startRuntime(job);
    } else {
      this.stopRuntime(job);
    }

    return job;
  }

  /** 停止内存中的 cron 调度（interval/timeout 停用逻辑可在此扩展） */
  private stopRuntime(job: Job) {
    if (job.type === 'cron') {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      const runtimeJob = cronJobs.get(job.id);
      if (runtimeJob) runtimeJob.stop();
      return;
    }

    if (job.type === 'every') {
      try {
        this.schedulerRegistry.deleteInterval(job.id);
      } catch {
        // ignore
      }
      return;
    }

    if (job.type === 'at') {
      try {
        this.schedulerRegistry.deleteTimeout(job.id);
      } catch {
        // ignore
      }
      return;
    }
  }

  /**
   * 根据 job.type 向 SchedulerRegistry 注册对应调度器并启动。
   * - cron：按 Cron 表达式周期执行，更新 lastRun
   * - every：setInterval 固定间隔执行
   * - at：setTimeout 在指定时刻执行一次，完成后写库并自动停用
   */
  private async startRuntime(job: Job) {
    if (job.type === 'cron') {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      const existingCronJob = cronJobs.get(job.id);

      if (typeof job.cron !== 'string' || job.cron.trim().length === 0) {
        this.logger.error(
          `JobService:startRuntime 禁用非法 cron, jobId=${job.id}`,
        );
        job.isEnabled = false;
        await this.entityManager.update(Job, job.id, { isEnabled: false });
        if (existingCronJob) {
          await existingCronJob.stop();
        }
        return;
      }

      // 已注册过则只 resume，避免重复 addCronJob
      if (existingCronJob) {
        existingCronJob.start();
        return;
      }

      const runtimeJob = this.createCronJob(job);
      this.schedulerRegistry.addCronJob(job.id, runtimeJob);
      runtimeJob.start();
      return;
    }

    if (job.type === 'every') {
      const names = this.schedulerRegistry.getIntervals();
      if (names.includes(job.id)) return;

      if (typeof job.everyMs !== 'number' || job.everyMs <= 0) {
        throw new Error(`Invalid everyMs for job ${job.id}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const ref = setInterval(async () => {
        this.logger.log(`run job ${job.id}, ${job.instruction}`);
        await this.entityManager.update(Job, job.id, { lastRun: new Date() });

        try {
          const result = await this.jobAgentService.runJob(job.instruction);
          this.logger.log(`[job ${job.id}] ${result}`);
        } catch (e) {
          this.logger.error(
            `job ${job.id} agent execution error: ${(e as Error).message}`,
          );
        }
      }, job.everyMs);

      this.schedulerRegistry.addInterval(job.id, ref);
      return;
    }

    if (job.type === 'at') {
      const names = this.schedulerRegistry.getTimeouts();
      if (names.includes(job.id)) return;

      if (!job.at) {
        throw new Error(`Invalid at for job ${job.id}`);
      }

      const delay = Math.max(0, job.at.getTime() - Date.now());
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const ref = setTimeout(async () => {
        this.logger.log(`run job ${job.id}, ${job.instruction}`);
        await this.entityManager.update(Job, job.id, {
          lastRun: new Date(),
          isEnabled: false, // at 类型只执行一次：执行完自动停用
        });

        try {
          const result = await this.jobAgentService.runJob(job.instruction);
          this.logger.log(`[job ${job.id}] ${result}`);
        } catch (e) {
          this.logger.error(
            `job ${job.id} agent execution error: ${(e as Error).message}`,
          );
        }

        try {
          this.schedulerRegistry.deleteTimeout(job.id);
        } catch {
          // ignore
        }
      }, delay);

      this.schedulerRegistry.addTimeout(job.id, ref);
      return;
    }
  }

  /** 构造 cron 包 CronJob：触发时打日志并更新数据库 lastRun */
  private createCronJob(job: Job) {
    const cronExpr = job.cron ?? '';
    return new CronJob(cronExpr, async () => {
      this.logger.log(`run job ${job.id}, ${job.instruction}`);
      await this.entityManager.update(Job, job.id, { lastRun: new Date() });

      try {
        const result = await this.jobAgentService.runJob(job.instruction);
        this.logger.log(`[job ${job.id}] ${result}`);
      } catch (e) {
        this.logger.error(
          `job ${job.id} agent execution error: ${(e as Error).message}`,
        );
      }
    });
  }
}
