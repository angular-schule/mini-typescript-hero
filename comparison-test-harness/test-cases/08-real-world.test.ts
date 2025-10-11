/**
 * Test Suite 8: Real-World Scenarios
 * Tests realistic code from Angular, React, Vue, NestJS, etc.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Real-World', () => {
  test('101. Angular standalone component', async () => {
    const input = `import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookService } from './services/book.service';
import { Book } from './models/book';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: '<div></div>',
})
export class BooksComponent implements OnInit {
  private bookService = inject(BookService);
  books: Book[] = [];

  ngOnInit() {
    this.books = this.bookService.getAll();
  }
}
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 101: Angular component ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Angular standalone component imports should be organized correctly');
  });

  test('102. React functional component with hooks', async () => {
    const input = `import React, { useState, useEffect, useMemo } from 'react';
import { fetchData } from '../api/fetch';
import { formatDate } from '../utils/date';
import type { User } from '../types/user';

export function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchData(userId).then(setUser);
  }, [userId]);

  const formattedDate = useMemo(() => {
    return user ? formatDate(user.createdAt) : '';
  }, [user]);

  return <div>{formattedDate}</div>;
}
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 102: React component ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'React component with hooks should be organized correctly');
  });

  test('103. NestJS controller', async () => {
    const input = `import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { Book } from './entities/book.entity';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all books' })
  findAll(): Promise<Book[]> {
    return this.booksService.findAll();
  }

  @Post()
  create(@Body() createBookDto: CreateBookDto): Promise<Book> {
    return this.booksService.create(createBookDto);
  }
}
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 103: NestJS controller ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'NestJS controller imports should be organized correctly');
  });

  test('104. Vue 3 composition API', async () => {
    const input = `import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchBooks } from '@/api/books';
import type { Book } from '@/types/book';

export default defineComponent({
  name: 'BookList',
  setup() {
    const router = useRouter();
    const books = ref<Book[]>([]);
    const bookCount = computed(() => books.value.length);

    onMounted(async () => {
      books.value = await fetchBooks();
    };

    return { books, bookCount };
  },
});
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 104: Vue component ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Vue 3 composition API imports should be organized correctly');
  });

  test('105. RxJS operators chain', async () => {
    const input = `import { Observable, of, throwError } from 'rxjs';
import { map, filter, catchError, switchMap, debounceTime } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private http: HttpClient) {}

  getData(): Observable<any> {
    return this.http.get('/api/data').pipe(
      debounceTime(300),
      switchMap(data => of(data)),
      filter((item: any) => item.active),
      map((item: any) => item.value),
      catchError(err => throwError(() => err)),
    );
  }
}
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 105: RxJS service ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'RxJS operators should be organized correctly');
  });

  test('106. Express.js route handler', async () => {
    const input = `import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { BookService } from '../services/book.service';
import { authenticate } from '../middleware/auth';
import type { User } from '../types/user';

const router = express.Router();
const bookService = new BookService();

router.post(
  '/books',
  authenticate,
  body('title').notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() };
    }
    const book = await bookService.create(req.body);
    res.json(book);
  },
);

export default router;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Express route handler imports should be organized correctly');
  });

  test('107. Node.js module with built-ins', async () => {
    const input = `import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import axios from 'axios';
import { Config } from './config';
import { Logger } from '../utils/logger';

const readFile = promisify(fs.readFile);

export class FileProcessor {
  constructor(private config: Config, private logger: Logger) {}

  async process(filePath: string): Promise<void> {
    const fullPath = path.resolve(filePath);
    const content = await readFile(fullPath, 'utf-8');
    await axios.post(this.config.apiUrl, { content };
    this.logger.info('File processed');
  }
}
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 107: Node.js module ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Node.js module with built-ins should be organized correctly');
  });

  test('108. Monorepo with workspace packages', async () => {
    const input = `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '@my-org/ui-components';
import { formatDate } from '@my-org/utils';
import { UserService } from '@my-org/services';
import { LocalService } from './local.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Button],
  template: '<button></button>',
})
export class AppComponent {
  constructor(
    private userService: UserService,
    private localService: LocalService,
  ) {}

  format(date: Date): string {
    return formatDate(date);
  }
}
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 108: Monorepo ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Monorepo packages should be organized correctly');
  });

  test('109. Mixed framework imports (edge case)', async () => {
    const input = `import { Component } from '@angular/core';
import React from 'react';
import { createApp } from 'vue';
import express from 'express';

// Weird but technically valid TypeScript
const x = Component;
const y = React;
const z = createApp;
const w = express;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Mixed framework imports should be sorted alphabetically');
  });

  test('110. Large file with many imports (performance)', async () => {
    const input = `import { A1, A2, A3, A4, A5 } from '@lib/a';
import { B1, B2, B3, B4, B5 } from '@lib/b';
import { C1, C2, C3, C4, C5 } from '@lib/c';
import { D1, D2, D3, D4, D5 } from '@lib/d';
import { E1, E2, E3, E4, E5 } from '@lib/e';
import { F1, F2, F3, F4, F5 } from '@lib/f';
import { G1, G2, G3, G4, G5 } from '@lib/g';
import { H1, H2, H3, H4, H5 } from '@lib/h';
import { Local1 } from './local1';
import { Local2 } from './local2';
import { Local3 } from './local3';

const a = A1; const b = B1; const c = C1; const d = D1;
const e = E1; const f = F1; const g = G1; const h = H1;
const l1 = Local1; const l2 = Local2; const l3 = Local3;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 110: Large file ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Large files with many imports should be handled efficiently');
  });
});
