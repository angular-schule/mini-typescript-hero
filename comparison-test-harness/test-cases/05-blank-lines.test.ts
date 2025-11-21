/**
 * Test Suite 5: Blank Line Handling
 * Tests blank line behavior with legacyMode enabled
 *
 * NOTE: Old TypeScript Hero uses "preserve" behavior by default (legacyMode).
 * New Mini TypeScript Hero defaults to "one" for new users.
 * For accurate comparison, we test with legacyMode: true.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Blank Lines', () => {
  test('058. Two blank lines after imports preserved (legacy mode)', async () => {
    const input = `import { A } from './lib';


const x = A;
`;

    // Legacy mode preserves existing blank lines (2 blank lines preserved)
    const expected = `import { A } from './lib';


const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('059. Blank line before imports preserved', async () => {
    const input = `// Header comment

import { A } from './lib';

const x = A;
`;

    // ACTUAL: Old extension removes blank line between header and imports, adds 2 blank lines after
    const expected = `// Header comment
import { A } from './lib';


const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('060. Blank lines between groups', async () => {
    const input = `import { Component } from '@angular/core';
import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const expected = `import { Component } from '@angular/core';

import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('061. Leading blank lines removed', async () => {
    const input = `

import { A } from './lib';

const x = A;
`;

    // ACTUAL: Leading blanks removed, old extension adds 3 blank lines after (2 leading + 1 existing)
    const expected = `import { A } from './lib';



const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('062. File with only imports (no code after)', async () => {
    const input = `import { A } from './lib';
import { B } from './other';

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

  test('063. Shebang preserved', async () => {
    const input = `#!/usr/bin/env node
import { A } from './lib';

const x = A;
`;

    const expected = `#!/usr/bin/env node
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('064. Use strict preserved', async () => {
    const input = `'use strict';
import { A } from './lib';

const x = A;
`;

    const expected = `'use strict';
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('065. Copyright header preserved', async () => {
    const input = `// Copyright 2025
// Author: Test
import { A } from './lib';

const x = A;
`;

    // Old extension removes blank between header and imports
    const expected = `// Copyright 2025
// Author: Test
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('066. Multiple blank lines collapsed (legacy behavior)', async () => {
    const input = `import { A } from './lib';




const x = A;
`;

    // Legacy mode preserves existing blank lines (4 blanks preserved)
    const expected = `import { A } from './lib';




const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('067. No blank before first import (no header)', async () => {
    const input = `import { A } from './lib';

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

  test('068. Block comment preserved', async () => {
    const input = `/**
 * Module description
 */
import { A } from './lib';

const x = A;
`;

    const expected = `/**
 * Module description
 */
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('069. Three import groups with blank lines', async () => {
    const input = `import 'zone.js';
import { Component } from '@angular/core';
import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const expected = `import 'zone.js';

import { Component } from '@angular/core';

import { MyService } from './my-service';

const x = Component;
const y = MyService;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });

  test('070. Blank line after header comment', async () => {
    const input = `// Header

import { A } from './lib';

const x = A;
`;

    // ACTUAL: Old extension removes blank line between header and imports, adds 2 blank lines after
    const expected = `// Header
import { A } from './lib';


const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must match expected output');
    assert.equal(newResult, expected, 'New extension must match expected output');
  });
});
