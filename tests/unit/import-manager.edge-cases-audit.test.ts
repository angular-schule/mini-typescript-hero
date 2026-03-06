/**
 * Edge Cases Tests - Third Audit Requirements (Task B)
 *
 * These tests cover advanced edge cases that could go wrong in real TypeScript code.
 * Each test validates the new extension handles complex scenarios correctly.
 */

import * as assert from 'assert';
import { Uri } from 'vscode';
import { ImportsConfig } from '../../src/configuration';
import { ImportManager } from '../../src/imports/import-manager';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';
import { ConfigOverrides, ConfigKey } from './test-types';

/**
 * Mock configuration for testing.
 * Extends ImportsConfig to allow setting test values.
 */
class MockImportsConfig extends ImportsConfig {
  private mockConfig: Map<ConfigKey, ConfigOverrides[ConfigKey]> = new Map();

  setConfig<K extends ConfigKey>(key: K, value: ConfigOverrides[K]): void {
    this.mockConfig.set(key, value);
  }

  override disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return (this.mockConfig.get('disableImportRemovalOnOrganize') as boolean | undefined) ?? false;
  }

  override blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' {
    return (this.mockConfig.get('blankLinesAfterImports') as 'one' | 'two' | 'preserve' | undefined) ?? 'one';
  }

  override legacyMode(_resource: Uri): boolean {
    return (this.mockConfig.get('legacyMode') as boolean | undefined) ?? false;
  }
}

suite('ImportManager - Edge Cases (Third Audit - Task B)', () => {

  // ============================================================================
  // Import assertions and attributes
  // ============================================================================

  test('Import assertions preserved', async () => {
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

  test('Namespace type-only import in modern mode', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Namespace type-only import must stay separate from value imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Namespace type-only import in legacy mode', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must strip type from namespace import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Side-effect import grouping
  // ============================================================================

  test('Side-effect imports in Plains group', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Side-effect imports must be in Plains group and sorted');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Specifier comments preservation
  // ============================================================================

  test('Multi-line import with inline comments preserved (modern mode)', async () => {
    const content = `import {
  Z, // keep this
  A,
  B // end
} from 'lib';

const x = A + B + Z;
`;

    // MODERN MODE: Preserve comments (golden rule: don't delete what the user wrote!)
    // The comments move with their specifiers when sorted
    // Note: Default multiLineTrailingComma is true, so trailing comma is added
    const expected = `import {
  A,
  B, // end
  Z, // keep this
} from 'lib';

const x = A + B + Z;
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
      assert.strictEqual(result, expected, 'Comments must be preserved in modern mode');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Inline comments preserved in legacy mode (planned difference from old extension)', async () => {
    const content = `import {
  Z, // keep this
  A,
  B // end
} from 'lib';

const x = A + B + Z;
`;

    // PLANNED DIFFERENCE: Old extension stripped specifier comments because its parser
    // (typescript-parser) couldn't parse them. Our extension CAN parse them, so stripping
    // them would violate the golden rule: never delete user content.
    // Comments trigger multiline wrapping.
    const expected = `import {
    A,
    B, // end
    Z, // keep this
} from 'lib';

const x = A + B + Z;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new MockImportsConfig();
      config.setConfig('legacyMode', true);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Comments must be preserved even in legacy mode');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Trailing commas in multi-line
  // ============================================================================

  test('Trailing comma enabled for multiline imports', async () => {
    const content = `import { Component, useState, useEffect } from 'lib';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const expected = `import {
  Component,
  useEffect,
  useState,
} from 'lib';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new (class extends ImportsConfig {
        public multiLineWrapThreshold() { return 20; } // Force multiline
        public multiLineTrailingComma() { return true; }
        public indentation() { return '  '; }
      })();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Multi-line import must have trailing comma when enabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Trailing comma disabled', async () => {
    const content = `import { Component, useState, useEffect } from 'lib';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const expected = `import {
  Component,
  useEffect,
  useState
} from 'lib';

const x = Component;
const y = useState;
const z = useEffect;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new (class extends ImportsConfig {
        public multiLineWrapThreshold() { return 20; } // Force multiline
        public multiLineTrailingComma() { return false; }
        public indentation() { return '  '; }
      })();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Multi-line import must NOT have trailing comma when disabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Unicode and case ordering
  // ============================================================================

  test('Unicode and mixed case specifiers (case-insensitive)', async () => {
    // typescript-parser uses toLowerCase() for case-insensitive sorting.
    // Order: A/a, B/b, Ä/ä, α, β, Ω (grouped by lowercase, then by original case within ties)
    const content = `import { Ω, α, β, A, a, B, b, Ä, ä } from 'lib';

const x = A + a + B + b + Ä + ä + α + β + Ω;
`;

    // Case-insensitive sort (toLowerCase + stringSort): A, a, B, b, Ä, ä, α, β, Ω
    const expected = `import { A, a, B, b, Ä, ä, α, β, Ω } from 'lib';

const x = A + a + B + b + Ä + ä + α + β + Ω;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Specifiers must be sorted case-insensitively (matching typescript-parser)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Unicode specifiers WITH comments (regression test for \p{ID_Continue} regex)
  // ============================================================================

  test('Unicode specifiers with trailing comments are preserved', async () => {
    // This tests that the extractSpecifierComments regex handles Unicode identifier
    // characters (not just ASCII [$\w]). ECMAScript allows Unicode letters in identifiers.
    const content = `import {
  Ω, // Greek capital letter omega
  α, // Greek small letter alpha
  café, // French word with accent
} from 'lib';

const x = Ω + α + café;
`;

    // Sorted alphabetically (case-insensitive), comments must travel with their specifiers
    const expected = `import {
  café, // French word with accent
  α, // Greek small letter alpha
  Ω, // Greek capital letter omega
} from 'lib';

const x = Ω + α + café;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Unicode specifier comments must be preserved when sorting');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Path case sensitivity
  // ============================================================================

  test('Path case collisions on case-sensitive filesystem', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Case-different paths must be treated as separate modules');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Index removal with file extension
  // ============================================================================

  test('Remove /index with file extension', async () => {
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
      const config = new MockImportsConfig();
      config.setConfig('removeTrailingIndex', true);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, '/index with extension stays unchanged (safe for ESM)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Duplicate import deduplication
  // ============================================================================

  test('Duplicate imports collapsed to one', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Duplicate imports must be merged and deduplicated');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Export-then-import patterns
  // ============================================================================

  test('Re-exported symbols must keep imports', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Re-exported symbols must not be removed as unused');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Re-export with from clause does not prevent removal of unrelated local import', async () => {
    const content = `import { Foo } from './foo';
export { Foo } from './bar';

const x = 1;
`;

    // The re-export gets Foo from './bar', not from the local import.
    // The local import { Foo } from './foo' is unused and should be removed.
    const expected = `export { Foo } from './bar';

const x = 1;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Re-export from other module must not keep unrelated local import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Shadowing safety
  // ============================================================================

  test('Local variable shadows imported name', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Shadowed import must still be kept (used outside shadowing scope)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // satisfies and as const type-position usage
  // ============================================================================

  test('satisfies and as const count as type usage', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'satisfies usage must count as type usage');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // import = require and export =
  // ============================================================================

  test('CommonJS interop forms preserved', async () => {
    const content = `import lib = require('./lib');
import { A } from './a';

const x = lib.foo();
const y = A;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
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
  // Module specifiers with query strings
  // ============================================================================

  test('Module specifiers with query strings', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Query strings in module specifiers must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Files with only imports
  // ============================================================================

  test('File with only imports and no code after', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'No blank line when no code after imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Header detection expansion
  // ============================================================================

  test('use client directive treated as header', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, "'use client' directive must be preserved before imports");
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('use server directive treated as header', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, "'use server' must be treated as header");
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Shebang treated as header', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Shebang must be treated as header');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Idempotency and stability for large files
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

      // Run again on the organized output
      const manager2 = new ImportManager(doc, config);
      const edits2 = await manager2.organizeImports();
      await applyEditsToDocument(doc, edits2);

      const result2 = doc.getText();

      assert.strictEqual(result1, result2, 'Large file must be idempotent (second run produces same output)');
      // Verify all 50 imports are still present (none removed)
      const importLines = result1.split('\n').filter(l => l.startsWith('import'));
      assert.strictEqual(importLines.length, 50, 'All 50 imports must be preserved');
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
  // Specifiers with default and named in one line
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

  // ============================================================================
  // Type assertions in expressions
  // ============================================================================

  test('Type assertions count as type usage', async () => {
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
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Type assertions must count as type usage');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Default + namespace import (import Default, * as ns from 'lib')
  // ============================================================================

  test('Default + namespace import — both used', async () => {
    const content = `import React, * as ReactAll from 'react';

const el = React.createElement('div');
const version = ReactAll.version;
`;

    const expected = `import React, * as ReactAll from 'react';

const el = React.createElement('div');
const version = ReactAll.version;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Both default and namespace must be preserved when both used');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Default + namespace import — only namespace used', async () => {
    const content = `import Default, * as ns from 'lib';

const x = ns.foo;
`;

    // Default is unused, should be stripped; namespace kept
    const expected = `import * as ns from 'lib';

const x = ns.foo;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Unused default must be stripped, namespace kept');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Default + namespace import — only default used', async () => {
    const content = `import Default, * as ns from 'lib';

const x = Default;
`;

    // Namespace is unused, convert to default-only import
    const expected = `import Default from 'lib';

const x = Default;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Unused namespace stripped, converted to default-only import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Default + namespace import — neither used', async () => {
    const content = `import Default, * as ns from 'lib';

const x = 42;
`;

    // Both unused — entire import removed
    const expected = `const x = 42;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Entire import removed when neither default nor namespace is used');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // Header block comment without * continuation lines
  // ============================================================================

  test('Block comment header with non-* continuation lines', async () => {
    // Block comment where continuation lines don't start with *
    const content = `/*
  License: MIT
  Author: Test
*/
import { B } from './b';
import { A } from './a';

const x = A + B;
`;

    const expected = `/*
  License: MIT
  Author: Test
*/
import { A } from './a';
import { B } from './b';

const x = A + B;
`;

    const doc = await createTempDocument(content, 'ts');
    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Block comment header with non-* lines must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // ============================================================================
  // GOLDEN RULE: Never delete user code between imports
  // ============================================================================

  test('Code between imports is preserved (moved after organized imports)', async () => {
    const content = `import { B } from './b';
config.init({ debug: true });
import { A } from './a';

console.log(A, B);
`;

    // Code between imports must be preserved — moved after the organized imports
    // The blank line separator goes AFTER preserved code (before the rest of the file)
    const expected = `import { A } from './a';
import { B } from './b';
config.init({ debug: true });

console.log(A, B);
`;

    const config = new ImportsConfig();
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Non-import code between imports must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Mix of comments and code between imports — both preserved', async () => {
    const content = `import { C } from './c';
// Section separator
const initValue = 42;
import { A } from './a';
import { B } from './b';

console.log(A, B, C, initValue);
`;

    const expected = `import { A } from './a';
import { B } from './b';
import { C } from './c';
// Section separator
const initValue = 42;

console.log(A, B, C, initValue);
`;

    const config = new ImportsConfig();
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Both comments and code between imports must be preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Legacy mode also preserves code between imports (planned difference from old extension)', async () => {
    const content = `import { B } from './b';
setupPolyfill();
import { A } from './a';

console.log(A, B);
`;

    // Even in legacy mode, code between imports must be preserved
    const expected = `import { A } from './a';
import { B } from './b';
setupPolyfill();

console.log(A, B);
`;

    const legacyConfig = new MockImportsConfig();
    legacyConfig.setConfig('legacyMode', true);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, legacyConfig);
      const edits = await manager.organizeImports();
      await applyEditsToDocument(doc, edits);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must also preserve code between imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

});
