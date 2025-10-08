/**
 * Test Suite 1: Import Sorting
 * Tests specifier sorting, library sorting, and first-specifier sorting
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Sorting', () => {
  /**
   * CRITICAL TEST: Mixed-case specifiers
   * This is the bug that was found during manual testing
   *
   * Expected behavior: Component, inject, OnInit (case-insensitive alphabetical)
   * Bug behavior: Component, OnInit, inject (capitals before lowercase)
   */
  test('001. Mixed-case specifiers (Component, inject, OnInit)', async () => {
    const input = `import { OnInit, Component, inject } from '@angular/core';

const x = Component;
const y = inject;
const z: OnInit = null as any;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    // First, let's see what the old extension actually produces
    console.log('\n=== TEST 001: Mixed-case specifiers ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'New extension must match old extension output');
  });

  test('002. All capitals specifiers (Component, OnInit)', async () => {
    const input = `import { OnInit, Component } from '@angular/core';

const x = Component;
const z: OnInit = null as any;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should match for all-capital specifiers');
  });

  test('003. All lowercase specifiers (map, filter, tap)', async () => {
    const input = `import { tap, map, filter } from 'rxjs/operators';

const x = map;
const y = filter;
const z = tap;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should match for all-lowercase specifiers');
  });

  test('004. Mixed lower and upper start (inject, Component, map, OnInit)', async () => {
    const input = `import { map, OnInit, inject, Component } from '@angular/core';

const w = Component;
const x = OnInit;
const y = inject;
const z = map;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 004: Complex mixed case ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should handle complex mixed-case scenarios');
  });

  test('005. Library name sorting (alphabetical)', async () => {
    const input = `import { z } from 'zebra';
import { a } from 'aardvark';
import { m } from 'monkey';

const x = a;
const y = m;
const w = z;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Libraries should be sorted alphabetically');
  });

  test('006. Sort by first specifier (enabled)', async () => {
    const input = `import { zoo } from './a';
import { ant } from './z';

const x = ant;
const y = zoo;
`;

    const config = { organizeSortsByFirstSpecifier: true };
    const oldResult = await organizeImportsOld(input, { organizeSortsByFirstSpecifier: true });
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 006: Sort by first specifier ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should sort by first specifier when enabled');
  });

  test('007. String imports come first', async () => {
    const input = `import { Component } from '@angular/core';
import 'zone.js';
import { map } from 'rxjs';

const x = Component;
const y = map;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 007: String imports first ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'String imports should come before named imports');
  });

  test('008. Multiple string imports sorted', async () => {
    const input = `import 'zebra';
import 'aardvark';
import 'monkey';
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    // EXPECTED DIFFERENCE: Old extension adds blank line after imports even when there's
    // no code after (ends with \n\n). New extension is smarter and doesn't add pointless
    // blank lines at end of file (ends with \n). This is an intentional improvement.
    // See README-how-we-handle-blank-lines.md - TC-400 edge case.
    const oldResultWithoutTrailingBlank = oldResult.replace(/\n\n$/, '\n');
    assert.equal(newResult, oldResultWithoutTrailingBlank, 'String imports should be sorted alphabetically');
  });

  test('009. Specifiers with aliases', async () => {
    const input = `import { Component as Cmp, inject as inj, OnInit as Init } from '@angular/core';

const x = Cmp;
const y = inj;
const z: Init = null as any;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 009: Aliases ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Aliases should be sorted by original name, not alias');
  });

  test('010. Default + named imports', async () => {
    const input = `import React, { useState, useEffect } from 'react';

const x = React;
const y = useState;
const z = useEffect;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    // BUG FOUND: New extension skips specifier sorting for imports in ignoredFromRemoval list.
    // ignoredFromRemoval defaults to ['react'], so React imports don't get specifiers sorted.
    // Location: src/imports/import-manager.ts:270 - continue statement skips sorting logic
    // Expected: { useEffect, useState } (alphabetical)
    // Actual: { useState, useEffect } (original order preserved)
    // This needs to be fixed in the main extension code!

    console.log('\n=== BUG: Test 010 reveals specifier sorting issue ===');
    console.log('Expected (old):', oldResult.split('\n')[0]);
    console.log('Actual (new):  ', newResult.split('\n')[0]);
    console.log('Issue: ignoredFromRemoval imports skip specifier sorting\n');

    assert.equal(newResult, oldResult, 'Default import should come before named imports');
  });

  test('011. Namespace imports', async () => {
    const input = `import * as RxJS from 'rxjs';
import * as React from 'react';

const x = React;
const y = RxJS;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Namespace imports should be sorted by alias');
  });

  test('012. Disable sorting', async () => {
    const input = `import { z, a, m } from './lib';

const x = a;
const y = m;
const w = z;
`;

    const config = { disableImportsSorting: true };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should preserve order when sorting disabled');
  });

  test('013. Case-insensitive library sorting', async () => {
    const input = `import { a } from 'Zebra';
import { b } from 'aardvark';
import { c } from 'Monkey';

const x = a;
const y = b;
const z = c;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Library names should be sorted case-insensitively');
  });

  test('014. Numbers in specifier names', async () => {
    const input = `import { test2, test1, test10, test3 } from './lib';

const a = test1;
const b = test2;
const c = test3;
const d = test10;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 014: Numbers in names ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Numbers in names should be sorted correctly');
  });

  test('015. Special characters in library names', async () => {
    const input = `import { a } from '@scope/package';
import { b } from 'normal-package';
import { c } from '@angular/core';

const x = a;
const y = b;
const z = c;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Scoped packages should be sorted correctly');
  });
});
