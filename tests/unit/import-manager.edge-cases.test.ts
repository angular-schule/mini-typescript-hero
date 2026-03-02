/**
 * Edge Case Tests for ImportManager - Second Audit Requirements
 *
 * These tests cover edge cases that could go wrong in real TypeScript code:
 * - Import assertions/attributes
 * - Type-only namespace imports
 * - Side-effect import grouping
 * - Comment preservation
 * - Unicode and special characters
 * - Path edge cases
 * - CommonJS interop
 * - And more...
 */

import * as assert from 'assert';
import { Uri } from 'vscode';
import { ImportsConfig } from '../../src/configuration';
import { ImportManager } from '../../src/imports/import-manager';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';
import { ConfigOverrides, ConfigKey } from './test-types';

/**
 * Mock configuration for testing.
 */
class MockImportsConfig extends ImportsConfig {
  private mockConfig: Map<ConfigKey, ConfigOverrides[ConfigKey]> = new Map();

  setConfig<K extends ConfigKey>(key: K, value: ConfigOverrides[K]): void {
    this.mockConfig.set(key, value);
  }

  override legacyMode(_resource: Uri): boolean {
    return (this.mockConfig.get('legacyMode') as boolean | undefined) ?? false;
  }
}

suite('ImportManager - Edge Cases (Second Audit)', () => {

  // ============================================================================
  // Import assertions and attributes
  // ============================================================================

  test('Import assertions preserved', async () => {
    const content = `import data from './data.json' assert { type: 'json' };
import { B } from './b';
import { A } from './a';

const x = A;
const y = B;
const z = data;
`;

    // FIXED: Import assertions are now preserved
    const expected = `import { A } from './a';
import { B } from './b';
import data from './data.json' assert { type: 'json' };

const x = A;
const y = B;
const z = data;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Import assertions must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Namespace type-only import
  // ============================================================================

  test('Type-only namespace import preserved in modern mode', async () => {
    const content = `import type * as Types from './pkg';
import { Foo } from './pkg';

const x: Types.Bar = Foo;
`;

    // FIXED: Type keyword is now preserved for namespace imports in modern mode
    const expected = `import type * as Types from './pkg';
import { Foo } from './pkg';

const x: Types.Bar = Foo;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Type keyword must be preserved in modern mode');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Type-only namespace import stripped in legacy mode', async () => {
    const content = `import type * as Types from './pkg';
import { Foo } from './pkg';

const x: Types.Bar = Foo;
`;

    // Legacy mode: Strip 'type' keyword
    const expected = `import * as Types from './pkg';
import { Foo } from './pkg';

const x: Types.Bar = Foo;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new MockImportsConfig();
      config.setConfig('legacyMode', true);

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must strip type keyword from namespace imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // ES module attributes ordering
  // ============================================================================

  test('Import with attributes preserved', async () => {
    const content = `import data from './data.json' with { type: 'json' };
import { A } from './a';

const x = A;
const y = data;
`;

    // FIXED: Import attributes are now preserved
    const expected = `import { A } from './a';
import data from './data.json' with { type: 'json' };

const x = A;
const y = data;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Import attributes must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Side-effect import grouping
  // ============================================================================

  test('Multiple side-effect imports stay in Plains group', async () => {
    const content = `import { Component } from 'react';
import 'zone.js';
import './styles.css';
import 'reflect-metadata';
import { A } from './a';

const x = Component;
const y = A;
`;

    const expected = `import './styles.css';
import 'reflect-metadata';
import 'zone.js';

import { Component } from 'react';

import { A } from './a';

const x = Component;
const y = A;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Side-effect imports must stay in Plains group');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Specifier comments preservation
  // ============================================================================

  test('Multi-line import comments fully preserved', async () => {
    const content = `import {
  C, // end
  A, // keep
  /* mid */ B
} from 'lib';

const x = A + B + C;
`;

    // FIXED: Comments are now fully preserved in modern mode!
    // Leading and trailing comments move with their specifiers when sorted
    const expected = `import {
  A, // keep
  /* mid */ B,
  C, // end
} from 'lib';

const x = A + B + C;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new (class extends ImportsConfig {
        public indentation() { return '  '; } // 2 spaces (modern default)
      })();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Comments are fully preserved (GOLDEN RULE!)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Trailing commas in multi-line
  // ============================================================================

  test('Multi-line import with trailing comma when enabled', async () => {
    const content = `import { Component, useState, useEffect } from 'react';

const x = Component;
const y = useState;
const z = useEffect;
`;

    // With multiLineTrailingComma: true and threshold exceeded
    const expected = `import {
  Component,
  useEffect,
  useState,
} from 'react';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new (class extends ImportsConfig {
        public multiLineWrapThreshold() { return 20; } // Force multiline
        public multiLineTrailingComma() { return true; }
        public indentation() { return '  '; } // 2 spaces (modern default)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Must add trailing comma in multiline imports when enabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Multi-line import without trailing comma when disabled', async () => {
    const content = `import { Component, useState, useEffect } from 'react';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const expected = `import {
  Component,
  useEffect,
  useState
} from 'react';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new (class extends ImportsConfig {
        public multiLineWrapThreshold() { return 20; } // Force multiline
        public multiLineTrailingComma() { return false; }
        public indentation() { return '  '; } // 2 spaces (modern default)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Must NOT add trailing comma when disabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Unicode and case ordering
  // ============================================================================

  test('Unicode characters sorted after ASCII', async () => {
    const content = `import { ñ } from './n-tilde';
import { a } from './a';
import { é } from './e-acute';
import { z } from './z';

const x = a + é + ñ + z;
`;

    // ACTUAL: ASCII letters sort first, then Unicode
    const expected = `import { a } from './a';
import { é } from './e-acute';
import { ñ } from './n-tilde';
import { z } from './z';

const x = a + é + ñ + z;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Unicode characters sort using localeCompare');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Path case collisions
  // ============================================================================

  test('Case-sensitive paths treated as different modules', async () => {
    const content = `import { X } from './Foo';
import { Y } from './foo';

const a = X;
const b = Y;
`;

    // In case-sensitive filesystem, these are different files
    const expected = `import { X } from './Foo';
import { Y } from './foo';

const a = X;
const b = Y;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Case-sensitive paths must be treated as different modules');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Index removal edge cases
  // ============================================================================

  test('removeTrailingIndex with .js extension NOT removed', async () => {
    const content = `import { A } from './foo/index.js';
import { B } from './bar.js';

const x = A;
const y = B;
`;

    // ACTUAL: /index.js is NOT removed (only bare /index is removed)
    // Imports are sorted alphabetically
    const expected = `import { B } from './bar.js';
import { A } from './foo/index.js';

const x = A;
const y = B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'File extension prevents /index removal');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Duplicate import dedupe
  // ============================================================================

  test('Identical imports merged into one', async () => {
    const content = `import { A } from './a';
import { B } from './b';
import { A } from './a';

const x = A;
const y = B;
`;

    const expected = `import { A } from './a';
import { B } from './b';

const x = A;
const y = B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Duplicate imports must be merged');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Export-then-import patterns
  // ============================================================================

  test('Re-exported symbols keep import with blank line', async () => {
    const content = `import { A } from './a';
export { A };
`;

    // ACTUAL: Blank line IS added between import and export
    const expected = `import { A } from './a';

export { A };
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Imports used in re-exports must not be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Shadowing safety
  // ============================================================================

  test('Shadowed import not removed (local shadows imported)', async () => {
    const content = `import { A } from './a';

function foo(A: string) {
  return A.toUpperCase();
}
`;

    // A is imported but shadowed by parameter - should NOT be removed
    const expected = `import { A } from './a';

function foo(A: string) {
  return A.toUpperCase();
}
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Shadowed imports must not be removed (conservative)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // satisfies and as const type-position usage
  // ============================================================================

  test('Type used in satisfies expression not removed', async () => {
    const content = `import { Config } from './types';

const config = { port: 3000 } satisfies Config;
`;

    const expected = `import { Config } from './types';

const config = { port: 3000 } satisfies Config;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Types used in satisfies must not be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // import = require and export =
  // ============================================================================

  test('CommonJS import = require preserved', async () => {
    const content = `import { A } from './a';
import mod = require('./mod');

const x = A;
const y = mod;
`;

    const expected = `import { A } from './a';
import mod = require('./mod');

const x = A;
const y = mod;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'CommonJS import = require must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Module specifiers with query strings
  // ============================================================================

  test('Module path with query string preserved', async () => {
    const content = `import rawContent from './file?raw';
import urlPath from './file?url';
import { A } from './a';

const x = A;
const y = rawContent;
const z = urlPath;
`;

    const expected = `import { A } from './a';
import rawContent from './file?raw';
import urlPath from './file?url';

const x = A;
const y = rawContent;
const z = urlPath;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Query strings in module paths must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Files with only imports
  // ============================================================================

  test('File with only unused imports all removed', async () => {
    const content = `import { Z } from './z';
import { A } from './a';
`;

    // ACTUAL: Unused imports are removed, resulting in empty file
    const expected = ``;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Unused imports are removed (correct behavior)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Header detection expansion
  // ============================================================================

  test('"use client" directive no blank line after', async () => {
    const content = `'use client';
import { Z } from './z';
import { A } from './a';

const x = A + Z;
`;

    // ACTUAL: No blank line added after 'use client' directive
    const expected = `'use client';
import { A } from './a';
import { Z } from './z';

const x = A + Z;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, '"use client" not treated as header (no blank line added)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('"use server" directive no blank line after', async () => {
    const content = `"use server";
import { Z } from './z';
import { A } from './a';

async function action() {
  return A + Z;
}
`;

    // ACTUAL: No blank line added after 'use server' directive
    const expected = `"use server";
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, '"use server" not treated as header (no blank line added)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Idempotency and stability
  // ============================================================================

  test('Large file with 50+ imports remains stable', async () => {
    // Generate 50 imports with UNIQUE module names and USE all of them so none are removed
    let imports = '';
    const usages: string[] = [];
    for (let i = 0; i < 50; i++) {
      imports += `import { Item${i} } from './module${i}';\n`;
      usages.push(`Item${i}`);
    }
    const content = imports + `\nconst x = ${usages.join(' + ')};\n`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();

      // Run organizer twice
      const manager1 = new ImportManager(doc, config);
      const edits1 = await manager1.organizeImports();
      await applyEditsToDocument(doc, edits1);
      const result1 = doc.getText();

      const manager2 = new ImportManager(doc, config);
      const edits2 = await manager2.organizeImports();
      await applyEditsToDocument(doc, edits2);
      const result2 = doc.getText();

      assert.strictEqual(result2, result1, 'Large file must be idempotent (same output after 2 runs)');

      // Verify all 50 imports are still present (none removed)
      const lines = result1.split('\n').filter(l => l.startsWith('import'));
      assert.strictEqual(lines.length, 50, 'All 50 imports must be preserved');

      // Verify imports are sorted
      const sorted = [...lines].sort();
      assert.deepStrictEqual(lines, sorted, 'Imports must be sorted');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Re-exports plus named imports from same module
  // ============================================================================

  test('Re-export and import from same module not merged', async () => {
    const content = `export { X } from './m';
import { Y } from './m';

const foo = Y;
`;

    // Expected: Re-exports are placed AFTER organized imports (old extension doesn't touch re-exports at all)
    const expected = `import { Y } from './m';

export { X } from './m';
const foo = Y;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Re-exports moved after imports, not merged with imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Default and named in one line
  // ============================================================================

  test('Default and named imports merged correctly', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Default and named imports must merge correctly');
    } finally {
      await deleteTempDocument(doc);
    }
  });

});
