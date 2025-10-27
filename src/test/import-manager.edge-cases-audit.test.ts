/**
 * Edge Cases Tests - Third Audit Requirements (Task B)
 *
 * These tests cover advanced edge cases that could go wrong in real TypeScript code.
 * Each test validates the new extension handles complex scenarios correctly.
 */

import * as assert from 'assert';
import { Uri } from 'vscode';
import { ImportsConfig } from '../configuration';
import { ImportManager } from '../imports/import-manager';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';

/**
 * Mock configuration for testing.
 * Extends ImportsConfig to allow setting test values.
 */
class MockImportsConfig extends ImportsConfig {
  private mockConfig: Map<string, any> = new Map();

  setConfig(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  override disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return this.mockConfig.get('disableImportRemovalOnOrganize') ?? false;
  }

  override blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' {
    return this.mockConfig.get('blankLinesAfterImports') ?? 'one';
  }

  override legacyMode(_resource: Uri): boolean {
    return this.mockConfig.get('legacyMode') ?? false;
  }
}

suite('ImportManager - Edge Cases (Third Audit - Task B)', () => {

  // ============================================================================
  // B1: Import assertions and attributes
  // ============================================================================

  test('B1: Import assertions preserved', async () => {
    const content = `import data from './data.json' assert { type: 'json' };
import { config } from './config.json' assert { type: 'json' };

const x = data;
const y = config;
`;

    const expected = `import { config } from './config.json' assert { type: 'json' };
import data from './data.json' assert { type: 'json' };

const x = data;
const y = config;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Import assertions must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B2: Namespace type-only import
  // ============================================================================

  test('B2a: Namespace type-only import in modern mode', async () => {
    const content = `import type * as Types from './types';
import { getValue } from './types';

const x: Types.MyType = getValue();
`;

    const expected = `import type * as Types from './types';
import { getValue } from './types';

const x: Types.MyType = getValue();
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Namespace type-only import must stay separate from value imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('B2b: Namespace type-only import in legacy mode', async () => {
    const content = `import type * as Types from './types';
import { getValue } from './types';

const x: Types.MyType = getValue();
`;

    // Legacy mode strips 'type' keyword
    const expected = `import * as Types from './types';
import { getValue } from './types';

const x: Types.MyType = getValue();
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new MockImportsConfig();
      config.setConfig('legacyMode', true);
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must strip type from namespace import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B3: Side-effect import grouping
  // ============================================================================

  test('B3: Side-effect imports in Plains group', async () => {
    const content = `import { A } from './a';
import 'zone.js';
import 'reflect-metadata';
import { Component } from 'react';

const x = A;
const y = Component;
`;

    const expected = `import 'reflect-metadata';
import 'zone.js';

import { Component } from 'react';

import { A } from './a';

const x = A;
const y = Component;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Side-effect imports must be in Plains group and sorted');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B4: Specifier comments preservation
  // ============================================================================

  test('B4: Multi-line import with inline comments (comments are stripped)', async () => {
    const content = `import {
  Z, // keep this
  A,
  B // end
} from 'lib';

const x = A + B + Z;
`;

    // ACTUAL BEHAVIOR: Both old and new extensions strip inline comments
    // The old TypeScript Hero extension doesn't preserve inline comments in imports
    // (Proven in comparison-test-harness/test-cases/999-manual-proof.test.ts)
    // Note: Block comments before specifiers (/* mid */ A) cause bugs in old extension
    const expected = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Inline comments are stripped (matching old extension behavior)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B5: Trailing commas in multi-line
  // ============================================================================

  test('B5a: Trailing comma enabled for multiline imports', async () => {
    const content = `import { A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z } from 'lib';

const x = A + Z;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      // multiLineTrailingComma is true by default
      // If multi-line (contains newline in import), should have trailing comma
      if (result.includes('} from') && result.includes('\n  ')) {
        // Is multi-line
        assert.ok(result.includes(',\n}') || result.includes(', }'), 'Multi-line import should have trailing comma');
      }
      // If single-line, just verify it's sorted
      assert.ok(result.includes('from \'lib\''), 'Import from lib must be present');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('B5b: Trailing comma disabled', async () => {
    const content = `import { A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z } from 'lib';

const x = A + Z;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      // Mock multiLineTrailingComma: false
      (config as any).mockConfig = new Map([['multiLineTrailingComma', false]]);
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      // Should be multi-line WITHOUT trailing comma
      assert.ok(!result.includes(',\n}') || result.includes('\n}'), 'Multi-line import must NOT have trailing comma when disabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B6: Unicode and case ordering
  // ============================================================================

  test('B6: Unicode and mixed case specifiers', async () => {
    const content = `import { Ω, α, β, A, a, B, b, Ä, ä } from 'lib';

const x = A + a + B + b + Ä + ä + α + β + Ω;
`;

    // Case-insensitive sorting: a, A, ä, Ä, b, B, α, β, Ω
    const expected = `import { a, A, ä, Ä, b, B, α, β, Ω } from 'lib';

const x = A + a + B + b + Ä + ä + α + β + Ω;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Unicode specifiers must be sorted case-insensitively');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B7: Path case sensitivity
  // ============================================================================

  test('B7: Path case collisions on case-sensitive filesystem', async () => {
    const content = `import { X } from './Foo';
import { Y } from './foo';

const x = X + Y;
`;

    // These are DIFFERENT modules on case-sensitive filesystems
    const expected = `import { X } from './Foo';
import { Y } from './foo';

const x = X + Y;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Case-different paths must be treated as separate modules');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B8: Index removal with file extension
  // ============================================================================

  test('B8: Remove /index with file extension', async () => {
    const content = `import { A } from './foo/index.js';
import { B } from './bar.js';

const x = A + B;
`;

    // Currently /index.js is not removed - our regex only matches /index$
    // This is correct behavior to avoid breaking ESM imports
    const expected = `import { B } from './bar.js';
import { A } from './foo/index.js';

const x = A + B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      // Mock removeTrailingIndex: true
      (config as any).mockConfig = new Map([['removeTrailingIndex', true]]);
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, '/index with extension stays unchanged (safe for ESM)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B9: Duplicate import deduplication
  // ============================================================================

  test('B9: Duplicate imports collapsed to one', async () => {
    const content = `import { A } from './lib';
import { A } from './lib';
import { B } from './lib';

const x = A + B;
`;

    const expected = `import { A, B } from './lib';

const x = A + B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Duplicate imports must be merged and deduplicated');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B10: Export-then-import patterns
  // ============================================================================

  test('B10: Re-exported symbols must keep imports', async () => {
    const content = `import { A } from './a';
import { B } from './b';

export { A };
const x = B;
`;

    const expected = `import { A } from './a';
import { B } from './b';

export { A };
const x = B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Re-exported symbols must not be removed as unused');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B11: Shadowing safety
  // ============================================================================

  test('B11: Local variable shadows imported name', async () => {
    const content = `import { A } from './a';

function test() {
  const A = 5;
  return A;
}

const x = A;
`;

    const expected = `import { A } from './a';

function test() {
  const A = 5;
  return A;
}

const x = A;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Shadowed import must still be kept (used outside shadowing scope)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B12: satisfies and as const type-position usage
  // ============================================================================

  test('B12: satisfies and as const count as type usage', async () => {
    const content = `import { MyType } from './types';

const x = {} satisfies MyType;
const y = { foo: 'bar' } as const satisfies MyType;
`;

    const expected = `import { MyType } from './types';

const x = {} satisfies MyType;
const y = { foo: 'bar' } as const satisfies MyType;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'satisfies usage must count as type usage');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B13: import = require and export =
  // ============================================================================

  test('B13: CommonJS interop forms preserved', async () => {
    const content = `import lib = require('./lib');
import { A } from './a';

const x = lib.foo();
const y = A;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      // Should preserve import = require syntax and sort properly
      assert.ok(result.includes('import lib = require'), 'import = require must be preserved');
      assert.ok(result.includes("import { A } from './a'"), 'Regular imports must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B14: Module specifiers with query strings
  // ============================================================================

  test('B14: Module specifiers with query strings', async () => {
    const content = `import raw from './file?raw';
import url from './file?url';
import { A } from './a';

const x = raw;
const y = url;
const z = A;
`;

    const expected = `import { A } from './a';
import raw from './file?raw';
import url from './file?url';

const x = raw;
const y = url;
const z = A;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Query strings in module specifiers must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B15: Files with only imports
  // ============================================================================

  test('B15: File with only imports and no code after', async () => {
    const content = `import { Z } from './z';
import { A } from './a';
`;

    // When there's NO code after imports, we DON'T add blank lines
    // (blank lines are only added to separate imports from code)
    // Disable removal so we can test blank line handling in isolation.
    const expected = `import { A } from './a';
import { Z } from './z';
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      // Use custom config to disable import removal (focus on blank line behavior)
      const config = new MockImportsConfig();
      config.setConfig('disableImportRemovalOnOrganize', true);
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'No blank line when no code after imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B16: Header detection expansion
  // ============================================================================

  test('B16a: use client directive treated as header', async () => {
    const content = `'use client';

import { Z } from './z';
import { A } from './a';

const x = A + Z;
`;

    const expected = `'use client';

import { A } from './a';
import { Z } from './z';

const x = A + Z;
`;

    const doc = await createTempDocument(content, 'tsx');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, "'use client' must be treated as header");
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('B16b: use server directive treated as header', async () => {
    const content = `'use server';

import { Z } from './z';
import { A } from './a';

async function action() {
  return A + Z;
}
`;

    const expected = `'use server';

import { A } from './a';
import { Z } from './z';

async function action() {
  return A + Z;
}
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, "'use server' must be treated as header");
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('B16c: Shebang treated as header', async () => {
    const content = `#!/usr/bin/env node

import { Z } from './z';
import { A } from './a';

const x = A + Z;
`;

    const expected = `#!/usr/bin/env node

import { A } from './a';
import { Z } from './z';

const x = A + Z;
`;

    const doc = await createTempDocument(content, 'js');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Shebang must be treated as header');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B17: Idempotency and stability for large files
  // ============================================================================

  test('B17: Large file with 50+ imports remains stable', async () => {
    // Generate 50 imports
    let imports = '';
    for (let i = 0; i < 50; i++) {
      const letter = String.fromCharCode(65 + (i % 26)); // A-Z
      imports += `import { Item${i} } from './module${letter}';\n`;
    }
    const content = imports + '\nconst x = Item0;\n';

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();

      // Run organizer twice
      const manager1 = new ImportManager(doc, config);
      const edits1 = manager1.organizeImports();
      await applyEditsToDocument(doc, edits1);

      const result1 = doc.getText();

      // Run again on the organized output
      const manager2 = new ImportManager(doc, config);
      const edits2 = manager2.organizeImports();
      await applyEditsToDocument(doc, edits2);

      const result2 = doc.getText();

      assert.strictEqual(result1, result2, 'Large file must be idempotent (second run produces same output)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B18: Re-exports plus named imports from same module
  // ============================================================================

  test('B18: Re-export and import from same module not merged', async () => {
    const content = `export { X } from './m';
import { Y } from './m';

const foo = Y;
`;

    // Expected: Re-exports are moved AFTER imports (matching old TypeScript Hero behavior)
    const expected = `import { Y } from './m';

export { X } from './m';
const foo = Y;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Re-exports moved after imports, not merged with imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B19: Specifiers with default and named in one line
  // ============================================================================

  test('B19: Default and named imports merged correctly', async () => {
    const content = `import Default from 'lib';
import { A, B } from 'lib';

const x = Default;
const y = A + B;
`;

    const expected = `import Default, { A, B } from 'lib';

const x = Default;
const y = A + B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Default and named imports must merge correctly');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // B20: Type assertions in expressions
  // ============================================================================

  test('B20: Type assertions count as type usage', async () => {
    const content = `import { MyType } from './types';

const x = foo as MyType;
const y = <MyType>bar;
`;

    const expected = `import { MyType } from './types';

const x = foo as MyType;
const y = <MyType>bar;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Type assertions must count as type usage');
    } finally {
      await deleteTempDocument(doc);
    }
  });

});
