export class Book {
  id: number;
  title: string;
}

export interface BookRepository {
  findAll(): Book[];
}
