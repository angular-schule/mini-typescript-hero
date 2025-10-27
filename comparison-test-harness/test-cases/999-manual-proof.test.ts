/**
 * USER GROUND TRUTH TEST
 *
 * This is the test case that the user discovered during manual testing.
 * This test represents the ACTUAL bug that was found in production use.
 * This test MUST pass - it's the whole reason we're doing this comparison.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('User Ground Truth Test', () => {
  test('User-discovered bug: Mixed-case specifier sorting (Component, inject, OnInit)', async () => {
    // This is the ACTUAL input that the user tested manually
    // Expected: Component, inject, OnInit (case-insensitive alphabetical)
    // Bug was: Component, OnInit, inject (capitals before lowercase)
    const input = `import { OnInit, Component, inject } from '@angular/core';

const x = Component;
const y = inject;
const z: OnInit = null as any;
`;

    const expected = `import { Component, inject, OnInit } from '@angular/core';

const x = Component;
const y = inject;
const z: OnInit = null as any;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    // This is the critical test - both must produce correct output
    assert.strictEqual(oldResult, expected, 'Old extension must produce correct output (USER GROUND TRUTH)');
    assert.strictEqual(newResult, expected, 'New extension must produce correct output (USER GROUND TRUTH)');
  });

  test('PROOF 1: Old extension sorts imports (no comments)', async () => {
    const input = `import { Z, A, B } from 'lib';

const x = A + B + Z;
`;

    // Input has NO comments - just testing basic sorting
    // Disable removal so we can focus on sorting behavior
    const expected = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    console.log('PROOF 1 - Old extension (no comments):', JSON.stringify(oldResult));

    assert.strictEqual(oldResult, expected, 'Old extension sorts imports without comments');
  });

  test('PROOF 2: Old extension strips trailing line comments', async () => {
    const input = `import {
  Z, // comment after Z
  A,
  B // comment after B
} from 'lib';

const x = A + B + Z;
`;

    // Testing what old extension ACTUALLY does with trailing line comments
    // Disable removal to focus on comment handling
    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    console.log('PROOF 2 - Old extension (trailing comments):', JSON.stringify(oldResult));

    // The old extension STRIPS trailing line comments
    const expected = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    assert.strictEqual(oldResult, expected,
      'PROOF: Old extension strips trailing line comments');
  });

  test('PROOF 3: Old extension strips leading block comments', async () => {
    const input = `import {
  Z,
  /* block comment */ A,
  B
} from 'lib';

const x = A + B + Z;
`;

    // Testing what old extension ACTUALLY does with leading block comments
    // Disable removal to focus on comment handling
    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    console.log('PROOF 3 - Old extension (leading block comment):', JSON.stringify(oldResult));

    // The old extension STRIPS leading block comments
    const expected = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    assert.strictEqual(oldResult, expected,
      'PROOF: Old extension strips leading block comments');
  });
});
