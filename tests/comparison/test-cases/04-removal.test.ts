/**
 * Test Suite 4: Unused Import Removal
 * Tests removal of unused imports and ignoredFromRemoval list
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Removal', () => {
  test('044. Remove completely unused import', async () => {
    const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;

    const expected = `import { Used } from './other';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('045. Remove unused specifiers, keep used ones', async () => {
    const input = `import { Used, Unused1, Unused2 } from './lib';

const x = Used;
`;

    const expected = `import { Used } from './lib';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('046. Type-only imports are considered used', async () => {
    const input = `import { MyType } from './lib';

let x: MyType;
`;

    const expected = `import { MyType } from './lib';

let x: MyType;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('047. ignoredFromRemoval list honored', async () => {
    const input = `import React from 'react';

// React not used but should be kept
const x = 1;
`;

    const expected = `import React from 'react';

// React not used but should be kept
const x = 1;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('048. Custom ignoredFromRemoval config', async () => {
    const input = `import { CustomLib } from 'custom-lib';
import { Other } from 'other';

// Neither used, but CustomLib should be kept
const x = 1;
`;

    const config = {
      ignoredFromRemoval: ['custom-lib'],
    };

    const expected = `import { CustomLib } from 'custom-lib';

// Neither used, but CustomLib should be kept
const x = 1;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('049. Default import unused', async () => {
    const input = `import Lib from './lib';
import { Used } from './other';

const x = Used;
`;

    const expected = `import { Used } from './other';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('050. Namespace import unused', async () => {
    const input = `import * as Lib from './lib';
import { Used } from './other';

const x = Used;
`;

    const expected = `import { Used } from './other';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('051. String imports always kept', async () => {
    const input = `import './side-effects';
import { Used } from './lib';

const x = Used;
`;

    const expected = `import './side-effects';

import { Used } from './lib';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('052. Remove unused in re-export', async () => {
    const input = `import { A, B } from './lib';

export { A };
`;

    const expected = `import { A } from './lib';

export { A };
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('053. Keep all re-exported symbols', async () => {
    const input = `import { A, B, C } from './lib';

export { A, B };
`;

    const expected = `import { A, B } from './lib';

export { A, B };
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('054. Property access vs function call', async () => {
    const input = `import { map, reduce } from 'lodash';

const arr = [1, 2, 3];
const doubled = map(arr, x => x * 2);
const sum = doubled.reduce((a, b) => a + b, 0);
`;

    // 'reduce' is a property access on Array, not the imported reduce
    const expected = `import { map } from 'lodash';

const arr = [1, 2, 3];
const doubled = map(arr, x => x * 2);
const sum = doubled.reduce((a, b) => a + b, 0);
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('055. Local shadowing', async () => {
    const input = `import { Component } from '@angular/core';
import { Injectable } from '@angular/core';

class Component {}

const x = Injectable;
`;

    // Component is shadowed by local class, so import is unused
    const expected = `import { Injectable } from '@angular/core';

class Component {}

const x = Injectable;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('056. Disable removal', async () => {
    const input = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;

    const config = {
      disableImportRemovalOnOrganize: true,
    };

    const expected = `import { Unused } from './lib';
import { Used } from './other';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('057. Partial default + named removal', async () => {
    const input = `import Lib, { UsedNamed, UnusedNamed } from './lib';

const x = UsedNamed;
`;

    // ACTUAL: Old extension KEEPS unused default import, only removes unused named specifier
    const expected = `import Lib, { UsedNamed } from './lib';

const x = UsedNamed;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });
});
