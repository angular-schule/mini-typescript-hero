/**
 * True Compatibility Tests - Third Audit Requirements
 *
 * These tests ensure "true compatibility" between old and new extensions
 * for additional edge cases and specific behaviors that must match exactly.
 *
 * Each test validates BOTH extensions against known-good expected output.
 */

import * as assert from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('True Compatibility Tests (Third Audit)', () => {

  // ============================================================================
  // TC1: Side-effect + named from same module
  // ============================================================================

  test('TC1: Side-effect + named from same module - OLD CRASHES, NEW HANDLES IT', async () => {
    const input = `import 'zone.js';
import { platformBrowserDynamic } from 'zone.js';

const platform = platformBrowserDynamic();
`;

    // OLD extension CRASHES with:
    // TypeError: libraryAlreadyImported.specifiers is not iterable
    // This is a BUG in the old extension when mixing side-effect and named imports

    // Test old extension - it SHOULD crash
    let oldCrashed = false;
    try {
      await organizeImportsOld(input, { legacyMode: true });
    } catch (error) {
      oldCrashed = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.ok(errorMessage.includes('is not iterable'), 'Old extension crashes with expected error');
    }
    assert.ok(oldCrashed, 'Old extension MUST crash on this input (known bug)');

    // NEW extension handles this correctly - keeps them as separate imports
    const expectedNew = `import 'zone.js';

import { platformBrowserDynamic } from 'zone.js';

const platform = platformBrowserDynamic();
`;

    const newResult = await organizeImportsNew(input, { legacyMode: true });
    assert.strictEqual(newResult, expectedNew, 'New extension handles side-effect + named imports correctly');
  });

  // ============================================================================
  // TC2: removeTrailingIndex vs merging order
  // ============================================================================

  test('TC2a: Legacy mode - ./lib/index and ./lib stay separate (merging bug)', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    // Expected: Legacy mode merges BEFORE removeTrailingIndex
    // So './lib/index' and './lib' are treated as different modules
    const expected = `import { B } from './lib';
import { A } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input, {
      legacyMode: true,
      removeTrailingIndex: true
    });
    const newResult = await organizeImportsNew(input, {
      legacyMode: true,
      removeTrailingIndex: true
    });

    assert.strictEqual(oldResult, expected, 'Old extension merges before /index removal');
    assert.strictEqual(newResult, expected, 'New extension replicates bug in legacy mode');
  });

  test('TC2b: Modern mode - remove /index FIRST, then merge', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    // Expected: Modern mode removes /index FIRST, then merges
    // Both become './lib', so they DO merge
    const expected = `import { A, B } from './lib';

const x = A;
const y = B;
`;

    const newResult = await organizeImportsNew(input, {
      legacyMode: false,
      removeTrailingIndex: true,
      mergeImportsFromSameModule: true
    });

    assert.strictEqual(newResult, expected, 'New extension (modern) must merge after /index removal');
  });

  // ============================================================================
  // TC3: Idempotency
  // ============================================================================

  test('TC3a: Idempotency - TypeScript file (run twice)', async () => {
    const input = `import { Z } from './z';
import { A } from './a';
import { unused } from './unused';

const x = A;
const y = Z;
`;

    const expected = `import { A } from './a';
import { Z } from './z';

const x = A;
const y = Z;
`;

    // Run 1
    const oldResult1 = await organizeImportsOld(input, { legacyMode: true });
    const newResult1 = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult1, expected, 'Old extension run 1 must match expected output');
    assert.strictEqual(newResult1, expected, 'New extension run 1 must match expected output');

    // Run 2 - use output from run 1 as input
    const oldResult2 = await organizeImportsOld(oldResult1, { legacyMode: true });
    const newResult2 = await organizeImportsNew(newResult1, { legacyMode: true });

    assert.strictEqual(oldResult2, expected, 'Old extension run 2 must be idempotent');
    assert.strictEqual(newResult2, expected, 'New extension run 2 must be idempotent');
  });

  test('TC3b: Idempotency - TSX file (run twice)', async () => {
    const input = `import { Component } from 'react';
import { Z } from './z';
import { A } from './a';

export const Foo = () => <div>{A} {Z}</div>;
`;

    const expected = `import { Component } from 'react';

import { A } from './a';
import { Z } from './z';

export const Foo = () => <div>{A} {Z}</div>;
`;

    // Run 1
    const oldResult1 = await organizeImportsOld(input, { legacyMode: true });
    const newResult1 = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult1, expected, 'Old extension run 1 must match expected output');
    assert.strictEqual(newResult1, expected, 'New extension run 1 must match expected output');

    // Run 2
    const oldResult2 = await organizeImportsOld(oldResult1, { legacyMode: true });
    const newResult2 = await organizeImportsNew(newResult1, { legacyMode: true });

    assert.strictEqual(oldResult2, expected, 'Old extension run 2 must be idempotent');
    assert.strictEqual(newResult2, expected, 'New extension run 2 must be idempotent');
  });

  // ============================================================================
  // TC4: Regex group precedence over keyword groups
  // ============================================================================

  test('TC4: Regex groups processed before keyword groups', async () => {
    const input = `import { NgModule } from '@angular/core';
import { Component } from '@angular/common';
import { Observable } from 'rxjs';
import { utils } from './utils';

const x = NgModule;
const y = Component;
const z = Observable;
const w = utils;
`;

    // Expected: Regex group (/^@angular/) first, then Modules, then Workspace
    const expected = `import { Component } from '@angular/common';
import { NgModule } from '@angular/core';

import { Observable } from 'rxjs';

import { utils } from './utils';

const x = NgModule;
const y = Component;
const z = Observable;
const w = utils;
`;

    const config = {
      legacyMode: true,
      grouping: ['/^@angular/', 'Modules', 'Workspace']
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension must process regex groups first');
    assert.strictEqual(newResult, expected, 'New extension must process regex groups first');
  });

  // ============================================================================
  // TC5: Ignored-from-removal still sorted
  // ============================================================================

  test('TC5: ignoredFromRemoval still sorts specifiers', async () => {
    const input = `import { useState, useEffect, Component } from 'react';

// Note: React imports are not used, but are in ignoredFromRemoval
const x = 1;
`;

    // Expected: Not removed (ignored), but specifiers ARE sorted
    const expected = `import { Component, useEffect, useState } from 'react';

// Note: React imports are not used, but are in ignoredFromRemoval
const x = 1;
`;

    const config = {
      legacyMode: true,
      ignoredFromRemoval: ['react']
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension must sort ignored imports');
    assert.strictEqual(newResult, expected, 'New extension must sort ignored imports');
  });

  // ============================================================================
  // TC6: Within-group sorting in legacy mode
  // ============================================================================

  test('TC6: Legacy mode sorts within groups even with disableImportsSorting', async () => {
    const input = `import { Z } from './z';
import { A } from './a';
import { M } from './m';

const x = A;
const y = Z;
const z = M;
`;

    // Expected: Legacy mode ALWAYS sorts by library name within groups
    // (This is the "bug" we replicate for compatibility)
    const expected = `import { A } from './a';
import { M } from './m';
import { Z } from './z';

const x = A;
const y = Z;
const z = M;
`;

    const config = {
      legacyMode: true,
      disableImportsSorting: true  // This is IGNORED in legacy mode!
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension always sorts within groups (bug)');
    assert.strictEqual(newResult, expected, 'New extension replicates bug in legacy mode');
  });

  // ============================================================================
  // TC7: Type-only nuanced merges
  // ============================================================================

  test('TC7a: Legacy mode strips type keyword and merges', async () => {
    const input = `import type { A } from './m';
import { B } from './m';

const x: A = B;
`;

    // Expected: Legacy strips 'type' and merges as regular import
    const expected = `import { A, B } from './m';

const x: A = B;
`;

    const oldResult = await organizeImportsOld(input, { legacyMode: true });
    const newResult = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult, expected, 'Old extension strips type keyword');
    assert.strictEqual(newResult, expected, 'New extension strips type in legacy mode');
  });

  test('TC7b: Modern mode keeps type-only imports separate', async () => {
    const input = `import type { A } from './m';
import { B } from './m';

const x: A = B;
`;

    // Expected: Modern mode does NOT merge type-only with value imports
    // They stay as separate import statements to preserve semantic difference
    const expected = `import type { A } from './m';
import { B } from './m';

const x: A = B;
`;

    const newResult = await organizeImportsNew(input, { legacyMode: false });

    assert.strictEqual(newResult, expected, 'New extension keeps type-only imports separate (correct TS 3.8+ behavior)');
  });

  // ============================================================================
  // TC8: CRLF end-of-line parity
  // ============================================================================

  test('TC8: CRLF line endings preserved', async () => {
    const input = `import { Z } from './z';\r\nimport { A } from './a';\r\n\r\nconst x = A;\r\nconst y = Z;\r\n`;

    // Expected: CRLF line endings are preserved
    const expected = `import { A } from './a';\r\nimport { Z } from './z';\r\n\r\nconst x = A;\r\nconst y = Z;\r\n`;

    const oldResult = await organizeImportsOld(input, { legacyMode: true });
    const newResult = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult, expected, 'Old extension must preserve CRLF');
    assert.strictEqual(newResult, expected, 'New extension must preserve CRLF');
  });

  // ============================================================================
  // TC9: Group separators count
  // ============================================================================

  test('TC9: Multiple groups with blank line separators in legacy mode', async () => {
    const input = `import { Component } from 'react';
import { A } from './a';
import 'zone.js';

const x = A;
`;

    // Expected: Plains group, blank line, Modules group, blank line, Workspace group
    // Legacy mode uses 'preserve' behavior which keeps existing blanks
    const expected = `import 'zone.js';

import { Component } from 'react';

import { A } from './a';

const x = A;
`;

    const config = {
      legacyMode: true,
      grouping: ['Plains', 'Modules', 'Workspace']
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension must add blank lines between groups');
    assert.strictEqual(newResult, expected, 'New extension must add blank lines between groups');
  });

});
