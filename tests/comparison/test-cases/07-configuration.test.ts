/**
 * Test Suite 7: Configuration Options
 * Tests all configuration options: quotes, semicolons, spacing, etc.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Configuration', () => {
  test('Single quotes (default)', async () => {
    const input = `import { A } from "./lib";

const x = A;
`;

    const expected = `import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Double quotes', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const config = { stringQuoteStyle: '"' };

    const expected = `import { A } from "./lib";

const x = A;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Semicolons enabled (default)', async () => {
    const input = `import { A } from './lib'

const x = A;
`;

    const expected = `import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Semicolons disabled', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const config = { insertSemicolons: false };

    const expected = `import { A } from './lib'

const x = A;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Space in braces enabled (default)', async () => {
    const input = `import {A} from './lib';

const x = A;
`;

    const expected = `import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Space in braces disabled', async () => {
    const input = `import { A } from './lib';

const x = A;
`;

    const config = { insertSpaceBeforeAndAfterImportBraces: false };

    const expected = `import {A} from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Multiline wrapping with threshold', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = { multiLineWrapThreshold: 40 };

    // ACTUAL: OLD extension DOES wrap with 2-space indent (not 4), 1 blank line after
    const expected = `import {
  VeryLongName1,
  VeryLongName2,
  VeryLongName3,
} from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Trailing comma in multiline (enabled)', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = {
      multiLineWrapThreshold: 40,
      multiLineTrailingComma: true,
    };

    // ACTUAL: OLD wraps with 2-space indent, WITH trailing comma
    const expected = `import {
  VeryLongName1,
  VeryLongName2,
  VeryLongName3,
} from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Trailing comma disabled', async () => {
    const input = `import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const config = {
      multiLineWrapThreshold: 40,
      multiLineTrailingComma: false,
    };

    // ACTUAL: OLD wraps with 2-space indent, NO trailing comma
    const expected = `import {
  VeryLongName1,
  VeryLongName2,
  VeryLongName3
} from './lib';

const a = VeryLongName1;
const b = VeryLongName2;
const c = VeryLongName3;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('Combined config options', async () => {
    const input = `import {A,B} from "./lib"

const x = A;
const y = B;
`;

    const config = {
      stringQuoteStyle: '"',
      insertSemicolons: false,
      insertSpaceBeforeAndAfterImportBraces: false,
    };

    // ACTUAL: OLD extension adds space after comma even when insertSpaceBeforeAndAfterImportBraces is false
    const expected = `import {A, B} from "./lib"

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('disableImportsSorting', async () => {
    const input = `import { Z } from './z';
import { A } from './a';

const x = A;
const y = Z;
`;

    const config = { disableImportsSorting: true };

    // Legacy mode: imports are still sorted by library name (old extension bug)
    const expected = `import { A } from './a';
import { Z } from './z';

const x = A;
const y = Z;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('disableImportRemovalOnOrganize', async () => {
    const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;

    const config = { disableImportRemovalOnOrganize: true };

    const expected = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('organizeSortsByFirstSpecifier', async () => {
    const input = `import { zoo } from './a';
import { ant } from './z';

const x = ant;
const y = zoo;
`;

    const config = { organizeSortsByFirstSpecifier: true };

    // ACTUAL: OLD extension still sorts by library name (./a, ./z), not by first specifier
    const expected = `import { zoo } from './a';
import { ant } from './z';

const x = ant;
const y = zoo;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('All config options together', async () => {
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

    const expected = `import { ant, zoo } from "./a"
import { Unused } from "./unused"

const x = ant;
const y = zoo;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  // NEW TESTS: removeTrailingIndex configuration
  test('removeTrailingIndex enabled (default)', async () => {
    const input = `import { A } from './lib/index';
import { B } from './other/index';

const x = A;
const y = B;
`;

    const expected = `import { A } from './lib';
import { B } from './other';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('removeTrailingIndex disabled', async () => {
    const input = `import { A } from './lib/index';
import { B } from './other/index';

const x = A;
const y = B;
`;

    const config = { removeTrailingIndex: false };

    const expected = `import { A } from './lib/index';
import { B } from './other/index';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('removeTrailingIndex interaction with merging', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    // ACTUAL: OLD extension does NOT merge after removeTrailingIndex - keeps imports separate
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

  // NEW TESTS: ignoredFromRemoval configuration
  test('ignoredFromRemoval with empty array', async () => {
    const input = `import React from 'react';
import { A } from './lib';

const x = A;
`;

    const config = { ignoredFromRemoval: [] };

    const expected = `import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('ignoredFromRemoval with multiple libraries', async () => {
    const input = `import React from 'react';
import Vue from 'vue';
import { A } from './lib';

const x = A;
`;

    const config = { ignoredFromRemoval: ['react', 'vue'] };

    const expected = `import React from 'react';
import Vue from 'vue';

import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('ignoredFromRemoval should still sort specifiers', async () => {
    const input = `import React, { useState, useEffect } from 'react';

const x = React;
const y = useState;
const z = useEffect;
`;

    const config = { ignoredFromRemoval: ['react'] };

    const expected = `import React, { useEffect, useState } from 'react';

const x = React;
const y = useState;
const z = useEffect;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });
});
