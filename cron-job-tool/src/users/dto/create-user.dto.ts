/*
 * @Date: 2026-06-01 17:08:25
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-06-01 17:31:15
 */
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(50)
  email: string;
}
