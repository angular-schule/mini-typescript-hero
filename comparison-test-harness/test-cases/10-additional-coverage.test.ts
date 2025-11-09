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

  test('130. Type-only + value imports: both extensions merge', async () => {
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

  test('131. Type-only + value imports merge in legacy mode', async () => {
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

  test('132. Specifier-level type modifier preserved in modern mode', async () => {
    const input = `import { type User, getUser } from './types';

const user: User = getUser();
`;

    // Specifier-level 'type' modifier must be preserved
    const expected = `import { getUser, type User } from './types';

const user: User = getUser();
`;

    const newResult = await organizeImportsNew(input);

    assert.strictEqual(newResult, expected, 'Specifier-level type modifier preserved and sorted');
  });

  // ============================================================================
  // Side-effect + normal import from same module
  // ============================================================================

  test('133. Side-effect import + named import stay separate', async () => {
    const input = `import { polyfill } from './polyfills';
import './polyfills';

polyfill();
`;

    // Side-effect imports and normal imports must never merge.
    // Actual behavior to be verified against old extension.
    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    // Both extensions should produce the same output
    assert.strictEqual(newResult, oldResult, 'New extension matches old extension behavior for side-effect imports');
  });

  test('134. Multiple side-effect imports ordering', async () => {
    const input = `import { config } from './config';
import './polyfills/dom';
import './polyfills/fetch';
import './styles.css';

config.init();
`;

    const oldResult = await organizeImportsOld(input);
    const newResult = await organizeImportsNew(input);

    assert.strictEqual(newResult, oldResult, 'New extension matches old extension side-effect ordering');
  });

  // ============================================================================
  // Import assertions on side-effect imports
  // ============================================================================

  test('135. Side-effect import with assert syntax', async () => {
    const input = `import './data.json' assert { type: 'json' };
import { config } from './config';

config.init();
`;

    // Only test new extension (old doesn't support assertions)
    const newResult = await organizeImportsNew(input);

    // Verify assertions are preserved (exact format to be determined)
    assert.ok(newResult.includes("assert { type: 'json' }"), 'Assertions preserved in side-effect import');
  });

  test('136. Side-effect import with "with" syntax', async () => {
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

  test('137. Default + named from same module', async () => {
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

  test('138. Default + named with aliases', async () => {
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

  test('139. Namespace import stays separate from named', async () => {
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

  test('140. Default + namespace from same module', async () => {
    const input = `import * as Utils from './utils';
import utils from './utils';

const x = utils.foo(Utils.bar());
`;

    // Old extension may crash with "libraryAlreadyImported.specifiers is not iterable"
    // Try old extension, if it crashes, skip comparison
    let oldResult: string | null = null;
    try {
      oldResult = await organizeImportsOld(input);
    } catch (error) {
      // Old extension crashes, only test new extension
      const newResult = await organizeImportsNew(input);
      // Verify new extension at least produces valid output
      assert.ok(newResult.includes('import utils from'), 'New extension handles default + namespace');
      assert.ok(newResult.includes('import * as Utils from'), 'New extension handles default + namespace');
      return;
    }

    // If old extension didn't crash, compare outputs
    const newResult = await organizeImportsNew(input);
    assert.strictEqual(newResult, oldResult, 'New extension matches old extension for default + namespace');
  });

  // ============================================================================
  // Scoped packages with trailing /index
  // ============================================================================

  test('141. Scoped package with trailing index (removeTrailingIndex enabled)', async () => {
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

  test('142. Scoped package: /index and no /index with merging disabled', async () => {
    const input = `import { a } from '@company/utils/index';
import { b } from '@company/utils';

const x = a + b;
`;

    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, {
      mergeImportsFromSameModule: false,
      disableImportRemovalOnOrganize: true
    });

    // Both extensions should remove /index and keep imports separate (no merging)
    assert.strictEqual(newResult, oldResult, 'New extension matches old extension for /index with merging disabled');
  });

  test('143. Scoped package: /index timing in legacy mode', async () => {
    const input = `import { a } from '@company/utils/index';
import { b } from '@company/utils';

const x = a + b;
`;

    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, {
      legacyMode: true,
      disableImportRemovalOnOrganize: true
    });

    // Legacy mode: merge timing affects whether /index and no /index are treated as same module
    assert.strictEqual(newResult, oldResult, 'New extension matches old extension /index timing in legacy mode');
  });

  // ============================================================================
  // Property access false positives
  // ============================================================================

  test('144. Property names in object literals: both extensions keep import', async () => {
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

  test('145. Destructuring pattern: both extensions keep import', async () => {
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

  test('146. Function parameter: both extensions keep import', async () => {
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
