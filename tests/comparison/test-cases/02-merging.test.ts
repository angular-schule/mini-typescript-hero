/**
 * Test Suite 2: Import Merging
 * Tests merging of imports from same module
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Merging', () => {
  test('Same library, different specifiers', async () => {
    const input = `import { A } from './lib';
import { B } from './lib';

const x = A;
const y = B;
`;

    const expected = `import { A, B } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Three imports from same module', async () => {
    const input = `import { A } from './lib';
import { B } from './lib';
import { C } from './lib';

const x = A;
const y = B;
const z = C;
`;

    const expected = `import { A, B, C } from './lib';

const x = A;
const y = B;
const z = C;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Same library, default + named', async () => {
    const input = `import Lib from './lib';
import { A, B } from './lib';

const x = Lib;
const y = A;
const z = B;
`;

    const expected = `import Lib, { A, B } from './lib';

const x = Lib;
const y = A;
const z = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Duplicate specifiers - graceful error handling', async () => {
    const input = `import { A, B } from './lib';
import { A, C } from './lib';

const x = A;
const y = B;
const z = C;
`;

    // ⚠️ NOTE: This code has "Duplicate identifier 'A'" - a TypeScript semantic error
    // This is invalid TypeScript code, but the parsers (typescript-parser and ts-morph)
    // can still parse the syntax and organize the imports.
    //
    // ACTUAL BEHAVIOR (verified by running the test):
    // - Both extensions successfully organize the imports
    // - They merge the two imports into one: `import { A, A, B, C } from './lib';`
    // - The duplicate 'A' is PRESERVED (neither extension deduplicates specifiers within a statement)
    // - Note: Modern mode merges imports from same module; legacy mode has merge timing quirks
    // - TypeScript compiler would error on the duplicate identifier when type-checking
    //
    // This test verifies graceful handling - no crashes, consistent output between extensions

    const expected = `import { A, A, B, C } from './lib';

const x = A;
const y = B;
const z = C;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    // Both should successfully organize and produce the same merged import
    assert.strictEqual(oldResult, expected, 'Old extension keeps duplicate specifiers');
    assert.strictEqual(newResult, expected, 'New extension keeps duplicate specifiers');
  });

  test('Namespace imports cannot merge', async () => {
    const input = `import * as Lib1 from './lib';
import * as Lib2 from './lib';

const x = Lib1;
const y = Lib2;
`;

    const expected = `import * as Lib1 from './lib';
import * as Lib2 from './lib';

const x = Lib1;
const y = Lib2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('String imports cannot merge', async () => {
    const input = `import './lib';
import './lib';
`;

    // No code after imports - old extension adds 2 blank lines, new adds 1
    const expectedOld = `import './lib';
import './lib';

`;
    const expectedNew = `import './lib';
import './lib';
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expectedOld, 'Old extension must match expected output');
    assert.equal(newResult, expectedNew, 'New extension must match expected output');
  });

  test('Merging after removeTrailingIndex', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    // ACTUAL: Old extension does NOT merge after removeTrailingIndex - keeps imports separate
    const expected = `import { B } from './lib';
import { A } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Merging preserves used specifiers only', async () => {
    const input = `import { A, Unused1 } from './lib';
import { B, Unused2 } from './lib';

const x = A;
const y = B;
`;

    const expected = `import { A, B } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Merging sorts specifiers alphabetically', async () => {
    const input = `import { Z } from './lib';
import { A } from './lib';
import { M } from './lib';

const x = A;
const y = M;
const z = Z;
`;

    const expected = `import { A, M, Z } from './lib';

const x = A;
const y = M;
const z = Z;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Default + named with aliases', async () => {
    const input = `import Lib from './lib';
import { A as AliasA } from './lib';

const x = Lib;
const y = AliasA;
`;

    const expected = `import Lib, { A as AliasA } from './lib';

const x = Lib;
const y = AliasA;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Multiple modules with merging', async () => {
    const input = `import { A1 } from './lib1';
import { B1 } from './lib2';
import { A2 } from './lib1';
import { B2 } from './lib2';

const a = A1;
const b = A2;
const c = B1;
const d = B2;
`;

    const expected = `import { A1, A2 } from './lib1';
import { B1, B2 } from './lib2';

const a = A1;
const b = A2;
const c = B1;
const d = B2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Mixed import types from same module', async () => {
    const input = `import Lib from './lib';
import * as LibNS from './lib';
import { A } from './lib';

const x = Lib;
const y = LibNS;
const z = A;
`;

    // Default + named can merge, but namespace imports stay separate
    const expected = `import Lib, { A } from './lib';
import * as LibNS from './lib';

const x = Lib;
const y = LibNS;
const z = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Real Angular example - merges @angular/core imports', async () => {
    const input = `import { UserDetail } from './components/user-detail';
import { Component } from '@angular/core';
import { UnusedService } from './services/unused';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { OnInit, inject } from '@angular/core';
import { BookList } from './components/book-list';
import { of } from 'rxjs';

// Using some imports
const component = Component;
const init = OnInit;
const inj = inject;
const router = Router;
const observable = of(1);
const ops = [map, switchMap];
const book = BookList;
const user = UserDetail;
`;

    const expected = `import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';

// Using some imports
const component = Component;
const init = OnInit;
const inj = inject;
const router = Router;
const observable = of(1);
const ops = [map, switchMap];
const book = BookList;
const user = UserDetail;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Merging with type imports', async () => {
    const input = `import { type A } from './lib';
import { B } from './lib';

const x: A = { value: 1 };
const y = B;
`;

    // ACTUAL: Old extension does NOT preserve `type` keyword - strips it
    const expectedOld = `import { A, B } from './lib';

const x: A = { value: 1 };
const y = B;
`;

    // NEW: Modern extension preserves `type` keyword for individual specifiers (TS 4.5+)
    const expectedNew = `import { type A, B } from './lib';

const x: A = { value: 1 };
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { legacyMode: false }); // Enable modern mode

    assert.equal(oldResult, expectedOld, 'Old extension must match expected output');
    assert.equal(newResult, expectedNew, 'New extension must match expected output (preserves type)');
  });

  test('Merging with multiple aliases', async () => {
    const input = `import { A as AliasA } from './lib';
import { B as AliasB } from './lib';

const x = AliasA;
const y = AliasB;
`;

    const expected = `import { A as AliasA, B as AliasB } from './lib';

const x = AliasA;
const y = AliasB;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });
});
