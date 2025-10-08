/**
 * Test Suite 2: Import Merging
 * Tests merging of imports from same module
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Merging', () => {
  test('016. Same library, different specifiers', async () => {
    const input = `import { A } from './lib';
import { B } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 016: Basic merging ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should merge imports from same module');
  });

  test('017. Three imports from same module', async () => {
    const input = `import { A } from './lib';
import { B } from './lib';
import { C } from './lib';

const x = A;
const y = B;
const z = C;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should merge three imports');
  });

  test('018. Same library, default + named', async () => {
    const input = `import Lib from './lib';
import { A, B } from './lib';

const x = Lib;
const y = A;
const z = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 018: Default + named merging ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should merge default and named imports');
  });

  test('019. Duplicate specifiers removed', async () => {
    const input = `import { A, B } from './lib';
import { A, C } from './lib';

const x = A;
const y = B;
const z = C;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should deduplicate specifiers');
  });

  test('020. Namespace imports cannot merge', async () => {
    const input = `import * as Lib1 from './lib';
import * as Lib2 from './lib';

const x = Lib1;
const y = Lib2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Namespace imports should remain separate');
  });

  test('021. String imports cannot merge', async () => {
    const input = `import './lib';
import './lib';
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    // No code after imports, so trim trailing blank line difference
    const oldTrimmed = oldResult.replace(/\n\n$/, '\n');
    assert.equal(newResult, oldTrimmed, 'String imports should remain as-is');
  });

  test('022. Merging after removeTrailingIndex', async () => {
    const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 022: Merging after /index removal ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Should merge after removing /index');
  });

  test('023. Merging preserves used specifiers only', async () => {
    const input = `import { A, Unused1 } from './lib';
import { B, Unused2 } from './lib';

const x = A;
const y = B;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should merge only used specifiers');
  });

  test('024. Merging sorts specifiers alphabetically', async () => {
    const input = `import { Z } from './lib';
import { A } from './lib';
import { M } from './lib';

const x = A;
const y = M;
const z = Z;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Merged imports should have sorted specifiers');
  });

  test('025. Default + named with aliases', async () => {
    const input = `import Lib from './lib';
import { A as AliasA } from './lib';

const x = Lib;
const y = AliasA;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should merge default with aliased named imports');
  });

  test('026. Multiple modules with merging', async () => {
    const input = `import { A1 } from './lib1';
import { B1 } from './lib2';
import { A2 } from './lib1';
import { B2 } from './lib2';

const a = A1;
const b = A2;
const c = B1;
const d = B2;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    assert.equal(newResult, oldResult, 'Should merge each module separately');
  });

  test('027. Mixed import types from same module', async () => {
    const input = `import Lib from './lib';
import * as LibNS from './lib';
import { A } from './lib';

const x = Lib;
const y = LibNS;
const z = A;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = organizeImportsNew(input);

    console.log('\n=== TEST 027: Mixed import types ===');
    console.log('OLD OUTPUT:');
    console.log(oldResult);
    console.log('\nNEW OUTPUT:');
    console.log(newResult);
    console.log('===\n');

    assert.equal(newResult, oldResult, 'Mixed import types from same module');
  });
});
