/*
 * @Date: 2026-06-24 11:08:56
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-24 16:07:10
 */
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { Book } from './book/entities/book.entity';
const isProduction = process.env.NODE_ENV === 'production';
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      serveRoot: '/books',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: isProduction ? 'mysql-prod' : 'localhost',
        port: 3306,
        username: 'root',
        password: 'admin',
        database: 'book',
        synchronize: true, // 服务启动时自动建表
        connectorPackage: 'mysql2',
        logging: true,
        entities: [Book],
      }),
    }),
    BookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
