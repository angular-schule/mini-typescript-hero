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

    // ACTUAL: inject sorts before OnInit (case-insensitive alphabetical)
    const expected = `import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Book } from './models/book';
import { BookService } from './services/book.service';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    // ACTUAL: Old extension does NOT support `import type` - strips type keyword and merges
    const expected = `import React, { useEffect, useMemo, useState } from 'react';

import { fetchData } from '../api/fetch';
import { User } from '../types/user';
import { formatDate } from '../utils/date';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    // ACTUAL: Old extension does NOT support `import type` - strips type keyword
    // Also: @/api/books sorts before @/types/book alphabetically
    const expected = `import { fetchBooks } from '@/api/books';
import { Book } from '@/types/book';
import { computed, defineComponent, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, debounceTime, filter, map, switchMap } from 'rxjs/operators';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    // ACTUAL: Old extension does NOT support `import type` - strips type keyword
    const expected = `import express, { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { BookService } from '../services/book.service';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { Logger } from '../utils/logger';
import { Config } from './config';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserService } from '@my-org/services';
import { Button } from '@my-org/ui-components';
import { formatDate } from '@my-org/utils';

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
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    const expected = `import { Component } from '@angular/core';
import express from 'express';
import React from 'react';
import { createApp } from 'vue';

// Weird but technically valid TypeScript
const x = Component;
const y = React;
const z = createApp;
const w = express;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
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

    // ACTUAL: Old extension removes ALL unused specifiers (A2-A5, B2-B5, etc.)
    const expected = `import { A1 } from '@lib/a';
import { B1 } from '@lib/b';
import { C1 } from '@lib/c';
import { D1 } from '@lib/d';
import { E1 } from '@lib/e';
import { F1 } from '@lib/f';
import { G1 } from '@lib/g';
import { H1 } from '@lib/h';

import { Local1 } from './local1';
import { Local2 } from './local2';
import { Local3 } from './local3';

const a = A1; const b = B1; const c = C1; const d = D1;
const e = E1; const f = F1; const g = G1; const h = H1;
const l1 = Local1; const l2 = Local2; const l3 = Local3;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });
});
