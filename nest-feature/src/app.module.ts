/*
 * @Date: 2026-07-28 14:44:00
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-11 15:46:00
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtTestModule } from './jwt-test/jwt-test.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    JwtTestModule,
    JwtModule.register({
      global: true,
      secret: 'jwt-test-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
