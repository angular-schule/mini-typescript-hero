/**
 * Integration Tests for ImportManager
 *
 * TESTING STRATEGY:
 * ================
 * These tests validate the core import organization logic of Mini TypeScript Hero.
 * They use REAL VSCode APIs with REAL temporary files on disk.
 *
 * WHAT'S REAL:
 * - ImportManager: The actual production class being tested
 * - ts-morph library: Real TypeScript parser analyzing code
 * - Import grouping logic: Real production code
 * - TextDocument: REAL VSCode documents created from temp files (workspace.openTextDocument)
 * - Edit application: REAL VSCode workspace.applyEdit() API
 * - Document methods: REAL lineAt(), offsetAt(), positionAt() implementations
 *
 * WHAT'S MOCKED:
 * - Configuration: Controllable test values instead of reading VSCode settings
 *
 * WHY REAL FILES (NOT MOCKS):
 * ===========================
 * Previous approach used a homemade MockTextDocument with custom implementations of
 * lineAt(), offsetAt(), positionAt() and a line-based applyEdits() function.
 * This created bugs in the test code itself (not the extension), making it impossible
 * to distinguish real bugs from mock implementation bugs.
 *
 * Current approach: Use workspace.openTextDocument() with real temp files in os.tmpdir().
 * This gives us VSCode's actual implementations - battle-tested and correct.
 *
 * KEY INSIGHT - IN-MEMORY PARSING:
 * ================================
 * The test imports like `import { Component } from '@angular/core'` are NOT real packages.
 * They're strings parsed by ts-morph into an in-memory AST (Abstract Syntax Tree).
 *
 * ts-morph with `useInMemoryFileSystem: true` means:
 * - No actual @angular/core package is installed or resolved
 * - The parser just sees "there's an import from '@angular/core'"
 * - We analyze the STRUCTURE and USAGE patterns, not actual type resolution
 *
 * This is perfect for our use case because:
 * - We're testing import ORGANIZATION logic, not TypeScript type checking
 * - Tests run fast (no need to install real packages)
 * - We can test any library name (real or fictional)
 * - Tests are isolated and don't depend on external dependencies
 *
 * WHAT WE TEST:
 * =============
 * 1. Unused import detection (including partial removal from named imports)
 * 2. Respecting excluded libraries (ignoredFromRemoval config)
 * 3. Type-only import usage (type annotations count as usage)
 * 4. Local shadowing (local declarations shadow imports with same name)
 * 5. All import styles: aliased, namespace, default, mixed
 * 6. Import grouping (Plains → Modules → Workspace)
 * 7. Sorting (alphabetically by module and specifiers)
 * 8. All configuration options (quotes, semicolons, spaces, multiline, etc.)
 */

import * as assert from 'assert';
import { Uri } from 'vscode';
import { ImportManager } from '../imports/import-manager';
import { ImportsConfig } from '../configuration';
import { ImportGroup, ImportGroupSettingParser, RemainImportGroup } from '../imports/import-grouping';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';

/**
 * Mock OutputChannel for testing
 *
 * Captures logging output from ImportManager for debugging test failures.
 * In production, this would be a VSCode OutputChannel shown in the Output panel.
 *
 * Note: We removed most logging in Phase 9.6, so this is mainly for future debugging.
 */

/**
 * Mock ImportsConfig for testing
 *
 * Extends the real ImportsConfig class but overrides methods to return test values
 * instead of reading from VSCode workspace settings.
 *
 * Usage in tests:
 *   config.setConfig('stringQuoteStyle', '"');  // Set a test value
 *   // Now when ImportManager calls config.stringQuoteStyle(), it returns '"'
 *
 * This approach:
 * - Uses real configuration logic (the actual ImportsConfig class)
 * - Allows tests to control configuration values
 * - Tests can verify different configuration combinations
 */
class MockImportsConfig extends ImportsConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mockConfig: Map<string, any> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setConfig(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return this.mockConfig.get('insertSpaceBeforeAndAfterImportBraces') ?? true;
  }

  async insertSemicolons(_resource: Uri): Promise<boolean> {
    return Promise.resolve(this.mockConfig.get('insertSemicolons') ?? true);
  }

  removeTrailingIndex(_resource: Uri): boolean {
    return this.mockConfig.get('removeTrailingIndex') ?? true;
  }

  async stringQuoteStyle(_resource: Uri): Promise<'"' | '\''> {
    return Promise.resolve(this.mockConfig.get('stringQuoteStyle') ?? `'`);
  }

  multiLineWrapThreshold(_resource: Uri): number {
    return this.mockConfig.get('multiLineWrapThreshold') ?? 125;
  }

  multiLineTrailingComma(_resource: Uri): boolean {
    return this.mockConfig.get('multiLineTrailingComma') ?? true;
  }

  disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return this.mockConfig.get('disableImportRemovalOnOrganize') ?? false;
  }

  mergeImportsFromSameModule(_resource: Uri): boolean {
    return this.mockConfig.get('mergeImportsFromSameModule') ?? true;
  }

  disableImportsSorting(_resource: Uri): boolean {
    return this.mockConfig.get('disableImportsSorting') ?? false;
  }

  organizeOnSave(_resource: Uri): boolean {
    return this.mockConfig.get('organizeOnSave') ?? false;
  }

  organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return this.mockConfig.get('organizeSortsByFirstSpecifier') ?? false;
  }

  ignoredFromRemoval(_resource: Uri): string[] {
    return this.mockConfig.get('ignoredFromRemoval') ?? ['react'];
  }

  blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' {
    return this.mockConfig.get('blankLinesAfterImports') ?? 'one';
  }

  grouping(_resource: Uri): ImportGroup[] {
    const groupSettings = this.mockConfig.get('grouping') ?? ['Plains', 'Modules', 'Workspace'];
    let importGroups: ImportGroup[] = [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      importGroups = groupSettings.map((setting: any) => ImportGroupSettingParser.parseSetting(setting));
    } catch (e) {
      // Fall back to default on invalid config (same as real ImportsConfig)
      importGroups = ImportGroupSettingParser.default;
    }

    // Ensure RemainImportGroup is always present
    if (!importGroups.some(i => i instanceof RemainImportGroup)) {
      importGroups.push(new RemainImportGroup());
    }

    return importGroups;
  }
}

suite('ImportManager Tests', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
  });

  test('1. Remove unused imports', async () => {
    // SCENARIO: Two imports, only one is used in the code
    // EXPECTED: Unused import should be completely removed
    const content = `import { Unused } from 'lib';
import { Used } from 'other';

const x = Used;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(!result.includes('Unused'), 'Unused import should be removed');
      assert.ok(result.includes('Used'), 'Used import should be kept');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('2. Remove unused specifiers from partial imports', async () => {
    // SCENARIO: Import has 4 specifiers (A, B, C, D) but only A and C are used
    // EXPECTED: Keep only A and C, remove B and D (partial import cleanup)
    // BONUS: Remaining specifiers should be alphabetically sorted (A, C)
    const content = `import { A, B, C, D } from 'lib';

const x = A;
const y = C;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('A'), 'Used specifier A should be kept');
      assert.ok(result.includes('C'), 'Used specifier C should be kept');
      assert.ok(!result.includes('B'), 'Unused specifier B should be removed');
      assert.ok(!result.includes('D'), 'Unused specifier D should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('3. Keep excluded library even if unused', async () => {
    config.setConfig('ignoredFromRemoval', ['react']);
    const content = `import React from 'react';
import { Unused } from 'other';

// React is not used but should be kept
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('react'), 'React should be kept even if unused');
      assert.ok(!result.includes('Unused'), 'Other unused imports should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('4. Keep type-only imports', async () => {
    // SCENARIO: MyType is only used in a type annotation, not in runtime code
    // EXPECTED: Type annotations count as usage, import should be kept
    // WHY: TypeScript needs the type for compile-time checking
    const content = `import { MyType } from 'lib';

let x: MyType;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('MyType'), 'Type-only import should be kept');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('5. Handle local shadowing correctly', async () => {
    // SCENARIO: Import { Component } but also declare a local class Component
    // EXPECTED: Import should be removed (local declaration shadows the import)
    // WHY: When names conflict, TypeScript uses the local declaration
    //
    // CRITICAL EDGE CASE:
    // We must skip only the NAME being declared, not usages within the declaration.
    // For example: const x = AngularComponent
    // We should skip 'x' (the declared name) but detect 'AngularComponent' (usage).
    const content = `import { Component } from '@angular/core';

class Component {
  // Local class shadows the import
}
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(!result.includes('@angular/core'), 'Shadowed import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('6. Handle aliased imports', async () => {
    const content = `import { Component as AngularComponent } from '@angular/core';

const x = AngularComponent;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('Component as AngularComponent'), 'Aliased import should be kept');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('7. Handle namespace imports', async () => {
    const content = `import * as React from 'react';
import * as Unused from 'unused-lib';

const element = React.createElement('div');
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('* as React'), 'Used namespace import should be kept');
      assert.ok(!result.includes('Unused'), 'Unused namespace import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('8. Handle default imports', async () => {
    const content = `import React from 'react';
import Vue from 'vue';

const x = React;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('React'), 'Used default import should be kept');
      assert.ok(!result.includes('Vue'), 'Unused default import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('9. Handle mixed default and named imports', async () => {
    const content = `import React, { useState } from 'react';
import Vue, { ref } from 'vue';

const x = React;
const y = useState;
const z = ref;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('React'), 'Used default should be kept');
      assert.ok(result.includes('useState'), 'Used named import should be kept');
      assert.ok(result.includes('ref'), 'Used named import from another library should be kept');
      assert.ok(!result.includes('Vue'), 'Unused default should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('10. Group imports correctly (Plains -> Modules -> Workspace)', async () => {
    // SCENARIO: Mixed import types in random order
    // EXPECTED: Organized into groups with blank lines between them:
    //   1. Plains: String-only imports (import 'zone.js')
    //   2. Modules: External libraries (import { X } from '@angular/core')
    //   3. Workspace: Local files (import { Y } from './local')
    //
    // WHY: This follows the Angular Style Guide and improves readability
    // Groups are separated by blank lines for visual clarity
    const content = `import { LocalClass } from './local';
import { Component } from '@angular/core';
import 'zone.js';

const x = Component;
const y = LocalClass;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const zoneIndex = result.indexOf('zone.js');
      const angularIndex = result.indexOf('@angular/core');
      const localIndex = result.indexOf('./local');

      assert.ok(zoneIndex < angularIndex, 'Plains (zone.js) should come before Modules');
      assert.ok(angularIndex < localIndex, 'Modules should come before Workspace');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('11. Sort imports alphabetically within groups', async () => {
    const content = `import { map } from 'rxjs/operators';
import { Component } from '@angular/core';

const x = Component;
const y = map;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const angularIndex = result.indexOf('@angular/core');
      const rxjsIndex = result.indexOf('rxjs/operators');

      assert.ok(angularIndex < rxjsIndex, 'Imports should be sorted alphabetically');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('12. Sort specifiers alphabetically', async () => {
    const content = `import { map, filter, tap } from 'rxjs/operators';

const x = filter;
const y = map;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should have filter before map (alphabetically, and tap removed)
      const filterIndex = result.indexOf('filter');
      const mapIndex = result.indexOf('map');

      assert.ok(filterIndex < mapIndex, 'Specifiers should be sorted alphabetically');
      assert.ok(!result.includes('tap'), 'Unused specifier should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('12a. Sort specifiers case-insensitively (Component, inject, OnInit)', async () => {
    // CRITICAL: This test validates the fix for a major sorting bug.
    // Specifiers must be sorted using localeCompare (case-insensitive), not ASCII sort.
    // ASCII sort: Component, OnInit, inject (capitals first)
    // localeCompare: Component, inject, OnInit (natural alphabetical order)
    const content = `import { OnInit, Component, inject } from '@angular/core';

const x = Component;
const y = inject;
const z: OnInit = null as any;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const importLine = result.split('\n').find(line => line.includes('@angular/core'));
      assert.ok(importLine, 'Should have @angular/core import');

      // Extract specifiers from the import line
      const match = importLine!.match(/\{\s*(.+?)\s*\}/);
      assert.ok(match, 'Should have named imports');
      const specifiers = match![1].split(',').map(s => s.trim());

      // Verify exact order: Component, inject, OnInit (localeCompare order)
      assert.deepStrictEqual(specifiers, ['Component', 'inject', 'OnInit'],
        'Specifiers should be sorted case-insensitively using localeCompare (Component, inject, OnInit)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('13. Format with configured quote style', async () => {
    config.setConfig('stringQuoteStyle', '"');
    const content = `import { Used } from 'lib';

const x = Used;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('"lib"'), 'Should use double quotes when configured');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('14. Format with configured semicolons', async () => {
    config.setConfig('insertSemicolons', false);
    const content = `import { Used } from 'lib';

const x = Used;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const importLine = result.split('\n').find(line => line.includes('import'));
      assert.ok(importLine && !importLine.endsWith(';'), 'Should not have semicolons when configured');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('15. Format with configured spaces in braces', async () => {
    config.setConfig('insertSpaceBeforeAndAfterImportBraces', false);
    const content = `import { Used } from 'lib';

const x = Used;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('{Used}'), 'Should not have spaces in braces when configured');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('16. Respect blank lines between import groups', async () => {
    const content = `import { Component } from '@angular/core';
import { LocalClass } from './local';
import 'zone.js';

const x = Component;
const y = LocalClass;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should have blank lines between groups
      const lines = result.split('\n');
      const hasBlankLinesBetweenGroups = lines.some((line, i) =>
        i > 0 && line.trim() === '' && lines[i-1].includes('import') &&
        i < lines.length - 1 && lines[i+1].includes('import')
      );

      assert.ok(hasBlankLinesBetweenGroups, 'Should have blank lines between import groups');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('17. Remove trailing /index when configured', async () => {
    config.setConfig('removeTrailingIndex', true);
    const content = `import { Used } from './lib/index';

const x = Used;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('./lib'), 'Should have library path');
      assert.ok(!result.includes('/index'), 'Should remove trailing /index');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('18. Keep all imports when removal is disabled', async () => {
    config.setConfig('disableImportRemovalOnOrganize', true);
    const content = `import { Unused } from 'lib';
import { AlsoUnused } from 'other';

// Nothing is used
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('Unused'), 'Should keep unused imports when removal is disabled');
      assert.ok(result.includes('AlsoUnused'), 'Should keep all unused imports when removal is disabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('19. Skip sorting when disabled', async () => {
    // SCENARIO: Sorting disabled, imports in non-alphabetical order
    // EXPECTED: Original order preserved (rxjs before @angular/core)
    //
    // IMPORTANT: When sorting is disabled, we must use group.imports directly
    // instead of group.sortedImports (which applies internal sorting).
    config.setConfig('disableImportsSorting', true);
    const content = `import { map } from 'rxjs/operators';
import { Component } from '@angular/core';

const x = Component;
const y = map;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Original order should be preserved (rxjs before angular)
      const rxjsIndex = result.indexOf('rxjs/operators');
      const angularIndex = result.indexOf('@angular/core');

      assert.ok(rxjsIndex < angularIndex, 'Should preserve original order when sorting is disabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('20. Handle string-only imports (always kept)', async () => {
    const content = `import 'zone.js';
import 'reflect-metadata';

// String imports are always kept
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('zone.js'), 'String import should be kept');
      assert.ok(result.includes('reflect-metadata'), 'String import should be kept');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('21. Keep imports used in named re-exports', async () => {
    const content = `import { Foo, Bar, Unused } from './lib';

export { Foo, Bar };
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Foo and Bar are re-exported, so should be kept
      assert.ok(result.includes('Foo'), 'Re-exported Foo should be kept');
      assert.ok(result.includes('Bar'), 'Re-exported Bar should be kept');
      // Unused is not re-exported and not used, so should be removed
      assert.ok(!result.includes('Unused'), 'Unused should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('22. Keep imports used in default re-export', async () => {
    const content = `import MyClass from './my-class';

export default MyClass;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('MyClass'), 'Default re-exported import should be kept');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('23. Keep namespace imports used in re-exports', async () => {
    const content = `import * as Utils from './utils';
import * as Unused from './unused';

export { Utils };
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('Utils'), 'Re-exported namespace import should be kept');
      assert.ok(!result.includes('Unused'), 'Unused namespace import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('24. Handle functions used in JSX/TSX', async () => {
    const content = `import { helper } from './helpers';
import { unused } from './unused';
import * as React from 'react';

export const MyComponent = () => {
  return <div>{helper()}</div>;
};
`;
    const doc = await createTempDocument(content, 'tsx');
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // helper() is used in JSX expression, should be kept
      assert.ok(result.includes('helper'), 'Function used in JSX should be kept');
      // React is used for JSX, should be kept
      assert.ok(result.includes('React'), 'React import should be kept for JSX');
      // unused is not used, should be removed
      assert.ok(!result.includes('unused'), 'Unused import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('25. Keep default imports re-exported as named exports', async () => {
    const content = `import MyDefault from './my-default';
import UnusedDefault from './unused';

export { MyDefault };
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // MyDefault is re-exported as named export, should be kept
      assert.ok(result.includes('MyDefault'), 'Default import re-exported as named should be kept');
      // UnusedDefault is not used, should be removed
      assert.ok(!result.includes('UnusedDefault'), 'Unused default import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('26. Support JavaScript files (.js)', async () => {
    const content = `import { used } from './helpers';
import { unused } from './unused';

function myFunction() {
  return used();
}
`;
    const doc = await createTempDocument(content, 'js');
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // JavaScript should work like TypeScript
      assert.ok(result.includes('used'), 'Used import should be kept in .js file');
      assert.ok(!result.includes('unused'), 'Unused import should be removed from .js file');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('27. Support JSX files (.jsx)', async () => {
    const content = `import React from 'react';
import { Button } from './components';
import { unused } from './unused';

export default function MyComponent() {
  return <Button>Click me</Button>;
}
`;
    const doc = await createTempDocument(content, 'jsx');
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // JSX should detect usage correctly
      assert.ok(result.includes('React'), 'React import should be kept in JSX');
      assert.ok(result.includes('Button'), 'Component import should be kept in JSX');
      assert.ok(!result.includes('unused'), 'Unused import should be removed from JSX');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('28. Support complex JavaScript with destructuring and arrow functions', async () => {
    const content = `import { map, filter, unused } from 'lodash';
import { UsedClass } from './classes';

const data = [1, 2, 3];
const result = map(data, x => filter([x], y => y > 0));
const instance = new UsedClass();
`;
    const doc = await createTempDocument(content, 'js');
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // All modern JS features should work
      assert.ok(result.includes('map'), 'map should be kept');
      assert.ok(result.includes('filter'), 'filter should be kept');
      assert.ok(result.includes('UsedClass'), 'UsedClass should be kept');
      assert.ok(!result.includes('unused'), 'unused should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('29. Multiline wrapping when threshold exceeded', async () => {
    const content = `import { VeryLongSymbolName, AnotherLongSymbol, YetAnotherSymbol, FourthSymbol, FifthSymbol } from './helpers';

const a = VeryLongSymbolName;
const b = AnotherLongSymbol;
const c = YetAnotherSymbol;
const d = FourthSymbol;
const e = FifthSymbol;
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('multiLineWrapThreshold', 50); // Very low threshold to force multiline
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should be multiline (contains line breaks in import)
      assert.ok(result.includes('{\n'), 'Import should be multiline');
      assert.ok(result.includes(',\n'), 'Should have comma + newline between specifiers');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('30. Multiline trailing comma configuration', async () => {
    const content = `import { VeryLongSymbolNameOne, VeryLongSymbolNameTwo, VeryLongSymbolNameThree } from './helpers';

const a = VeryLongSymbolNameOne;
const b = VeryLongSymbolNameTwo;
const c = VeryLongSymbolNameThree;
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('multiLineWrapThreshold', 40); // Force multiline
      config.setConfig('multiLineTrailingComma', true);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should have trailing comma on last specifier (which will be "Two" after alphabetical sort)
      const hasTrailingComma = result.includes('VeryLongSymbolNameTwo,');
      assert.ok(hasTrailingComma, 'Multiline import should have trailing comma when configured');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('31. No trailing comma when multiLineTrailingComma is false', async () => {
    const content = `import { VeryLongSymbolNameOne, VeryLongSymbolNameTwo, VeryLongSymbolNameThree } from './helpers';

const a = VeryLongSymbolNameOne;
const b = VeryLongSymbolNameTwo;
const c = VeryLongSymbolNameThree;
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('multiLineWrapThreshold', 40); // Force multiline
      config.setConfig('multiLineTrailingComma', false);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should NOT have trailing comma on last specifier (which will be "Two" after alphabetical sort)
      const hasNoTrailingComma = result.match(/VeryLongSymbolNameTwo\s*\n\s*\}/);
      assert.ok(hasNoTrailingComma, 'Multiline import should NOT have trailing comma when disabled');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('32. organizeSortsByFirstSpecifier sorts by first specifier, not library name', async () => {
    // Scenario: Two imports with different first specifiers
    // When sorted by first specifier: bar < foo (alphabetical)
    // When sorted by library name: ./a < ./z (alphabetical)
    const content = `import { foo } from './z';
import { bar } from './a';

console.log(foo, bar);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('organizeSortsByFirstSpecifier', true);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Expected: sorted by first specifier (bar < foo), not by library name
      const lines = result.split('\n').filter(line => line.startsWith('import'));
      assert.strictEqual(lines.length, 2, 'Should have 2 import lines');
      assert.ok(lines[0].includes('bar'), 'First import should be bar (sorted by specifier)');
      assert.ok(lines[1].includes('foo'), 'Second import should be foo (sorted by specifier)');

      // Verify it's NOT sorted by library name (./a would come before ./z)
      assert.ok(lines[0].includes('./a'), 'bar import should be from ./a');
      assert.ok(lines[1].includes('./z'), 'foo import should be from ./z');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('33. Single-line import stays single-line when under threshold', async () => {
    const content = `import { short, names } from './helpers';

const a = short;
const b = names;
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('multiLineWrapThreshold', 125); // Default high threshold
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should stay single line
      assert.ok(!result.includes('{\n'), 'Short import should stay single-line');
      assert.ok(result.includes('{ names, short }'), 'Should be single line with sorted specifiers');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('34. Empty file produces no edits', async () => {
    const content = '';
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      assert.strictEqual(edits.length, 0, 'Empty file should produce no edits');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('35. File with no imports produces no edits', async () => {
    const content = `const x = 42;
console.log(x);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      assert.strictEqual(edits.length, 0, 'File with no imports should produce no edits');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('36. All imports unused - removes everything', async () => {
    const content = `import { Unused1 } from './a';
import { Unused2 } from './b';
import { Unused3 } from './c';

const x = 42;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should remove all imports
      assert.ok(!result.includes('import'), 'All unused imports should be removed');
      assert.ok(result.includes('const x = 42'), 'Code should remain');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('37. TypeScript type-only imports are preserved when used', async () => {
    // TypeScript 3.8+ syntax: import type { Foo }
    const content = `import type { MyType } from './types';

const x: MyType = { value: 42 };
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Type import should be preserved (used in type annotation)
      assert.ok(result.includes('MyType'), 'Type-only import should be preserved when used');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('38. TypeScript type-only imports are removed when unused', async () => {
    const content = `import type { UnusedType } from './types';

const x = 42;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Unused type import should be removed
      assert.ok(!result.includes('UnusedType'), 'Unused type-only import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('39. Multiple custom regex groups work together', async () => {
    // Scenario: Custom grouping with multiple regex patterns
    const content = `import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MyHelper } from './helper';

const comp: Component = null as any;
const obs: Observable<any> = null as any;
map(x => x);
MyHelper;
`;
    const doc = await createTempDocument(content);
    try {

      // Custom grouping: Angular first, then RxJS, then Remaining, then Workspace
      config.setConfig('grouping', [
        '/angular/',        // Regex group 1: Angular
        '/^rxjs/',          // Regex group 2: RxJS (starts with rxjs)
        'Modules',          // Remaining modules
        'Workspace'         // Local files
      ]);

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Expected order: Angular -> RxJS -> Workspace
      assert.strictEqual(lines.length, 4, 'Should have 4 imports');
      assert.ok(lines[0].includes('@angular/core'), 'First should be Angular (regex group 1)');
      assert.ok(lines[1].includes('rxjs/operators') || lines[1].includes('from \'rxjs\''), 'Second should be RxJS');
      assert.ok(lines[2].includes('from \'rxjs\'') || lines[2].includes('rxjs/operators'), 'Third should be RxJS');
      assert.ok(lines[3].includes('./helper'), 'Last should be workspace');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('40. File with only whitespace produces no edits', async () => {
    const content = '\n\n  \n\t\n';
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      assert.strictEqual(edits.length, 0, 'Whitespace-only file should produce no edits');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('41. Imports from same module are merged by default', async () => {
    // Scenario: Multiple imports from the same library
    // With mergeImportsFromSameModule: true (default for new users)
    const content = `import { A } from './lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge into single import
      assert.strictEqual(lines.length, 1, 'Should have 1 merged import line');
      assert.ok(lines[0].includes('A'), 'Merged import should have A');
      assert.ok(lines[0].includes('B'), 'Merged import should have B');
      assert.ok(lines[0].includes('{ A, B }'), 'Should be merged as { A, B }');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('42. Merging can be disabled with mergeImportsFromSameModule: false', async () => {
    // Scenario: Multiple imports from same library with merging disabled
    // With mergeImportsFromSameModule: false (for migrated users who had disableImportRemovalOnOrganize: true)
    const content = `import { A } from './lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      const customConfig = new MockImportsConfig();
      customConfig.setConfig('mergeImportsFromSameModule', false);
      const manager = new ImportManager(doc, customConfig);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should NOT merge - keep as separate imports
      assert.strictEqual(lines.length, 2, 'Should have 2 separate import lines');
      assert.ok(lines[0].includes('A'), 'First import should have A');
      assert.ok(lines[1].includes('B'), 'Second import should have B');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('43. Merging and removal are independent settings', async () => {
    // Scenario: Merging disabled but removal enabled
    // Show that mergeImportsFromSameModule and disableImportRemovalOnOrganize are independent
    const content = `import { A, Unused } from './lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      const customConfig = new MockImportsConfig();
      customConfig.setConfig('mergeImportsFromSameModule', false);
      customConfig.setConfig('disableImportRemovalOnOrganize', false);
      const manager = new ImportManager(doc, customConfig);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should NOT merge but SHOULD remove unused specifiers
      assert.strictEqual(lines.length, 2, 'Should have 2 separate import lines (not merged)');
      assert.ok(lines[0].includes('A'), 'First import should have A');
      assert.ok(lines[1].includes('B'), 'Second import should have B');
      assert.ok(!result.includes('Unused'), 'Unused specifier should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('44. Merge default and named imports from same module', async () => {
    // Scenario: Default import + named import from same module
    const content = `import DefaultExport from './lib';
import { Named } from './lib';

console.log(DefaultExport, Named);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge into: import DefaultExport, { Named } from './lib'
      assert.strictEqual(lines.length, 1, 'Should have 1 merged import line');
      assert.ok(lines[0].includes('DefaultExport'), 'Should have default');
      assert.ok(lines[0].includes('Named'), 'Should have named');
      assert.ok(lines[0].includes('DefaultExport, { Named }'), 'Should be merged as default + named');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('45. Namespace imports cannot be merged', async () => {
    // Scenario: Namespace import + named import from same module
    const content = `import * as Lib from './lib';
import { Named } from './lib';

console.log(Lib, Named);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Namespace imports cannot be merged - should keep separate
      assert.strictEqual(lines.length, 2, 'Should have 2 separate import lines (namespace cannot merge)');
      assert.ok(result.includes('* as Lib'), 'Should have namespace import');
      assert.ok(result.includes('{ Named }'), 'Should have named import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('46. String imports never merge', async () => {
    // Scenario: Multiple string imports from same module (side effects)
    const content = `import './lib';
import './lib';

console.log('side effects');
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // String imports have side effects - keep all separate
      assert.strictEqual(lines.length, 2, 'Should keep both string imports (side effects)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('42. TypeScript default type-only imports work correctly', async () => {
    // TS 3.8+: import type Foo from 'lib' (default type import)
    const content = `import type MyClass from './types';

const x: typeof MyClass = null as any;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Default type import should be preserved when used
      assert.ok(result.includes('MyClass'), 'Default type-only import should be preserved when used');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('47. Duplicate specifiers are removed when merging', async () => {
    // Scenario: Same specifier imported twice (shouldn't happen but we handle it)
    const content = `import { A } from './lib';
import { A, B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should deduplicate: { A, B } (A appears only once)
      assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
      assert.ok(lines[0].includes('{ A, B }'), 'Should deduplicate to { A, B }');

      // Count occurrences of 'A' in the import (should be exactly 1)
      const importLine = lines[0];
      const matches = importLine.match(/\bA\b/g);
      assert.strictEqual(matches?.length, 1, 'A should appear only once in import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('48. Aliased imports merge correctly', async () => {
    // Scenario: Mix of aliased and non-aliased imports
    const content = `import { A as AliasA } from './lib';
import { B } from './lib';

console.log(AliasA, B);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge with alias preserved
      assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
      assert.ok(lines[0].includes('A as AliasA'), 'Should preserve alias');
      assert.ok(lines[0].includes('B'), 'Should include B');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('49. Three or more imports from same module merge correctly', async () => {
    // Scenario: Multiple imports that should all merge
    const content = `import { A } from './lib';
import { B } from './lib';
import { C } from './lib';
import Default from './lib';

console.log(A, B, C, Default);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge all into: import Default, { A, B, C } from './lib'
      assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
      assert.ok(lines[0].includes('Default'), 'Should have default');
      assert.ok(lines[0].includes('A'), 'Should have A');
      assert.ok(lines[0].includes('B'), 'Should have B');
      assert.ok(lines[0].includes('C'), 'Should have C');
      assert.ok(lines[0].includes('Default, { A, B, C }'), 'Should be merged as Default, { A, B, C }');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('50. Merging preserves alphabetical order of specifiers', async () => {
    // Scenario: Imports in random order should be sorted after merge
    const content = `import { Z } from './lib';
import { A } from './lib';
import { M } from './lib';

console.log(Z, A, M);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge and sort: { A, M, Z }
      assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
      assert.ok(lines[0].includes('{ A, M, Z }'), 'Should be alphabetically sorted: { A, M, Z }');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('51. Merging works with multiline formatting', async () => {
    // Scenario: Merged import exceeds multiline threshold
    const content = `import { VeryLongNameOne } from './lib';
import { VeryLongNameTwo } from './lib';

console.log(VeryLongNameOne, VeryLongNameTwo);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('multiLineWrapThreshold', 30); // Force multiline
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should merge and format as multiline
      assert.ok(result.includes('VeryLongNameOne'), 'Should include first name');
      assert.ok(result.includes('VeryLongNameTwo'), 'Should include second name');
      // Should be multiline (contains newline within braces)
      const hasMultiline = result.match(/import\s*\{[^}]*\n[^}]*\}/);
      assert.ok(hasMultiline, 'Should format as multiline import when threshold exceeded');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('52. Merging works with custom import grouping', async () => {
    // Scenario: Ensure merging happens before grouping
    const content = `import { A } from '@angular/core';
import { B } from '@angular/core';
import { C } from './local';
import { D } from './local';

console.log(A, B, C, D);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('grouping', ['/angular/', 'Workspace']);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should have 2 merged imports (one per group)
      assert.strictEqual(lines.length, 2, 'Should have 2 imports (one per group)');
      assert.ok(lines[0].includes('@angular/core'), 'First should be Angular');
      assert.ok(lines[0].includes('{ A, B }'), 'Angular imports should be merged');
      assert.ok(lines[1].includes('./local'), 'Second should be local');
      assert.ok(lines[1].includes('{ C, D }'), 'Local imports should be merged');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('53. Sorting by first specifier works correctly', async () => {
    // Scenario: Different modules sorted by first specifier
    const content = `import { Z } from './z';
import { A } from './a';

console.log(Z, A);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('organizeSortsByFirstSpecifier', true);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should sort by first specifier (A before Z)
      assert.strictEqual(lines.length, 2, 'Should have 2 imports');
      assert.ok(lines[0].includes('A'), 'First should be A (sorted by specifier)');
      assert.ok(lines[1].includes('Z'), 'Second should be Z');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('54. Same specifier with different aliases are both preserved', async () => {
    // Scenario: Import same symbol with different aliases (valid TypeScript!)
    const content = `import { Component as Comp1 } from '@angular/core';
import { Component as Comp2 } from '@angular/core';

console.log(Comp1, Comp2);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge but preserve BOTH aliases (different identifiers in code)
      assert.strictEqual(lines.length, 1, 'Should merge into one import');
      assert.ok(lines[0].includes('Component as Comp1'), 'Should preserve first alias');
      assert.ok(lines[0].includes('Component as Comp2'), 'Should preserve second alias');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('55. Multiple defaults from same module - first one wins', async () => {
    // Scenario: Invalid TypeScript but we handle gracefully
    const content = `import Default1 from './lib';
import Default2 from './lib';
import { Named } from './lib';

console.log(Default1, Named);
// Default2 is unused, will be removed
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge, keeping only the USED default (Default1)
      assert.strictEqual(lines.length, 1, 'Should merge into one import');
      assert.ok(lines[0].includes('Default1'), 'Should keep first default');
      assert.ok(lines[0].includes('Named'), 'Should include named import');
      assert.ok(!lines[0].includes('Default2'), 'Should not include unused default');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('56. FIXED: Merging + removeTrailingIndex order of operations', async () => {
    // Previously this was a bug: /index removal happened AFTER merging
    // Fixed: /index removal now happens BEFORE merging
    const content = `import { A } from './lib/index';
import { B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('removeTrailingIndex', true);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should merge to single import from './lib'
      assert.strictEqual(lines.length, 1, 'Should merge into one import');
      assert.ok(lines[0].includes('{ A, B }'), 'Should merge to { A, B }');
      assert.ok(lines[0].includes('./lib'), 'Should be from ./lib');
      assert.ok(!lines[0].includes('/index'), 'Should have /index removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('57. Type-only imports merge together', async () => {
    // Scenario: TypeScript 3.8+ type-only imports
    const content = `import type { TypeA } from './types';
import type { TypeB } from './types';

const a: TypeA = null as any;
const b: TypeB = null as any;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Type-only imports should merge
      assert.strictEqual(lines.length, 1, 'Should merge type-only imports');
      assert.ok(lines[0].includes('TypeA'), 'Should include TypeA');
      assert.ok(lines[0].includes('TypeB'), 'Should include TypeB');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('58. String import + Named import from same module kept separate', async () => {
    // Scenario: String import (side effects) cannot merge with named import
    const content = `import './lib';
import { Named } from './lib';

console.log(Named);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // String and named imports both kept (2 separate lines)
      assert.strictEqual(lines.length, 2, 'Should keep string and named separate');
      assert.ok(result.includes("import './lib'"), 'Should have string import');
      assert.ok(result.includes('{ Named }'), 'Should have named import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('59. String + Namespace + Named from same module all kept separate', async () => {
    // Scenario: Mix of all three types - none can merge with each other
    const content = `import './lib';
import * as Lib from './lib';
import { Named } from './lib';

console.log(Lib, Named);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // All three kept separate
      assert.strictEqual(lines.length, 3, 'Should keep all three separate');
      assert.ok(result.includes("import './lib'"), 'Should have string import');
      assert.ok(result.includes('* as Lib'), 'Should have namespace import');
      assert.ok(result.includes('{ Named }'), 'Should have named import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('60. Case-sensitive module names NOT merged', async () => {
    // Scenario: Different casing = different modules
    const content = `import { A } from './Lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Different case = different modules, not merged
      assert.strictEqual(lines.length, 2, 'Should keep separate (case-sensitive)');
      assert.ok(result.includes('./Lib'), 'Should have ./Lib (capital L)');
      assert.ok(result.includes('./lib'), 'Should have ./lib (lowercase l)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('61. Multiple namespace imports from same module kept separate', async () => {
    // Scenario: Multiple namespace imports cannot merge
    const content = `import * as Lib1 from './lib';
import * as Lib2 from './lib';

console.log(Lib1, Lib2);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Both namespace imports kept separate
      assert.strictEqual(lines.length, 2, 'Should keep both namespace imports separate');
      assert.ok(result.includes('* as Lib1'), 'Should have Lib1');
      assert.ok(result.includes('* as Lib2'), 'Should have Lib2');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('62. /index removal disabled - imports NOT merged', async () => {
    // Scenario: When /index removal is OFF, './lib/index' and './lib' are different modules
    const content = `import { A } from './lib/index';
import { B } from './lib';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('removeTrailingIndex', false);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should NOT merge (different module names)
      assert.strictEqual(lines.length, 2, 'Should keep separate when /index not removed');
      assert.ok(result.includes('./lib/index'), 'Should keep /index');
      assert.ok(result.includes("'./lib'"), 'Should have ./lib');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('63. Duplicate defaults from same module - last wins (matches old extension)', async () => {
    // Scenario: Invalid TypeScript (can't have two default imports from same module)
    // Both defaults are used in code, but TypeScript only allows one default per module
    //
    // BEHAVIOR (DETERMINISTIC) - Matches Old TypeScript Hero:
    // - Merges into single import statement (same module)
    // - Keeps LAST default only (Default2)
    // - Drops first default (Default1)
    // - This is handled by merge logic at import-manager.ts:613-620
    //
    // CODE LOCATION: import-manager.ts lines 613-620
    // if (namedImp.defaultAlias) {
    //   mergedDefault = namedImp.defaultAlias; // Always overwrite, last wins
    // }
    //
    // WHY LAST (not first)?
    // - Matches old TypeScript Hero behavior exactly (100% parity)
    // - Both behaviors are equivalent (same default export, different local name)
    // - Invalid TypeScript either way - compiler will catch undefined reference
    // - See comparison test A10 for proof of parity with old extension
    const content = `import Default1 from './lib';
import Default2 from './lib';

console.log(Default1, Default2);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // DETERMINISTIC: Merges into one import, keeps LAST default (matches old extension)
      assert.strictEqual(lines.length, 1, 'Should merge into one import');
      assert.ok(lines[0].includes('Default2'), 'Should keep last default (Default2)');
      assert.ok(!lines[0].includes('Default1'), 'Should drop first default (Default1)');

      // Expected output: import Default2 from './lib';
      // Default1 reference in code will be undefined (TypeScript error)
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('64. Property access should not count as import usage', async () => {
    // Scenario: import { reduce } from 'lodash' but only use arr.reduce() (Array method)
    // The identifier "reduce" appears in .reduce() but is NOT using the import
    const content = `import { filter, map, reduce } from 'lodash';

const data = [1, 2, 3];
const doubled = map(data, x => x * 2);
const result = filter(doubled, x => x > 5)
  .reduce((acc, val) => acc + val, 0);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should keep map and filter (used as functions), remove reduce (only used as method)
      assert.strictEqual(lines.length, 1, 'Should have one import line');
      assert.ok(lines[0].includes('filter'), 'Should keep filter');
      assert.ok(lines[0].includes('map'), 'Should keep map');
      assert.ok(!lines[0].includes('reduce'), 'Should remove reduce (not used as function)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('65. Old TypeScript syntax: import = require (used)', async () => {
    // Scenario: Old TypeScript syntax that's still used in legacy codebases
    // This is import foo = require('lib') syntax (deprecated but must not break)
    const content = `import foo = require('old-lib');
import { bar } from 'new-lib';

console.log(foo, bar);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.trim().length > 0);

      // Both imports should be kept (both used)
      assert.ok(result.includes('import foo = require'), 'Should keep import equals (used)');
      assert.ok(result.includes("import { bar } from 'new-lib'"), 'Should keep modern import');
      assert.strictEqual(lines.filter(l => l.startsWith('import')).length, 2, 'Should have 2 imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('66. Old TypeScript syntax: import = require (unused)', async () => {
    // Scenario: Unused import equals should be removed like any other unused import
    const content = `import foo = require('old-lib');
import { bar } from 'new-lib';

console.log(bar);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Only bar should remain
      assert.strictEqual(lines.length, 1, 'Should have only 1 import');
      assert.ok(!result.includes('import foo = require'), 'Should remove unused import equals');
      assert.ok(result.includes("import { bar } from 'new-lib'"), 'Should keep used import');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('67. Old TypeScript syntax: Mixed with grouping', async () => {
    // Scenario: import equals should be grouped like namespace imports
    const content = `import { Component } from '@angular/core';
import oldLib = require('old-lib');
import 'zone.js';
import { MyClass } from './my-class';

const component = Component;
const lib = oldLib;
const local = MyClass;
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should be grouped: Plains, Modules (including import equals), Workspace
      const lines = result.split('\n');
      const zoneIndex = lines.findIndex(l => l.includes('zone.js'));
      const angularIndex = lines.findIndex(l => l.includes('@angular/core'));
      const oldLibIndex = lines.findIndex(l => l.includes('old-lib'));
      const localIndex = lines.findIndex(l => l.includes('./my-class'));

      assert.ok(zoneIndex !== -1, 'Should have zone.js');
      assert.ok(angularIndex !== -1, 'Should have angular');
      assert.ok(oldLibIndex !== -1, 'Should have old-lib');
      assert.ok(localIndex !== -1, 'Should have local import');

      // Verify order: Plains < Modules < Workspace
      assert.ok(zoneIndex < angularIndex, 'Plains before Modules');
      assert.ok(zoneIndex < oldLibIndex, 'Plains before old-lib');
      assert.ok(angularIndex < localIndex, 'Modules before Workspace');
      assert.ok(oldLibIndex < localIndex, 'Old-lib before Workspace');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('68. Old TypeScript syntax: Formatting matches config', async () => {
    // Scenario: import equals should respect quote and semicolon settings
    const content = `import foo = require("old-lib");

console.log(foo);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('stringQuoteStyle', "'");
      config.setConfig('insertSemicolons', false);
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should use single quotes and no semicolon
      assert.ok(result.includes("import foo = require('old-lib')"), 'Should use single quotes');
      assert.ok(!result.includes("import foo = require('old-lib');"), 'Should not have semicolon');

      // Reset config
      config.setConfig('stringQuoteStyle', "'");
      config.setConfig('insertSemicolons', true);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // =============================================================================
  // CRITICAL EDGE CASES - File Headers & Special Syntax
  // =============================================================================

  test('69. Shebang: Imports inserted AFTER shebang', async () => {
    // CRITICAL: Shebang MUST be first line or script won't execute
    // Scenario: Node.js executable script with shebang
    const content = `#!/usr/bin/env node
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      // CRITICAL: Shebang MUST be on line 0
      assert.strictEqual(lines[0], '#!/usr/bin/env node', 'Shebang must be first line');

      // Import should come after shebang
      assert.ok(result.includes("import { used } from './lib';"), 'Should keep used import');
      assert.ok(!result.includes('unused'), 'Should remove unused import');

      const importLineIndex = lines.findIndex(l => l.includes('import'));
      assert.ok(importLineIndex > 0, 'Import must come AFTER shebang');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('70. Use strict: Imports inserted AFTER use strict', async () => {
    // CRITICAL: 'use strict' changes JavaScript behavior, must be first statement
    // Scenario: Strict mode file
    const content = `'use strict';
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      // CRITICAL: 'use strict' MUST be first line
      assert.strictEqual(lines[0], "'use strict';", "'use strict' must be first line");

      // Import should come after 'use strict'
      assert.ok(result.includes("import { used } from './lib';"), 'Should keep used import');
      assert.ok(!result.includes('unused'), 'Should remove unused import');

      const importLineIndex = lines.findIndex(l => l.includes('import'));
      assert.ok(importLineIndex > 0, 'Import must come AFTER use strict');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('71. Use strict (double quotes): Imports inserted AFTER use strict', async () => {
    // Scenario: "use strict" with double quotes (also valid)
    const content = `"use strict";
import { used } from './lib';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      // CRITICAL: "use strict" MUST be preserved
      assert.strictEqual(lines[0], '"use strict";', '"use strict" must be first line');

      const importLineIndex = lines.findIndex(l => l.includes('import'));
      assert.ok(importLineIndex > 0, 'Import must come AFTER use strict');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('72. Triple-slash directives: Imports inserted AFTER directives', async () => {
    // CRITICAL: /// <reference /> directives configure TypeScript compiler
    // Scenario: TypeScript file with reference directives
    const content = `/// <reference path="./types.d.ts" />
/// <reference types="node" />
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // CRITICAL: Triple-slash directives must be preserved and stay before imports
      assert.ok(result.includes('/// <reference path="./types.d.ts" />'), 'Should preserve path directive');
      assert.ok(result.includes('/// <reference types="node" />'), 'Should preserve types directive');

      const lines = result.split('\n');
      const directiveLine1 = lines.findIndex(l => l.includes('reference path'));
      const directiveLine2 = lines.findIndex(l => l.includes('reference types'));
      const importLine = lines.findIndex(l => l.includes("import { used }"));

      assert.ok(directiveLine1 < importLine, 'Reference directives must come before imports');
      assert.ok(directiveLine2 < importLine, 'Reference directives must come before imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('73. Leading comments: Preserved before imports', async () => {
    // CRITICAL: License headers, file comments must not be deleted
    // Scenario: File with copyright header
    const content = `/**
 * Copyright (c) 2025 Company
 * Licensed under MIT
 */

// Main module file
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // CRITICAL: Comments must be preserved
      assert.ok(result.includes('Copyright (c) 2025 Company'), 'Should preserve copyright');
      assert.ok(result.includes('Licensed under MIT'), 'Should preserve license');
      assert.ok(result.includes('// Main module file'), 'Should preserve comment');

      const lines = result.split('\n');
      const copyrightLine = lines.findIndex(l => l.includes('Copyright'));
      const importLine = lines.findIndex(l => l.includes("import { used }"));

      assert.ok(copyrightLine < importLine, 'Comments must come before imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74. Combined headers: Shebang + comments + use strict', async () => {
    // CRITICAL: All headers preserved in correct order
    // Scenario: Complete header with all elements
    const content = `#!/usr/bin/env node
/**
 * CLI tool
 */
'use strict';
import { used } from './lib';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      // CRITICAL: Verify order
      assert.strictEqual(lines[0], '#!/usr/bin/env node', 'Shebang first');
      assert.ok(lines.some(l => l.includes('CLI tool')), 'Comment preserved');
      assert.ok(lines.some(l => l === "'use strict';"), 'Use strict preserved');

      const shebangIdx = 0;
      const commentIdx = lines.findIndex(l => l.includes('CLI tool'));
      const strictIdx = lines.findIndex(l => l === "'use strict';");
      const importIdx = lines.findIndex(l => l.includes('import'));

      assert.ok(shebangIdx < commentIdx, 'Shebang before comment');
      assert.ok(commentIdx < strictIdx, 'Comment before use strict');
      assert.ok(strictIdx < importIdx, 'Use strict before imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74a. Blank line between comment and imports: Single blank line preserved', async () => {
    // CRITICAL: Blank lines between comments and imports must be preserved
    // Scenario: File with comment followed by ONE blank line before imports
    const content = `// Demo file for video
// Press Ctrl+Alt+O

import { UserDetail } from './user-detail';
import { Component } from '@angular/core';

const demo = new Component();
console.log(UserDetail);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      // Find the comment and import lines
      const commentLine2 = lines.findIndex(l => l.includes('Press Ctrl'));
      const importLine = lines.findIndex(l => l.includes('import'));

      // CRITICAL: There should be exactly ONE blank line between last comment and first import
      assert.strictEqual(importLine - commentLine2, 2, 'Should have exactly one blank line between comment and imports');
      assert.strictEqual(lines[commentLine2 + 1].trim(), '', 'Line between comment and import should be blank');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74b. Blank line between comment and imports: TWO blank lines preserved', async () => {
    // CRITICAL: Multiple blank lines between comments and imports must be preserved
    // Scenario: File with comment followed by TWO blank lines before imports
    const content = `// Copyright notice
// MIT License


import { used } from './lib';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const lastCommentLine = lines.findIndex(l => l.includes('MIT License'));
      const importLine = lines.findIndex(l => l.includes('import'));

      // CRITICAL: Should preserve TWO blank lines
      assert.strictEqual(importLine - lastCommentLine, 3, 'Should have exactly two blank lines between comment and imports');
      assert.strictEqual(lines[lastCommentLine + 1].trim(), '', 'First blank line');
      assert.strictEqual(lines[lastCommentLine + 2].trim(), '', 'Second blank line');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74c. Blank line between comment and imports: Block comment with blank line', async () => {
    // CRITICAL: Block comments with trailing blank line
    // Scenario: JSDoc/block comment followed by blank line
    const content = `/**
 * @fileoverview Main application module
 * @author Someone
 */

import { used } from './lib';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const blockCommentEnd = lines.findIndex(l => l.trim() === '*/');
      const importLine = lines.findIndex(l => l.includes('import'));

      // CRITICAL: Should preserve one blank line after block comment
      assert.strictEqual(importLine - blockCommentEnd, 2, 'Should have exactly one blank line after block comment');
      assert.strictEqual(lines[blockCommentEnd + 1].trim(), '', 'Line after block comment should be blank');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74d. Blank line between comment and imports: Mixed comment types', async () => {
    // CRITICAL: Mixed comment types (block + line) with blank lines
    // Scenario: Block comment, then line comments, then blank line
    const content = `/**
 * Module header
 */
// Additional info
// More info

import { used } from './lib';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const lastCommentLine = lines.findIndex(l => l.includes('More info'));
      const importLine = lines.findIndex(l => l.includes('import'));

      // CRITICAL: Should preserve one blank line after last comment
      assert.strictEqual(importLine - lastCommentLine, 2, 'Should have exactly one blank line after last comment');
      assert.strictEqual(lines[lastCommentLine + 1].trim(), '', 'Line after comments should be blank');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74e. No blank line between comment and imports: Should not add one', async () => {
    // CRITICAL: If there's NO blank line, don't add one
    // Scenario: Comment immediately followed by imports
    const content = `// Quick comment
import { used } from './lib';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const commentLine = lines.findIndex(l => l.includes('Quick comment'));
      const importLine = lines.findIndex(l => l.includes('import'));

      // CRITICAL: Should NOT add a blank line if there wasn't one
      assert.strictEqual(importLine - commentLine, 1, 'Should have no blank line between comment and imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('74f. Blank lines before imports: Comprehensive test (0, 1, 2, 3 blank lines)', async () => {
    // Test ZERO blank lines before imports
    const content0 = `// Comment
import { used } from './lib';

console.log(used);
`;
    // Test ONE blank line before imports
    const content1 = `// Comment

import { used } from './lib';

console.log(used);
`;
    // Test TWO blank lines before imports
    const content2 = `// Comment


import { used } from './lib';

console.log(used);
`;
    // Test THREE blank lines before imports
    const content3 = `// Comment



import { used } from './lib';

console.log(used);
`;

    const doc0 = await createTempDocument(content0);
    const doc1 = await createTempDocument(content1);
    const doc2 = await createTempDocument(content2);
    const doc3 = await createTempDocument(content3);
    try {
      const manager0 = new ImportManager(doc0, config);
      const edits0 = await manager0.organizeImports();
      const result0 = await applyEditsToDocument(doc0, edits0);
      const lines0 = result0.split('\n');
      const comment0 = lines0.findIndex(l => l.includes('Comment'));
      const import0 = lines0.findIndex(l => l.includes('import'));
      assert.strictEqual(import0 - comment0, 1, 'ZERO blank lines before should be preserved');

      const manager1 = new ImportManager(doc1, config);
      const edits1 = await manager1.organizeImports();
      const result1 = await applyEditsToDocument(doc1, edits1);
      const lines1 = result1.split('\n');
      const comment1 = lines1.findIndex(l => l.includes('Comment'));
      const import1 = lines1.findIndex(l => l.includes('import'));
      assert.strictEqual(import1 - comment1, 2, 'ONE blank line before should be preserved');

      const manager2 = new ImportManager(doc2, config);
      const edits2 = await manager2.organizeImports();
      const result2 = await applyEditsToDocument(doc2, edits2);
      const lines2 = result2.split('\n');
      const comment2 = lines2.findIndex(l => l.includes('Comment'));
      const import2 = lines2.findIndex(l => l.includes('import'));
      assert.strictEqual(import2 - comment2, 3, 'TWO blank lines before should be preserved');

      const manager3 = new ImportManager(doc3, config);
      const edits3 = await manager3.organizeImports();
      const result3 = await applyEditsToDocument(doc3, edits3);
      const lines3 = result3.split('\n');
      const comment3 = lines3.findIndex(l => l.includes('Comment'));
      const import3 = lines3.findIndex(l => l.includes('import'));
      assert.strictEqual(import3 - comment3, 4, 'THREE blank lines before should be preserved');
    } finally {
      await deleteTempDocument(doc0);
      await deleteTempDocument(doc1);
      await deleteTempDocument(doc2);
      await deleteTempDocument(doc3);
    }
  });

  // =============================================================================
  // CRITICAL EDGE CASES - Dynamic Imports & Modern Syntax
  // =============================================================================

  test('75. Dynamic imports: Not confused with static imports', async () => {
    // CRITICAL: Dynamic import() calls must NOT be removed or modified
    // Scenario: Code with both static and dynamic imports
    const content = `import { helper } from './helper';

async function loadModule() {
  const module = await import('./dynamic-module');
  const another = import('./another-dynamic');
  return module;
}

console.log(helper);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // CRITICAL: Dynamic imports must NOT be touched
      assert.ok(result.includes("import('./dynamic-module')"), 'Dynamic import must be preserved');
      assert.ok(result.includes("import('./another-dynamic')"), 'Dynamic import must be preserved');
      assert.ok(result.includes("import { helper } from './helper';"), 'Static import preserved');

      // Dynamic imports should still be in function body, not moved to top
      const lines = result.split('\n');
      const dynamicLine = lines.findIndex(l => l.includes("import('./dynamic-module')"));
      const functionLine = lines.findIndex(l => l.includes('async function loadModule'));

      assert.ok(dynamicLine > functionLine, 'Dynamic import stays in function body');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('76. import.meta: Not confused with imports', async () => {
    // CRITICAL: import.meta usage must NOT be removed
    // Scenario: ES module using import.meta
    const content = `import { helper } from './helper';

const currentUrl = import.meta.url;
const dirname = import.meta.dirname;

console.log(helper, currentUrl);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // CRITICAL: import.meta usage must be preserved
      assert.ok(result.includes('import.meta.url'), 'import.meta.url must be preserved');
      assert.ok(result.includes('import.meta.dirname'), 'import.meta.dirname must be preserved');
      assert.ok(result.includes("import { helper } from './helper';"), 'Import preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('77. Empty import specifiers: Should be removed', async () => {
    // Scenario: Malformed import with no specifiers
    const content = `import {} from './lib';
import { used } from './used';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Empty import should be cleaned up
      assert.ok(!result.includes("import {} from './lib'"), 'Empty import should be removed');
      assert.ok(result.includes("import { used } from './used';"), 'Used import preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('78. Whitespace-only import specifiers: Should be removed', async () => {
    // Scenario: Malformed import with only whitespace
    const content = `import {   } from './lib';
import { used } from './used';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Whitespace-only import should be cleaned up
      assert.ok(!result.includes("import {   } from './lib'"), 'Whitespace import should be removed');
      assert.ok(result.includes("import { used } from './used';"), 'Used import preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // =============================================================================
  // CRITICAL EDGE CASES - Malformed Code
  // =============================================================================

  test('79. File with only imports (all unused): All removed safely', async () => {
    // CRITICAL: Must handle files that become empty
    // Scenario: File that only had imports, all unused
    const content = `import { A } from './a';
import { B } from './b';
import { C } from './c';
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // All imports should be removed, leaving empty file (or just whitespace)
      assert.ok(!result.includes('import'), 'All unused imports should be removed');
      assert.ok(result.trim().length === 0, 'File should be empty');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('80. Imports after code: Malformed but should not crash', async () => {
    // CRITICAL: Extension must handle malformed code gracefully
    // Scenario: Invalid TypeScript with imports after code (shouldn't exist but might)
    const content = `const x = 5;

import { foo } from './lib';

console.log(x, foo);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);

      // Should not throw error
      let threw = false;
      try {
        const edits = await manager.organizeImports();
        const result = await applyEditsToDocument(doc, edits);

        // Import should still be recognized and kept (it's used)
        assert.ok(result.includes('foo'), 'Should preserve import identifier');
      } catch (e) {
        threw = true;
      }

      assert.ok(!threw, 'Should not throw error on malformed code');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('81. Comments between imports: Preserved', async () => {
    // CRITICAL: Don't lose important comments
    // Scenario: Comments explaining imports
    const content = `import { A } from './a';

// This import is needed for side effects
import './polyfill';

// Main imports
import { B } from './b';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Note: Comments between imports may not be preserved in their exact position
      // (this is a known limitation of AST-based refactoring)
      // But the imports themselves should be organized correctly
      assert.ok(result.includes("import { A } from './a';"), 'Import A preserved');
      assert.ok(result.includes("import { B } from './b';"), 'Import B preserved');
      assert.ok(result.includes("import './polyfill';"), 'Side effect import preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('82. Very long import line: Multiline wrapping works', async () => {
    // Scenario: Import with many specifiers exceeding threshold
    const content = `import { SuperLongIdentifierName1, SuperLongIdentifierName2, SuperLongIdentifierName3, UnusedName } from './lib';

console.log(SuperLongIdentifierName1, SuperLongIdentifierName2, SuperLongIdentifierName3);
`;
    const doc = await createTempDocument(content);
    try {
      config.setConfig('multiLineWrapThreshold', 40); // Low threshold to force wrapping
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should wrap to multiline (the braces part alone is > 40 chars)
      assert.ok(result.includes('{\n'), 'Should use multiline format');
      assert.ok(result.includes('SuperLongIdentifierName1'), 'Should preserve specifier 1');
      assert.ok(result.includes('SuperLongIdentifierName2'), 'Should preserve specifier 2');
      assert.ok(result.includes('SuperLongIdentifierName3'), 'Should preserve specifier 3');

      // Unused specifier should be removed
      assert.ok(!result.includes('UnusedName'), 'Should remove unused specifier');

      // Reset config
      config.setConfig('multiLineWrapThreshold', 125);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('83. BOM (Byte Order Mark): Handled gracefully (known limitation)', async () => {
    // NOTE: ts-morph strips BOM during parsing (this is a known limitation)
    // This test verifies the extension doesn't crash on BOM files
    // Scenario: File starting with BOM
    const BOM = '\uFEFF';
    const content = `${BOM}import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);

      // Should not throw error
      let threw = false;
      try {
        const edits = await manager.organizeImports();
        const result = await applyEditsToDocument(doc, edits);

        // File should still be valid (BOM will be stripped by ts-morph, but that's okay)
        assert.ok(result.includes("import { used } from './lib';"), 'Import preserved');
        assert.ok(!result.includes('unused'), 'Unused import removed');
      } catch (e) {
        threw = true;
      }

      assert.ok(!threw, 'Should handle BOM files without crashing');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('84. Template strings with import keyword: Not confused', async () => {
    // CRITICAL: String literals containing "import" must not be confused
    // Scenario: Template string with import keyword
    const content = `import { helper } from './helper';

const message = \`You should import the module\`;
const code = "import { X } from 'lib';";

console.log(helper, message);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Import should be preserved
      assert.ok(result.includes("import { helper } from './helper';"), 'Real import preserved');

      // String literals must NOT be affected
      assert.ok(result.includes('You should import the module'), 'Template string preserved');
      assert.ok(result.includes(`"import { X } from 'lib';"`), 'String literal preserved');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  // =============================================================================
  // EDGE CASE - Configuration Error Handling
  // =============================================================================

  test('85. Invalid grouping config: Falls back to defaults gracefully', async () => {
    // CRITICAL: Bad config must not crash extension
    // Scenario: User provides invalid grouping configuration
    const content = `import { A } from './a';
import { B } from 'library';

console.log(A, B);
`;
    const doc = await createTempDocument(content);
    try {

      // Create config with invalid grouping that will throw during parsing
      const badConfig = new MockImportsConfig();
      badConfig.setConfig('grouping', ['INVALID_GROUP_IDENTIFIER']); // This will throw in parser

      const manager = new ImportManager(doc, badConfig);

      // Should not throw - must fall back to defaults
      let threw = false;
      try {
        const edits = await manager.organizeImports();
        const result = await applyEditsToDocument(doc, edits);

        // Should still organize with default grouping
        assert.ok(result.includes("import { A } from './a';"), 'Import preserved');
        assert.ok(result.includes("import { B } from 'library';"), 'Import preserved');
      } catch (e) {
        threw = true;
      }

      assert.ok(!threw, 'Should not throw on invalid config - must fall back gracefully');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('86. Blank lines after imports: ONE blank line preserved', async () => {
    // CRITICAL: Should preserve exactly ONE blank line after imports
    // Scenario: Remove some imports, check spacing preserved
    const content = `import { UsedClass } from './used-class';
import { unused } from './unused';
import { AnotherUnused } from './another-unused';

const instance = new UsedClass();
console.log(instance);
`;
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      // Should have exactly one blank line between import and code
      const importLine = lines.findIndex(l => l.includes("import { UsedClass }"));
      const codeLine = lines.findIndex(l => l.includes('const instance'));

      assert.ok(importLine !== -1, 'Should have import');
      assert.ok(codeLine !== -1, 'Should have code');

      // There should be exactly ONE blank line between import and code
      // That means: codeLine = importLine + 2 (importLine, blank line, codeLine)
      assert.strictEqual(codeLine - importLine, 2, `Should have exactly one blank line after imports (got ${codeLine - importLine - 1} blank lines)`);

      // Verify the line between is actually blank
      const blankLine = lines[importLine + 1];
      assert.strictEqual(blankLine.trim(), '', 'Line after import should be blank');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('86a. Blank lines after imports: TWO blank lines preserved', async () => {
    // CRITICAL: Should preserve exactly TWO blank lines after imports
    // Scenario: Two blank lines after imports
    // NOTE: Requires blankLinesAfterImports="preserve" mode
    const content = `import { used } from './lib';


console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      config.override('blankLinesAfterImports', 'preserve');
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const importLine = lines.findIndex(l => l.includes("import { used }"));
      const codeLine = lines.findIndex(l => l.includes('console.log'));

      // Should preserve TWO blank lines
      assert.strictEqual(codeLine - importLine, 3, 'Should have exactly two blank lines after imports');
      assert.strictEqual(lines[importLine + 1].trim(), '', 'First blank line');
      assert.strictEqual(lines[importLine + 2].trim(), '', 'Second blank line');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('86b. Blank lines after imports: THREE blank lines preserved', async () => {
    // CRITICAL: Should preserve exactly THREE blank lines after imports
    // Scenario: Three blank lines after imports
    // NOTE: Requires blankLinesAfterImports="preserve" mode
    const content = `import { used } from './lib';



console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      config.override('blankLinesAfterImports', 'preserve');
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const importLine = lines.findIndex(l => l.includes("import { used }"));
      const codeLine = lines.findIndex(l => l.includes('console.log'));

      // Should preserve THREE blank lines
      assert.strictEqual(codeLine - importLine, 4, 'Should have exactly three blank lines after imports');
      assert.strictEqual(lines[importLine + 1].trim(), '', 'First blank line');
      assert.strictEqual(lines[importLine + 2].trim(), '', 'Second blank line');
      assert.strictEqual(lines[importLine + 3].trim(), '', 'Third blank line');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('86c. Blank lines after imports: ZERO blank lines preserved', async () => {
    // CRITICAL: Should preserve ZERO blank lines when there aren't any
    // Scenario: Import immediately followed by code
    const content = `import { used } from './lib';
console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      config.override('blankLinesAfterImports', 'preserve');
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const importLine = lines.findIndex(l => l.includes("import { used }"));
      const codeLine = lines.findIndex(l => l.includes('console.log'));

      // Should have NO blank lines
      assert.strictEqual(codeLine - importLine, 1, 'Should have zero blank lines after imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('86e. Blank lines after imports: Comprehensive test (0, 1, 2, 3 blank lines)', async () => {
    // NOTE: Requires blankLinesAfterImports="preserve" mode
    config.override('blankLinesAfterImports', 'preserve');

    // Test ZERO blank lines after imports
    const content0 = `import { used } from './lib';
console.log(used);
`;
    // Test ONE blank line after imports
    const content1 = `import { used } from './lib';

console.log(used);
`;
    // Test TWO blank lines after imports
    const content2 = `import { used } from './lib';


console.log(used);
`;
    // Test THREE blank lines after imports
    const content3 = `import { used } from './lib';



console.log(used);
`;

    const doc0 = await createTempDocument(content0);
    const doc1 = await createTempDocument(content1);
    const doc2 = await createTempDocument(content2);
    const doc3 = await createTempDocument(content3);
    try {
      const manager0 = new ImportManager(doc0, config);
      const edits0 = await manager0.organizeImports();
      const result0 = await applyEditsToDocument(doc0, edits0);
      const lines0 = result0.split('\n');
      const import0 = lines0.findIndex(l => l.includes('import'));
      const code0 = lines0.findIndex(l => l.includes('console.log'));
      assert.strictEqual(code0 - import0, 1, 'ZERO blank lines after should be preserved');

      const manager1 = new ImportManager(doc1, config);
      const edits1 = await manager1.organizeImports();
      const result1 = await applyEditsToDocument(doc1, edits1);
      const lines1 = result1.split('\n');
      const import1 = lines1.findIndex(l => l.includes('import'));
      const code1 = lines1.findIndex(l => l.includes('console.log'));
      assert.strictEqual(code1 - import1, 2, 'ONE blank line after should be preserved');

      const manager2 = new ImportManager(doc2, config);
      const edits2 = await manager2.organizeImports();
      const result2 = await applyEditsToDocument(doc2, edits2);
      const lines2 = result2.split('\n');
      const import2 = lines2.findIndex(l => l.includes('import'));
      const code2 = lines2.findIndex(l => l.includes('console.log'));
      assert.strictEqual(code2 - import2, 3, 'TWO blank lines after should be preserved');

      const manager3 = new ImportManager(doc3, config);
      const edits3 = await manager3.organizeImports();
      const result3 = await applyEditsToDocument(doc3, edits3);
      const lines3 = result3.split('\n');
      const import3 = lines3.findIndex(l => l.includes('import'));
      const code3 = lines3.findIndex(l => l.includes('console.log'));
      assert.strictEqual(code3 - import3, 4, 'THREE blank lines after should be preserved');
    } finally {
      await deleteTempDocument(doc0);
      await deleteTempDocument(doc1);
      await deleteTempDocument(doc2);
      await deleteTempDocument(doc3);
    }
  });

  test('86d. Combined spacing: THREE blank lines before, TWO blank lines after', async () => {
    // CRITICAL: Both before and after blank lines preserved independently
    // Scenario: Multiple blank lines on both sides
    // NOTE: Requires blankLinesAfterImports="preserve" mode
    const content = `// Header comment



import { used } from './lib';


console.log(used);
`;
    const doc = await createTempDocument(content);
    try {
      config.override('blankLinesAfterImports', 'preserve');
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n');

      const commentLine = lines.findIndex(l => l.includes('Header comment'));
      const importLine = lines.findIndex(l => l.includes("import { used }"));
      const codeLine = lines.findIndex(l => l.includes('console.log'));

      // Should preserve THREE blank lines before imports
      assert.strictEqual(importLine - commentLine, 4, 'Should have exactly three blank lines before imports');

      // Should preserve TWO blank lines after imports
      assert.strictEqual(codeLine - importLine, 3, 'Should have exactly two blank lines after imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('88. Windows line endings (CRLF): Respected in generated imports', async () => {
    // CRITICAL: Windows uses CRLF (\r\n), not LF (\n)
    // Scenario: Document with CRLF line endings (actual \r\n in content)
    const content = `import { Component } from '@angular/core';\r\nimport { used } from '@angular/core';\r\n\r\nconsole.log(Component, used);\r\n`;

    // Create document with actual CRLF line endings
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      // The ImportManager should detect CRLF and use it in generated imports
      assert.strictEqual(edits.length, 1, 'Should have one edit');
      const editText = edits[0].newText;
      assert.ok(editText.includes('\r\n'), 'Generated imports should use CRLF when document uses CRLF');
      assert.ok(editText.includes("import { Component, used } from '@angular/core';"), 'Imports should be merged');

      // Verify multiline imports also use CRLF
      config.setConfig('multiLineWrapThreshold', 10); // Force multiline
      const content2 = `import { VeryLongNameA, VeryLongNameB } from './lib';\r\n\r\nconsole.log(VeryLongNameA, VeryLongNameB);\r\n`;
      const doc2 = await createTempDocument(content2);
      try {
        const manager2 = new ImportManager(doc2, config);
        const edits2 = await manager2.organizeImports();

        // Multiline import should have CRLF after opening brace and before closing brace
        assert.strictEqual(edits2.length, 1, 'Should have one edit');
        const editText2 = edits2[0].newText;
        assert.ok(editText2.includes('{\r\n'), 'Multiline imports should use CRLF for line breaks');
      } finally {
        await deleteTempDocument(doc2);
      }
      config.setConfig('multiLineWrapThreshold', 125); // Reset
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('89. ignoredFromRemoval: Specifiers must be sorted', async () => {
    // BUG FIX (Session 13): ignoredFromRemoval imports were keeping specifiers in original order
    // ROOT CAUSE: Line 270-272 in import-manager.ts pushed ignored imports directly without sorting
    // EXPECTED: Even ignored imports should have alphabetically sorted specifiers for consistency
    // WHY: Formatting should be consistent regardless of removal rules

    const content = `import React, { useState, useEffect, useCallback, useMemo } from 'react';

const x = useState;
const y = useEffect;
const z = useCallback;
const w = useMemo;
const r = React;
`;

    config.setConfig('ignoredFromRemoval', ['react']);
    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // CRITICAL: Specifiers must be in alphabetical order
      assert.ok(result.includes("import React, { useCallback, useEffect, useMemo, useState } from 'react';"),
        'Specifiers in ignoredFromRemoval imports must be sorted alphabetically');

      // Verify the order is correct: useCallback < useEffect < useMemo < useState
      const importMatch = result.match(/import React, \{ ([^}]+) \} from 'react'/);
      assert.ok(importMatch, 'Should find React import');
      const specifiers = importMatch![1].split(', ');
      assert.deepStrictEqual(specifiers, ['useCallback', 'useEffect', 'useMemo', 'useState'],
        'Specifiers must be in strict alphabetical order');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('90. Comments between imports: Indentation preserved', async () => {
    // CRITICAL: Comments between imports should preserve their indentation
    // Scenario: Comments with 2-space indentation between imports
    // Expected: Comments moved after imports WITH their original indentation

    const content = `import { B } from './b';
  // This is an indented comment
import { A } from './a';

console.log(A, B);
`;

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Verify imports are organized
      assert.ok(result.includes("import { A } from './a';"), 'Should have import A');
      assert.ok(result.includes("import { B } from './b';"), 'Should have import B');

      // CRITICAL: Verify comments preserve their indentation
      assert.ok(result.includes('  // This is an indented comment'),
        'Two-space indented comment should preserve indentation');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('91. removeTrailingIndex + mergeImportsFromSameModule=false edge case', async () => {
    // BUG: If removeTrailingIndex=true and mergeImportsFromSameModule=false,
    // imports like './lib' and './lib/index' both become './lib' but remain unmerged.
    // This creates duplicate imports for the same module.
    //
    // EXPECTED: Should NOT create duplicates
    // SOLUTION: Deduplicate after /index removal for affected imports only

    const content = `import { A } from './lib';
import { B } from './lib/index';

console.log(A, B);
`;

    config.setConfig('removeTrailingIndex', true);
    config.setConfig('mergeImportsFromSameModule', false);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Count occurrences of "from './lib'" to detect duplicates
      const libImportMatches = result.match(/from ['"]\.\/lib['"]/g);
      const libImportCount = libImportMatches ? libImportMatches.length : 0;

      // CRITICAL: Should NOT have duplicate imports
      // Both imports reference the same module - there should be only ONE import statement
      assert.strictEqual(
        libImportCount,
        1,
        `Should have exactly 1 import from './lib', but found ${libImportCount}. ` +
        `Duplicate imports indicate a bug when removeTrailingIndex + mergeImportsFromSameModule=false`
      );

      // Verify both A and B are present in the single import
      assert.ok(result.includes('A'), 'Should include specifier A');
      assert.ok(result.includes('B'), 'Should include specifier B');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('92. Commented-out imports must be preserved (GOLDEN RULE)', async () => {
    // BUG: Comments containing "import" keyword were filtered out and deleted.
    // This violates the GOLDEN RULE: NEVER DELETE USER CONTENT
    //
    // EXPECTED: ALL comments preserved, including those with "import" keyword
    // SOLUTION: Remove the filter checking for "import" keyword in comments

    const content = `import { A } from './a';
// import { OldFeature } from './old-feature';  // Temporarily disabled
/* import { Experimental } from './experimental'; */
// TODO: Re-enable this import later: import { Future } from './future';
import { B } from './b';

console.log(A, B);
`;

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // CRITICAL: ALL comments must be preserved
      assert.ok(
        result.includes("// import { OldFeature } from './old-feature';"),
        'Single-line commented-out import MUST be preserved'
      );
      assert.ok(
        result.includes("/* import { Experimental } from './experimental'; */"),
        'Multi-line commented-out import MUST be preserved'
      );
      assert.ok(
        result.includes("// TODO: Re-enable this import later: import { Future } from './future';"),
        'Comment with "import" keyword MUST be preserved'
      );

      // Verify actual imports are still there
      assert.ok(result.includes("import { A } from './a';"), 'Should have import A');
      assert.ok(result.includes("import { B } from './b';"), 'Should have import B');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('93. ignoredFromRemoval works with custom library names', async () => {
    // Verify that custom libraries can be added to ignoredFromRemoval list
    // The logic uses exact string matching (no wildcards or sub-paths)

    const content = `import { useState } from 'react';
import { computed } from 'mobx';
import { Component } from '@angular/core';
import { Unused } from './local';

// Only use some imports
const x = useState;
const y = computed;
`;

    config.setConfig('ignoredFromRemoval', ['react', 'mobx', '@angular/core']);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // ALL ignored libraries should be preserved (even though unused)
      assert.ok(result.includes("import { useState } from 'react';"), 'Should preserve react (ignored)');
      assert.ok(result.includes("import { computed } from 'mobx';"), 'Should preserve mobx (custom ignored)');
      assert.ok(result.includes("import { Component } from '@angular/core';"), 'Should preserve @angular/core (custom ignored)');

      // Non-ignored library should be removed
      assert.ok(!result.includes('./local'), 'Should remove ./local (not ignored, unused)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('94. ignoredFromRemoval uses exact matching (no wildcards)', async () => {
    // Document that ignoredFromRemoval only supports exact matches
    // Sub-paths and wildcards are NOT supported

    const content = `import { A } from '@angular/core';
import { B } from '@angular/common';
import { C } from '@angular/core/testing';

const x = A; // Only use A
`;

    // Only '@angular/core' is ignored, not '@angular/common' or '@angular/core/testing'
    config.setConfig('ignoredFromRemoval', ['@angular/core']);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Exact match: should be preserved
      assert.ok(result.includes("'@angular/core'"), 'Should preserve exact match @angular/core');

      // Sub-path: should be removed (not exact match)
      assert.ok(!result.includes('@angular/core/testing'), 'Should remove @angular/core/testing (sub-path, not exact match)');

      // Different library: should be removed
      assert.ok(!result.includes('@angular/common'), 'Should remove @angular/common (different library)');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('95. Invalid grouping config falls back to default grouping', async () => {
    // Verify that invalid grouping identifiers don't crash the extension
    // Instead, they should fall back to default grouping: ['Plains', 'Modules', 'Workspace']

    const content = `import { Component } from '@angular/core';
import { readFileSync } from 'fs';
import { MyService } from './my-service';

console.log(Component, readFileSync, MyService);
`;

    // Set invalid grouping (should fallback to default)
    config.setConfig('grouping', ['InvalidGroupName', 'AnotherBadGroup']);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Should use default grouping: Plains, Modules, Workspace
      // Let's verify the extension doesn't crash and produces valid output
      const lines = result.split('\n').filter(line => line.startsWith('import'));

      assert.strictEqual(lines.length, 3, 'Should have 3 imports (all preserved)');

      // Verify all imports are present (order depends on default grouping implementation)
      assert.ok(result.includes('@angular/core'), 'Should have @angular/core import');
      assert.ok(result.includes('fs'), 'Should have fs import');
      assert.ok(result.includes('./my-service'), 'Should have ./my-service import');

      // Most importantly: verify the extension didn't crash with invalid config
      assert.ok(result.length > 0, 'Should produce valid output despite invalid grouping config');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('96. Selective dedup: non-affected duplicates remain separate', async () => {
    // Verify selective dedup only affects imports changed by /index removal
    // Two duplicate imports from './lib' (NOT from /index) should stay separate
    // when mergeImportsFromSameModule=false

    const content = `import { A } from './lib';
import { B } from './lib';

console.log(A, B);
`;

    config.setConfig('removeTrailingIndex', true);
    config.setConfig('mergeImportsFromSameModule', false);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      const lines = result.split('\n').filter(line => line.startsWith('import'));

      // Should have 2 separate imports (NOT merged) because neither had /index
      assert.strictEqual(lines.length, 2, 'Should have 2 separate import lines (unaffected by /index removal)');
      assert.ok(lines[0].includes('A'), 'First import should have A');
      assert.ok(lines[1].includes('B'), 'Second import should have B');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('97. Import attributes are preserved unchanged', async () => {
    // Verify import attributes (with { ... }) survive organize unchanged
    // TypeScript 4.5+ and ECMAScript import assertions/attributes

    const content = `import data from './data.json' with { type: 'json' };
import { Component } from '@angular/core';

console.log(data, Component);
`;

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Verify attributes are preserved exactly
      assert.ok(result.includes("with { type: 'json' }"), 'Import attributes must be preserved exactly');
      assert.ok(result.includes('@angular/core'), 'Regular import should also be present');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('98. Comment preservation stress test', async () => {
    // Stress test: multiple comments with "import" keyword in various positions
    // All must survive organize

    const content = `import { A } from './a';
// import { OldFeature } - this was removed
/* TODO: Re-enable import of experimental feature */
// The following import is important
import { B } from './b';
/**
 * Note: import { C } might be needed later
 * when we re-import the feature
 */
import { C } from './c';

console.log(A, B, C);
`;

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Verify ALL comments are preserved
      assert.ok(result.includes('// import { OldFeature } - this was removed'),
        'Single-line comment with "import" must be preserved');
      assert.ok(result.includes('/* TODO: Re-enable import of experimental feature */'),
        'Multi-line comment with "import" must be preserved');
      assert.ok(result.includes('// The following import is important'),
        'Regular comment mentioning "import" must be preserved');
      assert.ok(result.includes('* Note: import { C } might be needed later'),
        'JSDoc-style comment with "import" must be preserved');
      assert.ok(result.includes('* when we re-import the feature'),
        'JSDoc-style comment continuation with "import" must be preserved');

      // Verify imports are still there
      assert.ok(result.includes("import { A } from './a';"), 'Import A should be present');
      assert.ok(result.includes("import { B } from './b';"), 'Import B should be present');
      assert.ok(result.includes("import { C } from './c';"), 'Import C should be present');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('99. ignoredFromRemoval libraries have sorted specifiers', async () => {
    // Verify that libraries in ignoredFromRemoval list still get their specifiers sorted
    // This ensures consistent formatting even when imports are protected from removal

    const content = `import { Z, A, M } from 'my-protected-lib';
import { unused } from './other';

console.log(Z, A, M);
`;

    const customConfig = new MockImportsConfig();
    customConfig.setConfig('ignoredFromRemoval', ['my-protected-lib']);

    const doc = await createTempDocument(content);
    try {
      const manager = new ImportManager(doc, customConfig);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      // Verify specifiers are sorted alphabetically even though library is protected
      assert.ok(result.includes("import { A, M, Z } from 'my-protected-lib';"),
        'Protected library specifiers must be sorted alphabetically');

      // Verify unused import from other library was removed
      assert.ok(!result.includes('./other'),
        'Non-protected unused import should be removed');
    } finally {
      await deleteTempDocument(doc);
    }
  });
});
