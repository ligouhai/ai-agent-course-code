/*
 * @Date: 2026-08-11 15:21:59
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-11 15:40:48
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtTestPayload } from './jwt-test.service';
import { JwtTestService } from './jwt-test.service';

@Controller('jwt-test')
export class JwtTestController {
  constructor(private readonly jwtTestService: JwtTestService) {}

  @Post('sign')
  sign(@Body() payload: JwtTestPayload) {
    const accessToken = this.jwtTestService.sign(payload);
    return {
      access_token: accessToken,
    };
  }

  @Get('verify')
  verify(@Headers('authorization') authorization?: string) {
    const token = this.extractBearerToken(authorization);
    if (!token) {
      throw new UnauthorizedException('请携带 Bearer Token');
    }
    return this.jwtTestService.verify(token);
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }
    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }
    return token;
  }
}
