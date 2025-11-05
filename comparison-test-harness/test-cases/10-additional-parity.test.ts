/**
 * Additional Parity Tests - Second Audit Requirements
 *
 * These tests ensure "true compatibility" between old and new extensions
 * for edge cases and specific behaviors that must match exactly.
 *
 * Each test validates BOTH extensions against known-good expected output.
 */

import * as assert from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Additional Parity Tests (Second Audit)', () => {

  // ============================================================================
  // A1: Side-effect + named from same module
  // ============================================================================

  test('A1: Side-effect + named from same module - OLD EXTENSION CRASHES, NEW HANDLES IT', async () => {
    const input = `import 'zone.js';
import { a } from 'zone.js';

const x = a;
`;

    // OLD extension CRASHES with:
    // TypeError: libraryAlreadyImported.specifiers is not iterable
    // at ImportManager.organizeImports (old-typescript-hero/src/imports/import-manager.js:134:59)
    //
    // This happens when it tries to merge a side-effect import with a named import
    // from the same module - it's a BUG in the old extension.

    // Test old extension - it SHOULD crash
    let oldCrashed = false;
    try {
      await organizeImportsOld(input, { legacyMode: true });
    } catch (error: any) {
      oldCrashed = true;
      assert.ok(error.message.includes('is not iterable'), 'Old extension crashes with expected error');
    }
    assert.ok(oldCrashed, 'Old extension MUST crash on this input (known bug)');

    // NEW extension handles this correctly - keeps them as separate imports
    const expectedNew = `import 'zone.js';

import { a } from 'zone.js';

const x = a;
`;

    const newResult = await organizeImportsNew(input, { legacyMode: true });
    assert.strictEqual(newResult, expectedNew, 'New extension handles side-effect + named imports correctly');
  });

  // ============================================================================
  // A2: removeTrailingIndex vs merging order
  // ============================================================================

  test('A2a: Legacy mode - ./lib/index and ./lib stay separate (old bug)', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    // Expected: Old extension doesn't merge them!
    // It seems to not recognize them as same module even after /index removal
    // Result: Two separate imports both from './lib' (sorted B, A alphabetically)
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

    assert.strictEqual(oldResult, expected, 'Old extension keeps them separate (bug)');
    assert.strictEqual(newResult, expected, 'New extension replicates old bug in legacy mode');
  });

  test('A2b: Modern mode - remove /index FIRST, then merge', async () => {
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
  // A3: Idempotency
  // ============================================================================

  test('A3a: Idempotency - TypeScript file (run twice)', async () => {
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

    assert.strictEqual(oldResult1, expected, 'Old extension run 1 must produce correct output');
    assert.strictEqual(newResult1, expected, 'New extension run 1 must produce correct output');

    // Run 2 - use output from run 1 as input
    const oldResult2 = await organizeImportsOld(oldResult1, { legacyMode: true });
    const newResult2 = await organizeImportsNew(newResult1, { legacyMode: true });

    assert.strictEqual(oldResult2, expected, 'Old extension run 2 must produce identical output (idempotent)');
    assert.strictEqual(newResult2, expected, 'New extension run 2 must produce identical output (idempotent)');
  });

  test('A3b: Idempotency - TSX file (run twice)', async () => {
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

    assert.strictEqual(oldResult1, expected, 'Old extension run 1 must produce correct output');
    assert.strictEqual(newResult1, expected, 'New extension run 1 must produce correct output');

    // Run 2
    const oldResult2 = await organizeImportsOld(oldResult1, { legacyMode: true });
    const newResult2 = await organizeImportsNew(newResult1, { legacyMode: true });

    assert.strictEqual(oldResult2, expected, 'Old extension run 2 must be idempotent');
    assert.strictEqual(newResult2, expected, 'New extension run 2 must be idempotent');
  });

  // ============================================================================
  // A4: Regex group precedence over keyword groups
  // ============================================================================

  test('A4: Regex groups processed before keyword groups', async () => {
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
  // A5: Ignored-from-removal still sorted
  // ============================================================================

  test('A5: ignoredFromRemoval still sorts specifiers', async () => {
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
  // A6: Within-group sorting in legacy mode
  // ============================================================================

  test('A6: Legacy mode sorts within groups even with disableImportsSorting', async () => {
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
  // A7: Re-exports parity
  // ============================================================================

  test('A7a: Re-exports with export { X } from', async () => {
    const input = `import { A } from './a';
export { X } from './m';
import { B } from './b';

const foo = A;
const bar = B;
`;

    // Expected: Re-exports are moved AFTER all imports
    const expected = `import { A } from './a';
import { B } from './b';

export { X } from './m';
const foo = A;
const bar = B;
`;

    const oldResult = await organizeImportsOld(input, { legacyMode: true });
    const newResult = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult, expected, 'Old extension preserves re-exports after imports');
    assert.strictEqual(newResult, expected, 'New extension preserves re-exports after imports');
  });

  test('A7b: Re-exports with export * as ns from', async () => {
    const input = `import { A } from './a';
export * as utils from './utils';
import { B } from './b';

const foo = A;
const bar = B;
`;

    // Expected: Namespace re-exports are moved AFTER all imports
    const expected = `import { A } from './a';
import { B } from './b';

export * as utils from './utils';
const foo = A;
const bar = B;
`;

    const oldResult = await organizeImportsOld(input, { legacyMode: true });
    const newResult = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult, expected, 'Old extension moves namespace re-exports after imports');
    assert.strictEqual(newResult, expected, 'New extension moves namespace re-exports after imports');
  });

  // ============================================================================
  // A8: Type-only nuanced merges
  // ============================================================================

  test('A8a: Legacy mode strips type keyword and merges', async () => {
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

  test('A8b: Modern mode keeps type-only imports separate', async () => {
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
  // A9: CRLF end-of-line parity
  // ============================================================================

  test('A9: CRLF line endings preserved', async () => {
    const input = `import { Z } from './z';\r\nimport { A } from './a';\r\n\r\nconst x = A;\r\nconst y = Z;\r\n`;

    // Expected: CRLF line endings are preserved
    const expected = `import { A } from './a';\r\nimport { Z } from './z';\r\n\r\nconst x = A;\r\nconst y = Z;\r\n`;

    const oldResult = await organizeImportsOld(input, { legacyMode: true });
    const newResult = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult, expected, 'Old extension must preserve CRLF');
    assert.strictEqual(newResult, expected, 'New extension must preserve CRLF');
  });

  // ============================================================================
  // A10: Group separators count
  // ============================================================================

  test('A10: Multiple groups with blank line separators in legacy mode', async () => {
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

  // ============================================================================
  // A10: Duplicate default imports from same module - PERFECT PARITY
  // ============================================================================

  test('A10: Duplicate defaults from same module - both keep LAST default', async () => {
    // Scenario: Invalid TypeScript (multiple default imports from same module)
    // Both defaults are referenced in code, but TypeScript only allows one default per module
    //
    // BEHAVIOR: Both extensions keep LAST default (PERFECT PARITY)
    // - Old extension: Keeps LAST default (Default2)
    // - New extension: Keeps LAST default (Default2) - matches old exactly
    //
    // WHY: Both behaviors are equivalent since Default1 and Default2 both refer
    // to the same default export from './lib'. The difference is just which local
    // name we keep. Invalid TypeScript either way.
    //
    // We chose to match old behavior for 100% parity on this edge case.
    const input = `import Default1 from './lib';
import Default2 from './lib';

console.log(Default1, Default2);
`;

    const config = {
      mergeImportsFromSameModule: true,
      legacyMode: false,
    };

    // Both extensions keep LAST default (Default2)
    const expected = `import Default2 from './lib';

console.log(Default1, Default2);
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    // Verify PERFECT PARITY - both produce identical output
    assert.strictEqual(oldResult, expected, 'Old extension keeps LAST default (Default2)');
    assert.strictEqual(newResult, expected, 'New extension keeps LAST default (Default2)');
    assert.strictEqual(oldResult, newResult, 'PERFECT PARITY: Both extensions produce identical output');

    // Both merge to single import
    const oldLines = oldResult.split('\n').filter(l => l.startsWith('import'));
    const newLines = newResult.split('\n').filter(l => l.startsWith('import'));

    assert.strictEqual(oldLines.length, 1, 'Old: Should merge to single import');
    assert.strictEqual(newLines.length, 1, 'New: Should merge to single import');

    // Both keep LAST default
    assert.ok(oldLines[0].includes('Default2'), 'Old: Keeps LAST default (Default2)');
    assert.ok(newLines[0].includes('Default2'), 'New: Keeps LAST default (Default2)');

    // Both drop FIRST default
    assert.ok(!oldLines[0].includes('Default1'), 'Old: Drops FIRST default (Default1)');
    assert.ok(!newLines[0].includes('Default1'), 'New: Drops FIRST default (Default1)');
  });

});
