/*
 * @Date: 2026-08-11 15:21:38
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-08-11 15:24:47
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtTestPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtTestService {
  constructor(private readonly jwtService: JwtService) {}
  sign(payload: JwtTestPayload): string {
    return this.jwtService.sign(payload);
  }
  verify(token: string): JwtTestPayload {
    try {
      return this.jwtService.verify<JwtTestPayload>(token);
    } catch {
      throw new UnauthorizedException('token 无效或已过期');
    }
  }
}
