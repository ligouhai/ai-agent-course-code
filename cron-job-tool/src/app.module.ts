/*
 * @Date: 2026-05-29 10:33:08
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-02 10:38:37
 */
import { MailerModule } from '@nestjs-modules/mailer';
import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  CronExpression,
  ScheduleModule,
  SchedulerRegistry,
} from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { join } from 'path';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Job } from './job/entities/job.entity';
import { JobModule } from './job/job.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        synchronize: true,
        connectorPackage: 'mysql2',
        logging: true,
        entities: [User, Job],
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: configService.get('MAIL_PORT'),
          secure: configService.get('MAIL_SECURE') === 'true',
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: configService.get('MAIL_FROM'),
        },
      }),
    }),
    UsersModule,
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  @Inject(SchedulerRegistry)
  schedulerRegistry: SchedulerRegistry;

  onApplicationBootstrap() {
    const job = new CronJob(CronExpression.EVERY_SECOND, () => {
      console.log('run job');
    });
    this.schedulerRegistry.addCronJob('job1', job);
    job.start();
    setTimeout(() => {
      this.schedulerRegistry.deleteCronJob('job1');
    }, 5000);

    const intervalRef = setInterval(() => {
      console.log('run interval job');
    }, 1000);
    this.schedulerRegistry.addInterval('interval1', intervalRef);
    setTimeout(() => {
      this.schedulerRegistry.deleteInterval('interval1');
    }, 5000);

    const timeoutRef = setTimeout(() => {
      console.log('run timeout job');
    }, 3000);
    this.schedulerRegistry.addTimeout('timeout1', timeoutRef);
    setTimeout(() => {
      this.schedulerRegistry.deleteTimeout('timeout1');
    }, 5000);
  }
}
