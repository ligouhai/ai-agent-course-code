/*
 * @Date: 2026-05-27 17:59:11
 * @LastEditors: zhujinyi
 * @LastEditTime: 2026-05-27 18:19:55
 */
import { Inject, Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

import type { Book, BookRepository } from './entities/book.entity';

@Injectable()
export class BookService {
  @Inject('BOOK_REPOSITORY')
  private readonly bookRepository: BookRepository;
  create(createBookDto: CreateBookDto) {
    return 'This action adds a new book';
  }

  findAll(): Book[] {
    return this.bookRepository.findAll();
  }

  findOne(id: number) {
    return `This action returns a #${id} book`;
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  remove(id: number) {
    return `This action removes a #${id} book`;
  }
}
