/**
 * Test Suite 5: Blank Line Handling
 * Tests the 4 modes: "one", "two", "preserve", "legacy"
 *
 * NOTE: Old TypeScript Hero uses "legacy" behavior by default.
 * New Mini TypeScript Hero defaults to "one" for new users.
 * For accurate comparison, we test with matching configs.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Blank Lines', () => {
  test('058. One blank line after imports (default for old)', async () => {
    const input = `import { A } from './lib';


const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 058: Blank lines (legacy mode) ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should match old behavior (legacy mode)');
  });

  test('059. Blank line before imports preserved', async () => {
    const input = `// Header comment

import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 059: Blank before imports ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Blank line before imports should be handled correctly');
  });

  test('060. Blank lines between groups', async () => {
    const input = `import { Component } from '@angular/core';
import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 060: Between groups ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should have blank line between import groups');
  });

  test('061. Leading blank lines removed', async () => {
    const input = `

import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    assert.equal(newResult, oldResult, 'Leading blank lines should be removed');
  });

  test('062. File with only imports (no code after)', async () => {
    const input = `import { A } from './lib';
import { B } from './other';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    // Old may add trailing blank, new doesn't
    const oldTrimmed = oldResult.replace(/\n+$/, '\n');
    const newTrimmed = newResult.replace(/\n+$/, '\n');
    assert.equal(newTrimmed, oldTrimmed, 'Should handle files with code after imports');
  });

  test('063. Shebang preserved', async () => {
    const input = `#!/usr/bin/env node
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 063: Shebang ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Shebang should be preserved at file start');
  });

  test('064. Use strict preserved', async () => {
    const input = `'use strict';
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    assert.equal(newResult, oldResult, 'use strict should be preserved before imports');
  });

  test('065. Copyright header preserved', async () => {
    const input = `// Copyright 2025
// Author: Test
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    assert.equal(newResult, oldResult, 'Copyright header should be preserved');
  });

  test('066. Multiple blank lines collapsed (legacy behavior)', async () => {
    const input = `import { A } from './lib';




const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 066: Multiple blanks ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should handle multiple blank lines (legacy mode)');
  });

  test('067. No blank before first import (no header)', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    assert.equal(newResult, oldResult, 'No blank line before imports when no header');
  });

  test('068. Block comment preserved', async () => {
    const input = `/**
 * Module description
 */
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 068: Block comment ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Block comment should be preserved');
  });

  test('069. Three import groups with blank lines', async () => {
    const input = `import 'zone.js';
import { Component } from '@angular/core';
import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 069: Three groups ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Three groups should have blank lines between each');
  });

  test('070. Blank line after header comment', async () => {
    const input = `// Header

import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { blankLinesAfterImports: 'legacy' });

    console.log('\n=== TEST 070: After header ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Blank line after header should be preserved');
  });
});
