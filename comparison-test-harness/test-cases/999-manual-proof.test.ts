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

  test('PROOF: Old extension does NOT preserve inline comments in imports', async () => {
    const input = `import {
  Z, // keep this
  /* mid */ A,
  B // end
} from 'lib';

const x = A + B + Z;
`;

    // Testing what old extension ACTUALLY does with inline comments
    const oldResult = await organizeImportsOld(input);

    // Log the actual result so we can see what the old extension does
    console.log('Old extension result:', JSON.stringify(oldResult));

    // The old extension STRIPS inline comments, so we expect them to be gone
    // This test exists to PROVE that the old extension doesn't preserve comments
    const expectedWithoutComments = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    // This assertion proves the old extension doesn't preserve comments
    assert.strictEqual(oldResult, expectedWithoutComments,
      'Old extension STRIPS inline comments (PROOF that feature is not supported)');
  });
});
