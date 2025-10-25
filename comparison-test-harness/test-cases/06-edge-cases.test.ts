/**
 * Test Suite 6: Edge Cases
 * Tests unusual scenarios, malformed code, and boundary conditions
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Edge Cases', () => {
  test('071. Empty file', async () => {
    const input = ``;

    const expected = ``;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('072. File with no imports', async () => {
    const input = `const x = 1;
const y = 2;
`;

    const expected = `const x = 1;
const y = 2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('073. Only string imports', async () => {
    const input = `import 'zone.js';
import 'reflect-metadata';
`;

    // No code after - old adds 2 blanks, new adds 1
    const expectedOld = `import 'reflect-metadata';
import 'zone.js';

`;
    const expectedNew = `import 'reflect-metadata';
import 'zone.js';
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expectedOld, 'Old extension must produce correct output');
    assert.equal(newResult, expectedNew, 'New extension must produce correct output');
  });

  test('074. Only default imports', async () => {
    const input = `import Lib1 from './lib1';
import Lib2 from './lib2';

const x = Lib1;
const y = Lib2;
`;

    const expected = `import Lib1 from './lib1';
import Lib2 from './lib2';

const x = Lib1;
const y = Lib2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('075. Only namespace imports', async () => {
    const input = `import * as Lib1 from './lib1';
import * as Lib2 from './lib2';

const x = Lib1;
const y = Lib2;
`;

    const expected = `import * as Lib1 from './lib1';
import * as Lib2 from './lib2';

const x = Lib1;
const y = Lib2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('076. Long import line (multiline wrapping)', async () => {
    const input = `import { VeryLongSpecifierName1, VeryLongSpecifierName2, VeryLongSpecifierName3, VeryLongSpecifierName4, VeryLongSpecifierName5 } from './lib';

const a = VeryLongSpecifierName1;
const b = VeryLongSpecifierName2;
const c = VeryLongSpecifierName3;
const d = VeryLongSpecifierName4;
const e = VeryLongSpecifierName5;
`;

    const expected = `import {
  VeryLongSpecifierName1,
  VeryLongSpecifierName2,
  VeryLongSpecifierName3,
  VeryLongSpecifierName4,
  VeryLongSpecifierName5,
} from './lib';

const a = VeryLongSpecifierName1;
const b = VeryLongSpecifierName2;
const c = VeryLongSpecifierName3;
const d = VeryLongSpecifierName4;
const e = VeryLongSpecifierName5;
`;

    const oldResult = await organizeImportsOld(input, {
      multiLineWrapThreshold: 40
    });
    const newResult = await organizeImportsNew(input, {
      multiLineWrapThreshold: 40
    });

    assert.equal(oldResult, expected, 'Old extension must produce correct multiline wrapped output');
    assert.equal(newResult, expected, 'New extension must produce correct multiline wrapped output');
  });

  test('077. Path aliases', async () => {
    const input = `import { Service } from '@app/services/my-service';
import { Utils } from '@utils/helpers';
import { Component } from '@angular/core';

const x = Component;
const y = Service;
const z = Utils;
`;

    const expected = `import { Component } from '@angular/core';
import { Service } from '@app/services/my-service';
import { Utils } from '@utils/helpers';

const x = Component;
const y = Service;
const z = Utils;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('078. removeTrailingIndex enabled', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    // ACTUAL: Old extension does NOT merge after removeTrailingIndex
    const expected = `import { B } from './lib';
import { A } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('079. removeTrailingIndex disabled', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    const config = { removeTrailingIndex: false };

    // ACTUAL: Still doesn't merge (imports from different paths: ./lib/index vs ./lib)
    const expected = `import { B } from './lib';
import { A } from './lib/index';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('080. Dynamic import() not confused with static import', async () => {
    const input = `import { A } from './lib';

const x = A;
const y = import('./dynamic');
`;

    const expected = `import { A } from './lib';

const x = A;
const y = import('./dynamic');
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('081. import.meta not confused with imports', async () => {
    const input = `import { A } from './lib';

const x = A;
const url = import.meta.url;
`;

    const expected = `import { A } from './lib';

const x = A;
const url = import.meta.url;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('082. Empty import specifiers', async () => {
    const input = `import {} from './lib';
import { Used } from './other';

const x = Used;
`;

    // Both extensions remove empty imports
    const expected = `import { Used } from './other';

const x = Used;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension removes empty import');
    assert.equal(newResult, expected, 'New extension removes empty import');
  });

  test('083. Comments between imports', async () => {
    const input = `import { A } from './a';
// Important comment
import { B } from './b';

const x = A;
const y = B;
`;

    // ACTUAL: Old extension preserves comment after imports (moves it down)
    const expected = `import { A } from './a';
import { B } from './b';

// Important comment
const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('084. Template string with import keyword', async () => {
    const input = `import { A } from './lib';

const x = A;
const str = \`import { B } from 'fake'\`;
`;

    const expected = `import { A } from './lib';

const x = A;
const str = \`import { B } from 'fake'\`;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('085. Triple-slash directive', async () => {
    const input = `/// <reference types="node" />
import { A } from './lib';

const x = A;
`;

    const expected = `/// <reference types="node" />
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('086. Type-only import syntax', async () => {
    const input = `import type { MyType } from './lib';
import { MyValue } from './lib';

const x = MyValue;
let y: MyType;
`;

    // ACTUAL: Old extension does NOT support TypeScript 3.8+ `import type` syntax - strips the type keyword
    const expectedOld = `import { MyType, MyValue } from './lib';

const x = MyValue;
let y: MyType;
`;

    // NEW: Modern extension preserves `import type` declarations (TS 3.8+)
    // Type-only and value imports are kept separate (cannot be merged)
    const expectedNew = `import type { MyType } from './lib';
import { MyValue } from './lib';

const x = MyValue;
let y: MyType;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { legacyMode: false }); // Enable modern mode

    assert.equal(oldResult, expectedOld, 'Old extension must produce correct output');
    assert.equal(newResult, expectedNew, 'New extension must produce correct output (preserves import type)');
  });

  // NEW TESTS: Critical edge cases from unit suite
  test('117. Shebang preservation', async () => {
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

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('118. use strict directive (single quotes)', async () => {
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

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('119. use strict directive (double quotes)', async () => {
    const input = `"use strict";
import { A } from './lib';

const x = A;
`;

    const expected = `"use strict";
import { A } from './lib';

const x = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('120. Old TypeScript syntax: import = require()', async () => {
    const input = `import Lib = require('./lib');
import { A } from './other';

const x = Lib;
const y = A;
`;

    // Old syntax is preserved but not sorted with ES6 imports
    const expected = `import Lib = require('./lib');
import { A } from './other';

const x = Lib;
const y = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('121. Local shadowing (local class shadows import)', async () => {
    const input = `import { Component, Injectable } from '@angular/core';

class Component {
  // Local class shadows imported Component
}

const service = Injectable;
`;

    // Component import is removed because it's shadowed
    const expected = `import { Injectable } from '@angular/core';

class Component {
  // Local class shadows imported Component
}

const service = Injectable;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('122. Property access vs function calls', async () => {
    const input = `import { map, filter, reduce } from 'lodash';

const arr = [1, 2, 3];
const doubled = map(arr, x => x * 2);
const result = filter(doubled, x => x > 2).reduce((acc, val) => acc + val, 0);
`;

    // .reduce is property access on Array, not lodash reduce
    const expected = `import { filter, map } from 'lodash';

const arr = [1, 2, 3];
const doubled = map(arr, x => x * 2);
const result = filter(doubled, x => x > 2).reduce((acc, val) => acc + val, 0);
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });

  test('123. Comments between imports: Indentation preserved', async () => {
    // PROOF: Both extensions preserve comment indentation when moving comments after imports
    // OLD EXTENSION: Puts blank line AFTER imports, BEFORE comments, BEFORE code
    // NEW EXTENSION: Matches old extension exactly (indentation preserved)
    const input = `import { B } from './b';
  // This is an indented comment
import { A } from './a';
    // This is a more indented comment
import { C } from './c';

console.log(A, B, C);
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    // Expected: Imports sorted, comments moved after with indentation preserved
    // VERIFIED from REAL old extension output (ran test to capture actual behavior)
    const expected = `import { A } from './a';
import { B } from './b';
import { C } from './c';

  // This is an indented comment
    // This is a more indented comment
console.log(A, B, C);
`;

    assert.equal(oldResult, expected, 'Old extension must produce correct output');
    assert.equal(newResult, expected, 'New extension must produce correct output');
  });
});
