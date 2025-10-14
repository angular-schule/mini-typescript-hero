import { suite, test } from 'mocha';
import * as assert from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Demo for Video Test Cases', () => {

  test('128. Demo file - EXACT reproduction of manual test case', async () => {
    // This is the EXACT content from manual-test-cases/demo-for-video.ts
    // Copied byte-for-byte to ensure we test the real scenario
    const input = `// Demo file for video - shows the full power of Mini TypeScript Hero
// Press Ctrl+Alt+O (or Cmd+Alt+O on macOS) to organize imports

import { UserDetail } from './components/user-detail';
import { Component } from '@angular/core';
import { UnusedService } from './services/unused';
import {Router} from "@angular/router"
import { map, switchMap } from 'rxjs/operators';
import {OnInit, inject} from "@angular/core"
import { BookList } from './components/book-list';
import {of} from "rxjs"

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [BookList, UserDetail],
  template: \`
    <h1>Demo Component</h1>
    <app-book-list />
    <app-user-detail />
  \`
})
export class DemoComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    console.log('Component initialized');

    // Using some RxJS operators
    const data$ = this.getData().pipe(
      switchMap(x => this.transform(x)),
      map(y => y.toUpperCase())
    );
  }

  private getData() {
    return of('data');
  }

  private transform(value: string) {
    return of(value);
  }
}
`;

    // EXPECTED OUTPUT: What the user gets when running old TypeScript Hero
    // This is the EXACT output the user provided
    const expectedOutput = `// Demo file for video - shows the full power of Mini TypeScript Hero
// Press Ctrl+Alt+O (or Cmd+Alt+O on macOS) to organize imports
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';


@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [BookList, UserDetail],
  template: \`
    <h1>Demo Component</h1>
    <app-book-list />
    <app-user-detail />
  \`
})
export class DemoComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    console.log('Component initialized');

    // Using some RxJS operators
    const data$ = this.getData().pipe(
      switchMap(x => this.transform(x)),
      map(y => y.toUpperCase())
    );
  }

  private getData() {
    return of('data');
  }

  private transform(value: string) {
    return of(value);
  }
}
`;

    // Test OLD extension
    const oldResult = await organizeImportsOld(input);

    // Test NEW extension with legacy mode (to match old behavior)
    const newResult = await organizeImportsNew(input, {
      legacyMode: true,
      mergeImportsFromSameModule: true,
    });

    // Verify OLD extension produces expected output
    assert.strictEqual(
      oldResult,
      expectedOutput,
      'OLD extension should produce the exact expected output'
    );

    // Verify NEW extension with legacy mode matches OLD extension
    assert.strictEqual(
      newResult,
      oldResult,
      'NEW extension with legacy mode should match OLD extension exactly'
    );

    // Additional verification: Check specific transformations

    // 1. UnusedService should be removed
    assert.ok(!oldResult.includes('UnusedService'), 'UnusedService should be removed');
    assert.ok(!newResult.includes('UnusedService'), 'UnusedService should be removed (new)');

    // 2. @angular/core imports should be merged and sorted
    const angularImportLineOld = oldResult.split('\n').find(line => line.includes('@angular/core'));
    const angularImportLineNew = newResult.split('\n').find(line => line.includes('@angular/core'));

    assert.ok(angularImportLineOld, 'Should have @angular/core import');
    assert.ok(angularImportLineOld.includes('Component'), 'Should have Component');
    assert.ok(angularImportLineOld.includes('inject'), 'Should have inject');
    assert.ok(angularImportLineOld.includes('OnInit'), 'Should have OnInit');

    // Verify specifiers are in alphabetical order (Component, inject, OnInit)
    const specifiersMatch = angularImportLineOld.match(/\{\s*(.+?)\s*\}/);
    if (specifiersMatch) {
      const specifiers = specifiersMatch[1].split(',').map(s => s.trim());
      assert.deepStrictEqual(
        specifiers,
        ['Component', 'inject', 'OnInit'],
        'Specifiers should be alphabetically sorted: Component, inject, OnInit'
      );
    }

    // Same check for new extension
    assert.strictEqual(angularImportLineNew, angularImportLineOld, 'New extension should have same @angular/core import');

    // 3. Imports should be grouped: external libraries, then local imports
    const lines = oldResult.split('\n');
    const importLines = lines.filter(line => line.trim().startsWith('import'));

    // External imports come first
    assert.ok(importLines[0].includes('@angular/core'), 'First import should be @angular/core');
    assert.ok(importLines[1].includes('@angular/router'), 'Second import should be @angular/router');
    assert.ok(importLines[2].includes('rxjs'), 'Third import should be rxjs');
    assert.ok(importLines[3].includes('rxjs/operators'), 'Fourth import should be rxjs/operators');

    // Then local imports
    assert.ok(importLines[4].includes('./components/book-list'), 'Fifth import should be local');
    assert.ok(importLines[5].includes('./components/user-detail'), 'Sixth import should be local');

    // 4. Check blank lines after imports (legacy mode = 2 blank lines)
    const importEndIndex = lines.findIndex(line => line.includes('./components/user-detail'));
    const blankLinesAfter = [];
    for (let i = importEndIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') {
        blankLinesAfter.push(i);
      } else {
        break;
      }
    }

    // Legacy mode should have 2 blank lines after imports
    assert.strictEqual(
      blankLinesAfter.length,
      2,
      'Should have exactly 2 blank lines after imports in legacy mode'
    );

    console.log('✅ Demo file test PASSED - both extensions produce identical, expected output');
  });

  test('129. Demo file - NEW extension with modern defaults (not legacy)', async () => {
    // Same input as test 128
    const input = `// Demo file for video - shows the full power of Mini TypeScript Hero
// Press Ctrl+Alt+O (or Cmd+Alt+O on macOS) to organize imports

import { UserDetail } from './components/user-detail';
import { Component } from '@angular/core';
import { UnusedService } from './services/unused';
import {Router} from "@angular/router"
import { map, switchMap } from 'rxjs/operators';
import {OnInit, inject} from "@angular/core"
import { BookList } from './components/book-list';
import {of} from "rxjs"

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [BookList, UserDetail],
  template: \`
    <h1>Demo Component</h1>
    <app-book-list />
    <app-user-detail />
  \`
})
export class DemoComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    console.log('Component initialized');

    // Using some RxJS operators
    const data$ = this.getData().pipe(
      switchMap(x => this.transform(x)),
      map(y => y.toUpperCase())
    );
  }

  private getData() {
    return of('data');
  }

  private transform(value: string) {
    return of(value);
  }
}
`;

    // Test NEW extension with MODERN defaults (recommended for new users)
    const modernResult = await organizeImportsNew(input, {
      legacyMode: false,  // Modern behavior
      blankLinesAfterImports: 'one',  // ESLint/Google standard
      mergeImportsFromSameModule: true,
    });

    // Expected: Same imports, but only 1 blank line after (not 2)
    const expectedModernOutput = `// Demo file for video - shows the full power of Mini TypeScript Hero
// Press Ctrl+Alt+O (or Cmd+Alt+O on macOS) to organize imports
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [BookList, UserDetail],
  template: \`
    <h1>Demo Component</h1>
    <app-book-list />
    <app-user-detail />
  \`
})
export class DemoComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    console.log('Component initialized');

    // Using some RxJS operators
    const data$ = this.getData().pipe(
      switchMap(x => this.transform(x)),
      map(y => y.toUpperCase())
    );
  }

  private getData() {
    return of('data');
  }

  private transform(value: string) {
    return of(value);
  }
}
`;

    assert.strictEqual(
      modernResult,
      expectedModernOutput,
      'NEW extension with modern defaults should have 1 blank line after imports (not 2)'
    );

    // Verify only 1 blank line after imports
    const lines = modernResult.split('\n');
    const importEndIndex = lines.findIndex(line => line.includes('./components/user-detail'));
    const blankLinesAfter = [];
    for (let i = importEndIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') {
        blankLinesAfter.push(i);
      } else {
        break;
      }
    }

    assert.strictEqual(
      blankLinesAfter.length,
      1,
      'Should have exactly 1 blank line after imports with modern defaults'
    );

    console.log('✅ Demo file with modern defaults PASSED - 1 blank line as expected');
  });

});
