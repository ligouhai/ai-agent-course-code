import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 调度类型：cron 周期 | every 固定间隔 | at 指定时刻一次 */
export type JobType = 'cron' | 'every' | 'at';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 任务说明/指令内容，执行时写入日志（后续可接 AI 等实际逻辑） */
  @Column({
    type: 'text',
  })
  instruction: string;

  @Column({ type: 'varchar', length: 10, default: 'cron' })
  type: JobType;

  /** cron 类型：标准 Cron 表达式，如 "0 * * * *" */
  @Column({ type: 'varchar', length: 100, nullable: true })
  cron: string | null;

  /** every 类型：间隔毫秒数（注意：当前实体未加 @Column，落库需补全字段映射） */
  @Column({ type: 'int', nullable: true })
  everyMs: number | null;

  /** at 类型：触发时间点（一次性） */
  @Column({ type: 'timestamp', nullable: true })
  at: Date | null;

  /** 是否在库中标记为启用（与内存调度 isEnabled 同步维护） */
  @Column({ default: true })
  isEnabled: boolean;

  /** 最近一次实际执行时间 */
  @Column({ type: 'timestamp', nullable: true })
  lastRun: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
