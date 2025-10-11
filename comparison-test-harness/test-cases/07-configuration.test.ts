/**
 * Test Suite 7: Configuration Options
 * Tests all configuration options: quotes, semicolons, spacing, etc.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Configuration', () => {
  test('087. Single quotes (default)', async () => {
    const input = `import { A } from "./lib";

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 087: Quote style ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should use single quotes by default');
  });

  test('088. Double quotes', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const config = { stringQuoteStyle: '"' };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should use double quotes when configured');
  });

  test('089. Semicolons enabled (default)', async () => {
    const input = `import { A } from './lib'

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should add semicolons by default');
  });

  test('090. Semicolons disabled', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const config = { insertSemicolons: false };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 090: No semicolons ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should omit semicolons when disabled');
  });

  test('091. Space in braces enabled (default)', async () => {
    const input = `import {A} from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should add spaces in braces by default');
  });

  test('092. Space in braces disabled', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const config = { insertSpaceBeforeAndAfterImportBraces: false };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 092: No spaces ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should omit spaces when disabled');
  });

  test('093. Multiline wrapping with threshold', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = { multiLineWrapThreshold: 40 };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 093: Multiline ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should wrap to multiline when threshold exceeded');
  });

  test('094. Trailing comma in multiline (enabled)', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = {
      multiLineWrapThreshold: 40,
      multiLineTrailingComma: true,
    };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should add trailing comma in multiline');
  });

  test('095. Trailing comma disabled', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = {
      multiLineWrapThreshold: 40,
      multiLineTrailingComma: false,
    };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 095: No trailing comma ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should omit trailing comma when disabled');
  });

  test('096. Combined config options', async () => {
    const input = `import {A,B} from "./lib"

const x = A;
const y = B;
`;

    const config = {
      stringQuoteStyle: '"',
      insertSemicolons: false,
      insertSpaceBeforeAndAfterImportBraces: false,
    };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 096: Combined config ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Multiple config options should work together');
  });

  test('097. disableImportsSorting', async () => {
    const input = `import { Z } from './z';
import { A } from './a';

const x = A;
const y = Z;
`;

    const config = { disableImportsSorting: true };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should preserve order when sorting disabled');
  });

  test('098. disableImportRemovalOnOrganize', async () => {
    const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;

    const config = { disableImportRemovalOnOrganize: true };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should keep unused imports when removal disabled');
  });

  test('099. organizeSortsByFirstSpecifier', async () => {
    const input = `import { zoo } from './a';
import { ant } from './z';

const x = ant;
const y = zoo;
`;

    const config = { organizeSortsByFirstSpecifier: true };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 099: Sort by first specifier ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should sort by first specifier instead of module name');
  });

  test('100. All config options together', async () => {
    const input = `import {zoo,ant} from "./a"
import {Unused} from "./unused"

const x = ant;
const y = zoo;
`;

    const config = {
      stringQuoteStyle: '"',
      insertSemicolons: false,
      insertSpaceBeforeAndAfterImportBraces: true,
      organizeSortsByFirstSpecifier: true,
      disableImportRemovalOnOrganize: true,
    };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 100: All options ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'All config options should work together');
  });

  // NEW TESTS: removeTrailingIndex configuration
  test('111. removeTrailingIndex enabled (default)', async () => {
    const input = `import { A } from './lib/index';
import { B } from './other/index';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should remove trailing /index by default');
  });

  test('112. removeTrailingIndex disabled', async () => {
    const input = `import { A } from './lib/index';
import { B } from './other/index';

const x = A;
const y = B;
`;

    const config = { removeTrailingIndex: false };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should preserve /index when disabled');
  });

  test('113. removeTrailingIndex interaction with merging', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, '/index removal should happen before merging');
  });

  // NEW TESTS: ignoredFromRemoval configuration
  test('114. ignoredFromRemoval with empty array', async () => {
    const input = `import React from 'react';
import { A } from './lib';

const x = A;
`;

    const config = { ignoredFromRemoval: [] };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should remove unused React when not in ignore list');
  });

  test('115. ignoredFromRemoval with multiple libraries', async () => {
    const input = `import React from 'react';
import Vue from 'vue';
import { A } from './lib';

const x = A;
`;

    const config = { ignoredFromRemoval: ['react', 'vue'] };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    assert.equal(newResult, oldResult, 'Should keep unused React and Vue when in ignore list');
  });

  test('116. ignoredFromRemoval should still sort specifiers', async () => {
    const input = `import React, { useState, useEffect } from 'react';

const x = React;
const y = useState;
const z = useEffect;
`;

    const config = { ignoredFromRemoval: ['react'] };
    const oldResult = await organizeImportsOld(input, config);
    const newResult = organizeImportsNew(input, config);

    console.log('\n=== TEST 116: Ignored imports specifier sorting ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Ignored imports should still have specifiers sorted');
  });
});
