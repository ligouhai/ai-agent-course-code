/*
 * @Date: 2026-05-29 11:43:35
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-29 17:31:12
 */
import { Injectable } from '@nestjs/common';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};
@Injectable()
export class UserService {
  private readonly users = new Map<string, User>([
    [
      '001',
      { id: '001', name: '赵云', email: 'zhaoyun@example.com', role: 'admin' },
    ],
    [
      '002',
      {
        id: '002',
        name: '诸葛亮',
        email: 'zhugeliang@example.com',
        role: 'manager',
      },
    ],
    [
      '003',
      { id: '003', name: '关羽', email: 'guanyu@example.com', role: 'user' },
    ],
    [
      '004',
      { id: '004', name: '张飞', email: 'zhangfei@example.com', role: 'user' },
    ],
    [
      '005',
      { id: '005', name: '刘备', email: 'liubei@example.com', role: 'owner' },
    ],
    [
      '006',
      {
        id: '006',
        name: '黄忠',
        email: 'huangzhong@example.com',
        role: 'user',
      },
    ],
  ]);

  findAll() {
    return Array.from(this.users.values());
  }

  findOne(id: string) {
    return this.users.get(id);
  }

  create(user: User) {
    this.users.set(user.id, user);
    return user;
  }

  update(id: string, partial: Partial<Omit<User, 'id'>>): User | undefined {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }

    const updated: User = {
      ...existingUser,
      ...partial,
      id: existingUser.id,
    };
    this.users.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }
}
