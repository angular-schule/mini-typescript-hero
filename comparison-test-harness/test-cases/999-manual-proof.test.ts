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
});
