/**
 * Additional Coverage Tests - High-value edge cases from testing analysis
 *
 * These tests cover important combinations and edge cases that ensure
 * correctness in complex real-world scenarios.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Additional Coverage', () => {

  // ============================================================================
  // Type-only + value imports from same module (must NOT merge)
  // ============================================================================

  test('Type-only + value imports: both extensions merge', async () => {
    const input = `import type { User } from './types';
import { getUser } from './types';

const user: User = getUser();
`;

    // Both extensions strip 'import type' keyword and merge type-only with value imports.
    // This matches old extension behavior for backward compatibility.
    const expected = `import { getUser, User } from './types';

const user: User = getUser();
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension strips import type and merges');
    assert.strictEqual(newResult, expected, 'New extension matches old behavior (legacy mode backward compatibility)');
  });

  test('Type-only + value imports merge in legacy mode', async () => {
    const input = `import type { User } from './types';
import { getUser } from './types';

const user: User = getUser();
`;

    // In legacy mode, new extension replicates old behavior: strips type keyword and merges
    const expected = `import { getUser, User } from './types';

const user: User = getUser();
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input, { legacyMode: true });

    assert.strictEqual(oldResult, expected, 'Old extension strips import type and merges');
    assert.strictEqual(newResult, expected, 'New extension in legacy mode matches old behavior');
  });

  test('Specifier-level type modifier preserved in modern mode', async () => {
    const input = `import { type User, getUser } from './types';

const user: User = getUser();
`;

    // Specifier-level 'type' modifier must be preserved
    const expected = `import { getUser, type User } from './types';

const user: User = getUser();
`;

    // Must use legacyMode: false for modern mode (default adapter config uses legacyMode: true)
    const newResult = await organizeImportsNew(input, { legacyMode: false, blankLinesAfterImports: 'one' });

    assert.strictEqual(newResult, expected, 'Specifier-level type modifier preserved and sorted');
  });

  // ============================================================================
  // Side-effect + normal import from same module
  // ============================================================================

  test('Side-effect import + named import stay separate', async () => {
    const input = `import { polyfill } from './polyfills';
import './polyfills';

polyfill();
`;

    // Side-effect imports and normal imports must never merge.
    // Side-effect imports are grouped separately (Plains group) and come first.
    const expected = `import './polyfills';

import { polyfill } from './polyfills';

polyfill();
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension keeps side-effect and named imports separate');
    assert.strictEqual(newResult, expected, 'New extension keeps side-effect and named imports separate');
  });

  test('Multiple side-effect imports ordering', async () => {
    const input = `import { config } from './config';
import './polyfills/dom';
import './polyfills/fetch';
import './styles.css';

config.init();
`;

    // Side-effect imports (Plains group) come first, sorted alphabetically.
    // Normal imports (Workspace group) come after with blank line separator.
    const expected = `import './polyfills/dom';
import './polyfills/fetch';
import './styles.css';

import { config } from './config';

config.init();
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension orders side-effect imports first, then named imports');
    assert.strictEqual(newResult, expected, 'New extension orders side-effect imports first, then named imports');
  });

  // ============================================================================
  // Import assertions on side-effect imports
  // ============================================================================

  test('Side-effect import with assert syntax', async () => {
    const input = `import './data.json' assert { type: 'json' };
import { config } from './config';

config.init();
`;

    // Only test new extension (old doesn't support assertions)
    const newResult = await organizeImportsNew(input);

    // Verify assertions are preserved (exact format to be determined)
    assert.ok(newResult.includes("assert { type: 'json' }"), 'Assertions preserved in side-effect import');
  });

  test('Side-effect import with "with" syntax', async () => {
    const input = `import './styles.css' with { type: 'css' };
import { Component } from './component';

const c = Component;
`;

    // Only test new extension (old doesn't support "with" syntax)
    const newResult = await organizeImportsNew(input);

    // Verify "with" syntax is preserved
    assert.ok(newResult.includes("with { type: 'css' }"), '"with" syntax preserved in side-effect import');
  });

  // ============================================================================
  // Default + named + namespace combinations
  // ============================================================================

  test('Default + named from same module', async () => {
    const input = `import { helper } from './utils';
import utils from './utils';

const x = utils.foo(helper());
`;

    // Default and named can be merged into single import
    const expected = `import utils, { helper } from './utils';

const x = utils.foo(helper());
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension merges default + named');
    assert.strictEqual(newResult, expected, 'New extension merges default + named');
  });

  test('Default + named with aliases', async () => {
    const input = `import { util as u } from './utils';
import utils from './utils';

const x = utils.foo(u());
`;

    // Default and aliased named can be merged
    const expected = `import utils, { util as u } from './utils';

const x = utils.foo(u());
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension merges default + aliased named');
    assert.strictEqual(newResult, expected, 'New extension merges default + aliased named');
  });

  test('Namespace import stays separate from named', async () => {
    const input = `import { helper } from './utils';
import * as Utils from './utils';

const x = Utils.foo(helper());
`;

    // Namespace and named imports should NOT merge (different semantics)
    // Order: named comes first (alphabetically by specifier)
    const expected = `import { helper } from './utils';
import * as Utils from './utils';

const x = Utils.foo(helper());
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension keeps namespace separate');
    assert.strictEqual(newResult, expected, 'New extension keeps namespace separate');
  });

  test('Default + namespace from same module', async () => {
    const input = `import * as Utils from './utils';
import utils from './utils';

const x = utils.foo(Utils.bar());
`;

    // Old extension crashes with "libraryAlreadyImported.specifiers is not iterable"
    // New extension gracefully handles this case (bug fix - keeps imports separate).
    const expected = `import * as Utils from './utils';
import utils from './utils';

const x = utils.foo(Utils.bar());
`;

    // Old extension crashes - we test that it does crash (documents known bug)
    let oldCrashed = false;
    try {
      await organizeImportsOld(input);
    } catch (error) {
      oldCrashed = true;
      assert.ok(error instanceof Error && error.message.includes('libraryAlreadyImported.specifiers is not iterable'),
        'Old extension crashes with expected error message');
    }
    assert.ok(oldCrashed, 'Old extension crashes on default + namespace combination');

    // New extension handles gracefully
    const newResult = await organizeImportsNew(input);
    assert.strictEqual(newResult, expected, 'New extension handles default + namespace gracefully (keeps separate)');
  });

  // ============================================================================
  // Scoped packages with trailing /index
  // ============================================================================

  test('Scoped package with trailing index (removeTrailingIndex enabled)', async () => {
    const input = `import { helper } from '@company/utils/index';
import { config } from '@company/config';

const x = helper(config);
`;

    // Trailing /index should be removed from scoped packages
    const expected = `import { config } from '@company/config';
import { helper } from '@company/utils';

const x = helper(config);
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension removes /index from scoped packages');
    assert.strictEqual(newResult, expected, 'New extension removes /index from scoped packages');
  });

  test('Scoped package: /index and no /index with merging disabled', async () => {
    const input = `import { a } from '@company/utils/index';
import { b } from '@company/utils';

const x = a + b;
`;

    // Both extensions: removeTrailingIndex removes /index, merging disabled keeps imports separate
    // Result: Two separate imports from '@company/utils' (sorted by specifier)
    const expected = `import { b } from '@company/utils';
import { a } from '@company/utils';

const x = a + b;
`;

    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, {
      mergeImportsFromSameModule: false,
      disableImportRemovalOnOrganize: true
    });

    assert.strictEqual(oldResult, expected, 'Old extension removes /index and keeps imports separate');
    assert.strictEqual(newResult, expected, 'New extension removes /index and keeps imports separate');
  });

  test('Scoped package: /index timing in legacy mode', async () => {
    const input = `import { a } from '@company/utils/index';
import { b } from '@company/utils';

const x = a + b;
`;

    // Legacy mode replicates old extension's merge timing bug:
    // Merging happens BEFORE removeTrailingIndex, so these paths don't match and stay separate.
    // After that, removeTrailingIndex runs and both become '@company/utils'.
    // Result: Two separate imports with same path, sorted alphabetically by specifier.
    const expected = `import { b } from '@company/utils';
import { a } from '@company/utils';

const x = a + b;
`;

    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, {
      legacyMode: true,
      disableImportRemovalOnOrganize: true
    });

    assert.strictEqual(oldResult, expected, 'Old extension merge timing creates duplicate imports after /index removal');
    assert.strictEqual(newResult, expected, 'New extension in legacy mode replicates merge timing bug');
  });

  // ============================================================================
  // Property access false positives
  // ============================================================================

  test('Property names in object literals: both extensions keep import', async () => {
    const input = `import { map, filter, reduce } from 'rxjs/operators';

const obj = {
  map: 'value',
  filter: 'value2'
};

const x = obj.map;
const y = obj.filter;
const z = reduce([1, 2, 3], (a, b) => a + b);
`;

    // Both extensions detect 'map' and 'filter' as usage even though they are property names.
    // Conservative usage detection does not distinguish property names from references.
    const expected = `import { filter, map, reduce } from 'rxjs/operators';

const obj = {
  map: 'value',
  filter: 'value2'
};

const x = obj.map;
const y = obj.filter;
const z = reduce([1, 2, 3], (a, b) => a + b);
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension keeps imports (conservative usage detection)');
    assert.strictEqual(newResult, expected, 'New extension matches old behavior (conservative usage detection)');
  });

  // ============================================================================
  // Shadowing and scope detection (tests usage detection limits)
  // ============================================================================

  test('Destructuring pattern: both extensions keep import', async () => {
    const input = `import { Component, Directive } from '@angular/core';

const { Component: LocalComponent } = someObject;

const x = Directive;
`;

    // Both extensions detect 'Component' as usage even though it's a destructuring binding.
    // Usage detection does not distinguish binding patterns from references.
    const expected = `import { Component, Directive } from '@angular/core';

const { Component: LocalComponent } = someObject;

const x = Directive;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension keeps Component (conservative usage detection)');
    assert.strictEqual(newResult, expected, 'New extension matches old behavior (conservative usage detection)');
  });

  test('Function parameter: both extensions keep import', async () => {
    const input = `import { Service, Component } from '@angular/core';

function createComponent(Component: any) {
  return Component;
}

const x = Service;
`;

    // Both extensions detect 'Component' as usage even though it's a parameter name.
    // Usage detection does not distinguish parameter bindings from references.
    const expected = `import { Component, Service } from '@angular/core';

function createComponent(Component: any) {
  return Component;
}

const x = Service;
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(oldResult, expected, 'Old extension keeps Component (conservative usage detection)');
    assert.strictEqual(newResult, expected, 'New extension matches old behavior (conservative usage detection)');
  });
});
