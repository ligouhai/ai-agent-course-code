/*
 * @Date: 2026-07-28 14:56:51
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-07-28 15:04:41
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
