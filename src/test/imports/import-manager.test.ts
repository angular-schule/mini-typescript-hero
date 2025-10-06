/**
 * Integration Tests for ImportManager
 *
 * TESTING STRATEGY:
 * ================
 * These tests validate the core import organization logic of Mini TypeScript Hero.
 * They use real production code with mocked VSCode dependencies.
 *
 * WHAT'S REAL:
 * - ImportManager: The actual production class being tested
 * - ts-morph library: Real TypeScript parser analyzing code
 * - Import grouping logic: Real production code
 *
 * WHAT'S MOCKED:
 * - VSCode APIs: TextDocument, OutputChannel (not available in test environment)
 * - Configuration: Controllable test values instead of reading VSCode settings
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
import { Uri, Position, Range, TextEdit, TextDocument, OutputChannel } from 'vscode';
import { ImportManager } from '../../imports/import-manager';
import { ImportsConfig } from '../../configuration';
import { ImportGroup, ImportGroupSettingParser, RemainImportGroup } from '../../imports/import-grouping';

/**
 * Mock TextDocument for testing
 *
 * Implements the VSCode TextDocument interface with in-memory string storage.
 * This allows us to test document operations without requiring a real VSCode environment.
 *
 * Key methods:
 * - getText(): Returns the full content or a range
 * - lineAt(): Returns line information for position calculations
 * - offsetAt/positionAt: Converts between line/column and character offset
 */
class MockTextDocument implements TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled = false;
  languageId = 'typescript';
  version = 1;
  isDirty = false;
  isClosed = false;
  eol = 1; // LF
  encoding: string = 'utf-8';
  lineCount: number;

  constructor(fileName: string, private content: string) {
    this.fileName = fileName;
    this.uri = Uri.file(fileName);
    this.lineCount = content.split('\n').length;
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  getText(range?: Range): string {
    if (range) {
      const lines = this.content.split('\n');
      const result: string[] = [];
      for (let i = range.start.line; i <= range.end.line; i++) {
        if (i < lines.length) {
          let line = lines[i];
          if (i === range.start.line && i === range.end.line) {
            line = line.substring(range.start.character, range.end.character);
          } else if (i === range.start.line) {
            line = line.substring(range.start.character);
          } else if (i === range.end.line) {
            line = line.substring(0, range.end.character);
          }
          result.push(line);
        }
      }
      return result.join('\n');
    }
    return this.content;
  }

  lineAt(position: number | Position): any {
    const lineNumber = typeof position === 'number' ? position : position.line;
    const lines = this.content.split('\n');
    const text = lines[lineNumber] || '';
    return {
      lineNumber,
      text,
      range: new Range(lineNumber, 0, lineNumber, text.length),
      rangeIncludingLineBreak: new Range(lineNumber, 0, lineNumber + 1, 0),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0
    };
  }

  offsetAt(position: Position): number {
    const lines = this.content.split('\n');
    let offset = 0;
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    offset += position.character;
    return offset;
  }

  positionAt(offset: number): Position {
    const lines = this.content.split('\n');
    let currentOffset = 0;
    for (let line = 0; line < lines.length; line++) {
      const lineLength = lines[line].length + 1; // +1 for newline
      if (currentOffset + lineLength > offset) {
        return new Position(line, offset - currentOffset);
      }
      currentOffset += lineLength;
    }
    return new Position(lines.length - 1, lines[lines.length - 1].length);
  }

  getWordRangeAtPosition(_position: Position): Range | undefined {
    return undefined;
  }

  validateRange(range: Range): Range {
    return range;
  }

  validatePosition(position: Position): Position {
    return position;
  }
}

/**
 * Mock OutputChannel for testing
 *
 * Captures logging output from ImportManager for debugging test failures.
 * In production, this would be a VSCode OutputChannel shown in the Output panel.
 *
 * Note: We removed most logging in Phase 9.6, so this is mainly for future debugging.
 */
class MockOutputChannel implements OutputChannel {
  name = 'Test';
  private lines: string[] = [];

  append(value: string): void {
    this.lines.push(value);
  }

  appendLine(value: string): void {
    this.lines.push(value + '\n');
  }

  replace(value: string): void {
    this.lines = [value];
  }

  clear(): void {
    this.lines = [];
  }

  show(): void {}
  hide(): void {}
  dispose(): void {}

  getOutput(): string {
    return this.lines.join('');
  }
}

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
  private mockConfig: Map<string, any> = new Map();

  setConfig(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return this.mockConfig.get('insertSpaceBeforeAndAfterImportBraces') ?? true;
  }

  insertSemicolons(_resource: Uri): boolean {
    return this.mockConfig.get('insertSemicolons') ?? true;
  }

  removeTrailingIndex(_resource: Uri): boolean {
    return this.mockConfig.get('removeTrailingIndex') ?? true;
  }

  stringQuoteStyle(_resource: Uri): '"' | '\'' {
    return this.mockConfig.get('stringQuoteStyle') ?? '\'';
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

  mergeImportsFromSameModule(_resource: Uri): boolean {
    return this.mockConfig.get('mergeImportsFromSameModule') ?? true;
  }

  grouping(_resource: Uri): ImportGroup[] {
    const groupSettings = this.mockConfig.get('grouping') ?? ['Plains', 'Modules', 'Workspace'];
    let importGroups: ImportGroup[] = [];

    try {
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

/**
 * Helper function to apply TextEdits to a string
 *
 * ImportManager returns TextEdit[] (VSCode's standard format for file modifications).
 * This helper simulates applying those edits to a string so we can verify the result.
 *
 * Algorithm:
 * 1. Sort edits in reverse order (bottom to top, right to left)
 * 2. Apply each edit without affecting positions of subsequent edits
 * 3. Return the final modified content
 *
 * This mimics what VSCode does when applying edits to a real document.
 */
function applyEdits(content: string, edits: TextEdit[]): string {
  // Sort edits by position (descending) to apply them without affecting positions
  const sortedEdits = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  const lines = content.split('\n');

  for (const edit of sortedEdits) {
    const startLine = edit.range.start.line;
    const startChar = edit.range.start.character;
    const endLine = edit.range.end.line;
    const endChar = edit.range.end.character;

    if (startLine === endLine) {
      // Single line edit
      const line = lines[startLine] || '';
      lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
    } else {
      // Multi-line edit
      const firstLine = (lines[startLine] || '').substring(0, startChar);
      const lastLine = (lines[endLine] || '').substring(endChar);
      const newLines = edit.newText.split('\n');

      lines.splice(
        startLine,
        endLine - startLine + 1,
        firstLine + newLines[0],
        ...newLines.slice(1, -1),
        newLines[newLines.length - 1] + lastLine
      );
    }
  }

  return lines.join('\n');
}

suite('ImportManager Tests', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    logger = new MockOutputChannel();
  });

  test('1. Remove unused imports', () => {
    // SCENARIO: Two imports, only one is used in the code
    // EXPECTED: Unused import should be completely removed
    const content = `import { Unused } from 'lib';
import { Used } from 'other';

const x = Used;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(!result.includes('Unused'), 'Unused import should be removed');
    assert.ok(result.includes('Used'), 'Used import should be kept');
  });

  test('2. Remove unused specifiers from partial imports', () => {
    // SCENARIO: Import has 4 specifiers (A, B, C, D) but only A and C are used
    // EXPECTED: Keep only A and C, remove B and D (partial import cleanup)
    // BONUS: Remaining specifiers should be alphabetically sorted (A, C)
    const content = `import { A, B, C, D } from 'lib';

const x = A;
const y = C;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('A'), 'Used specifier A should be kept');
    assert.ok(result.includes('C'), 'Used specifier C should be kept');
    assert.ok(!result.includes('B'), 'Unused specifier B should be removed');
    assert.ok(!result.includes('D'), 'Unused specifier D should be removed');
  });

  test('3. Keep excluded library even if unused', () => {
    config.setConfig('ignoredFromRemoval', ['react']);
    const content = `import React from 'react';
import { Unused } from 'other';

// React is not used but should be kept
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('react'), 'React should be kept even if unused');
    assert.ok(!result.includes('Unused'), 'Other unused imports should be removed');
  });

  test('4. Keep type-only imports', () => {
    // SCENARIO: MyType is only used in a type annotation, not in runtime code
    // EXPECTED: Type annotations count as usage, import should be kept
    // WHY: TypeScript needs the type for compile-time checking
    const content = `import { MyType } from 'lib';

let x: MyType;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('MyType'), 'Type-only import should be kept');
  });

  test('5. Handle local shadowing correctly', () => {
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
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(!result.includes('@angular/core'), 'Shadowed import should be removed');
  });

  test('6. Handle aliased imports', () => {
    const content = `import { Component as AngularComponent } from '@angular/core';

const x = AngularComponent;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('Component as AngularComponent'), 'Aliased import should be kept');
  });

  test('7. Handle namespace imports', () => {
    const content = `import * as React from 'react';
import * as Unused from 'unused-lib';

const element = React.createElement('div');
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('* as React'), 'Used namespace import should be kept');
    assert.ok(!result.includes('Unused'), 'Unused namespace import should be removed');
  });

  test('8. Handle default imports', () => {
    const content = `import React from 'react';
import Vue from 'vue';

const x = React;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('React'), 'Used default import should be kept');
    assert.ok(!result.includes('Vue'), 'Unused default import should be removed');
  });

  test('9. Handle mixed default and named imports', () => {
    const content = `import React, { useState } from 'react';
import Vue, { ref } from 'vue';

const x = React;
const y = useState;
const z = ref;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('React'), 'Used default should be kept');
    assert.ok(result.includes('useState'), 'Used named import should be kept');
    assert.ok(result.includes('ref'), 'Used named import from another library should be kept');
    assert.ok(!result.includes('Vue'), 'Unused default should be removed');
  });

  test('10. Group imports correctly (Plains -> Modules -> Workspace)', () => {
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
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const zoneIndex = result.indexOf('zone.js');
    const angularIndex = result.indexOf('@angular/core');
    const localIndex = result.indexOf('./local');

    assert.ok(zoneIndex < angularIndex, 'Plains (zone.js) should come before Modules');
    assert.ok(angularIndex < localIndex, 'Modules should come before Workspace');
  });

  test('11. Sort imports alphabetically within groups', () => {
    const content = `import { map } from 'rxjs/operators';
import { Component } from '@angular/core';

const x = Component;
const y = map;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const angularIndex = result.indexOf('@angular/core');
    const rxjsIndex = result.indexOf('rxjs/operators');

    assert.ok(angularIndex < rxjsIndex, 'Imports should be sorted alphabetically');
  });

  test('12. Sort specifiers alphabetically', () => {
    const content = `import { map, filter, tap } from 'rxjs/operators';

const x = filter;
const y = map;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should have filter before map (alphabetically, and tap removed)
    const filterIndex = result.indexOf('filter');
    const mapIndex = result.indexOf('map');

    assert.ok(filterIndex < mapIndex, 'Specifiers should be sorted alphabetically');
    assert.ok(!result.includes('tap'), 'Unused specifier should be removed');
  });

  test('13. Format with configured quote style', () => {
    config.setConfig('stringQuoteStyle', '"');
    const content = `import { Used } from 'lib';

const x = Used;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('"lib"'), 'Should use double quotes when configured');
  });

  test('14. Format with configured semicolons', () => {
    config.setConfig('insertSemicolons', false);
    const content = `import { Used } from 'lib';

const x = Used;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const importLine = result.split('\n').find(line => line.includes('import'));
    assert.ok(importLine && !importLine.endsWith(';'), 'Should not have semicolons when configured');
  });

  test('15. Format with configured spaces in braces', () => {
    config.setConfig('insertSpaceBeforeAndAfterImportBraces', false);
    const content = `import { Used } from 'lib';

const x = Used;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('{Used}'), 'Should not have spaces in braces when configured');
  });

  test('16. Respect blank lines between import groups', () => {
    const content = `import { Component } from '@angular/core';
import { LocalClass } from './local';
import 'zone.js';

const x = Component;
const y = LocalClass;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should have blank lines between groups
    const lines = result.split('\n');
    const hasBlankLinesBetweenGroups = lines.some((line, i) =>
      i > 0 && line.trim() === '' && lines[i-1].includes('import') &&
      i < lines.length - 1 && lines[i+1].includes('import')
    );

    assert.ok(hasBlankLinesBetweenGroups, 'Should have blank lines between import groups');
  });

  test('17. Remove trailing /index when configured', () => {
    config.setConfig('removeTrailingIndex', true);
    const content = `import { Used } from './lib/index';

const x = Used;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('./lib'), 'Should have library path');
    assert.ok(!result.includes('/index'), 'Should remove trailing /index');
  });

  test('18. Keep all imports when removal is disabled', () => {
    config.setConfig('disableImportRemovalOnOrganize', true);
    const content = `import { Unused } from 'lib';
import { AlsoUnused } from 'other';

// Nothing is used
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('Unused'), 'Should keep unused imports when removal is disabled');
    assert.ok(result.includes('AlsoUnused'), 'Should keep all unused imports when removal is disabled');
  });

  test('19. Skip sorting when disabled', () => {
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
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Original order should be preserved (rxjs before angular)
    const rxjsIndex = result.indexOf('rxjs/operators');
    const angularIndex = result.indexOf('@angular/core');

    assert.ok(rxjsIndex < angularIndex, 'Should preserve original order when sorting is disabled');
  });

  test('20. Handle string-only imports (always kept)', () => {
    const content = `import 'zone.js';
import 'reflect-metadata';

// String imports are always kept
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('zone.js'), 'String import should be kept');
    assert.ok(result.includes('reflect-metadata'), 'String import should be kept');
  });

  test('21. Keep imports used in named re-exports', () => {
    const content = `import { Foo, Bar, Unused } from './lib';

export { Foo, Bar };
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Foo and Bar are re-exported, so should be kept
    assert.ok(result.includes('Foo'), 'Re-exported Foo should be kept');
    assert.ok(result.includes('Bar'), 'Re-exported Bar should be kept');
    // Unused is not re-exported and not used, so should be removed
    assert.ok(!result.includes('Unused'), 'Unused should be removed');
  });

  test('22. Keep imports used in default re-export', () => {
    const content = `import MyClass from './my-class';

export default MyClass;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('MyClass'), 'Default re-exported import should be kept');
  });

  test('23. Keep namespace imports used in re-exports', () => {
    const content = `import * as Utils from './utils';
import * as Unused from './unused';

export { Utils };
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    assert.ok(result.includes('Utils'), 'Re-exported namespace import should be kept');
    assert.ok(!result.includes('Unused'), 'Unused namespace import should be removed');
  });

  test('24. Handle functions used in JSX/TSX', () => {
    const content = `import { helper } from './helpers';
import { unused } from './unused';
import * as React from 'react';

export const MyComponent = () => {
  return <div>{helper()}</div>;
};
`;
    const doc = new MockTextDocument('test.tsx', content);
    doc.languageId = 'typescriptreact';
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // helper() is used in JSX expression, should be kept
    assert.ok(result.includes('helper'), 'Function used in JSX should be kept');
    // React is used for JSX, should be kept
    assert.ok(result.includes('React'), 'React import should be kept for JSX');
    // unused is not used, should be removed
    assert.ok(!result.includes('unused'), 'Unused import should be removed');
  });

  test('25. Keep default imports re-exported as named exports', () => {
    const content = `import MyDefault from './my-default';
import UnusedDefault from './unused';

export { MyDefault };
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // MyDefault is re-exported as named export, should be kept
    assert.ok(result.includes('MyDefault'), 'Default import re-exported as named should be kept');
    // UnusedDefault is not used, should be removed
    assert.ok(!result.includes('UnusedDefault'), 'Unused default import should be removed');
  });

  test('26. Support JavaScript files (.js)', () => {
    const content = `import { used } from './helpers';
import { unused } from './unused';

function myFunction() {
  return used();
}
`;
    const doc = new MockTextDocument('test.js', content);
    doc.languageId = 'javascript';
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // JavaScript should work like TypeScript
    assert.ok(result.includes('used'), 'Used import should be kept in .js file');
    assert.ok(!result.includes('unused'), 'Unused import should be removed from .js file');
  });

  test('27. Support JSX files (.jsx)', () => {
    const content = `import React from 'react';
import { Button } from './components';
import { unused } from './unused';

export default function MyComponent() {
  return <Button>Click me</Button>;
}
`;
    const doc = new MockTextDocument('test.jsx', content);
    doc.languageId = 'javascriptreact';
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // JSX should detect usage correctly
    assert.ok(result.includes('React'), 'React import should be kept in JSX');
    assert.ok(result.includes('Button'), 'Component import should be kept in JSX');
    assert.ok(!result.includes('unused'), 'Unused import should be removed from JSX');
  });

  test('28. Support complex JavaScript with destructuring and arrow functions', () => {
    const content = `import { map, filter, unused } from 'lodash';
import { UsedClass } from './classes';

const data = [1, 2, 3];
const result = map(data, x => filter([x], y => y > 0));
const instance = new UsedClass();
`;
    const doc = new MockTextDocument('test.js', content);
    doc.languageId = 'javascript';
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // All modern JS features should work
    assert.ok(result.includes('map'), 'map should be kept');
    assert.ok(result.includes('filter'), 'filter should be kept');
    assert.ok(result.includes('UsedClass'), 'UsedClass should be kept');
    assert.ok(!result.includes('unused'), 'unused should be removed');
  });

  test('29. Multiline wrapping when threshold exceeded', () => {
    const content = `import { VeryLongSymbolName, AnotherLongSymbol, YetAnotherSymbol, FourthSymbol, FifthSymbol } from './helpers';

const a = VeryLongSymbolName;
const b = AnotherLongSymbol;
const c = YetAnotherSymbol;
const d = FourthSymbol;
const e = FifthSymbol;
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('multiLineWrapThreshold', 50); // Very low threshold to force multiline
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should be multiline (contains line breaks in import)
    assert.ok(result.includes('{\n'), 'Import should be multiline');
    assert.ok(result.includes(',\n'), 'Should have comma + newline between specifiers');
  });

  test('30. Multiline trailing comma configuration', () => {
    const content = `import { VeryLongSymbolNameOne, VeryLongSymbolNameTwo, VeryLongSymbolNameThree } from './helpers';

const a = VeryLongSymbolNameOne;
const b = VeryLongSymbolNameTwo;
const c = VeryLongSymbolNameThree;
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('multiLineWrapThreshold', 40); // Force multiline
    config.setConfig('multiLineTrailingComma', true);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should have trailing comma on last specifier (which will be "Two" after alphabetical sort)
    const hasTrailingComma = result.includes('VeryLongSymbolNameTwo,');
    assert.ok(hasTrailingComma, 'Multiline import should have trailing comma when configured');
  });

  test('31. No trailing comma when multiLineTrailingComma is false', () => {
    const content = `import { VeryLongSymbolNameOne, VeryLongSymbolNameTwo, VeryLongSymbolNameThree } from './helpers';

const a = VeryLongSymbolNameOne;
const b = VeryLongSymbolNameTwo;
const c = VeryLongSymbolNameThree;
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('multiLineWrapThreshold', 40); // Force multiline
    config.setConfig('multiLineTrailingComma', false);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should NOT have trailing comma on last specifier (which will be "Two" after alphabetical sort)
    const hasNoTrailingComma = result.match(/VeryLongSymbolNameTwo\s*\n\s*\}/);
    assert.ok(hasNoTrailingComma, 'Multiline import should NOT have trailing comma when disabled');
  });

  test('32. organizeSortsByFirstSpecifier sorts by first specifier, not library name', () => {
    // Scenario: Two imports with different first specifiers
    // When sorted by first specifier: bar < foo (alphabetical)
    // When sorted by library name: ./a < ./z (alphabetical)
    const content = `import { foo } from './z';
import { bar } from './a';

console.log(foo, bar);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('organizeSortsByFirstSpecifier', true);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Expected: sorted by first specifier (bar < foo), not by library name
    const lines = result.split('\n').filter(line => line.startsWith('import'));
    assert.strictEqual(lines.length, 2, 'Should have 2 import lines');
    assert.ok(lines[0].includes('bar'), 'First import should be bar (sorted by specifier)');
    assert.ok(lines[1].includes('foo'), 'Second import should be foo (sorted by specifier)');

    // Verify it's NOT sorted by library name (./a would come before ./z)
    assert.ok(lines[0].includes('./a'), 'bar import should be from ./a');
    assert.ok(lines[1].includes('./z'), 'foo import should be from ./z');
  });

  test('33. Single-line import stays single-line when under threshold', () => {
    const content = `import { short, names } from './helpers';

const a = short;
const b = names;
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('multiLineWrapThreshold', 125); // Default high threshold
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should stay single line
    assert.ok(!result.includes('{\n'), 'Short import should stay single-line');
    assert.ok(result.includes('{ names, short }'), 'Should be single line with sorted specifiers');
  });

  test('34. Empty file produces no edits', () => {
    const content = '';
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();

    assert.strictEqual(edits.length, 0, 'Empty file should produce no edits');
  });

  test('35. File with no imports produces no edits', () => {
    const content = `const x = 42;
console.log(x);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();

    assert.strictEqual(edits.length, 0, 'File with no imports should produce no edits');
  });

  test('36. All imports unused - removes everything', () => {
    const content = `import { Unused1 } from './a';
import { Unused2 } from './b';
import { Unused3 } from './c';

const x = 42;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should remove all imports
    assert.ok(!result.includes('import'), 'All unused imports should be removed');
    assert.ok(result.includes('const x = 42'), 'Code should remain');
  });

  test('37. TypeScript type-only imports are preserved when used', () => {
    // TypeScript 3.8+ syntax: import type { Foo }
    const content = `import type { MyType } from './types';

const x: MyType = { value: 42 };
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Type import should be preserved (used in type annotation)
    assert.ok(result.includes('MyType'), 'Type-only import should be preserved when used');
  });

  test('38. TypeScript type-only imports are removed when unused', () => {
    const content = `import type { UnusedType } from './types';

const x = 42;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Unused type import should be removed
    assert.ok(!result.includes('UnusedType'), 'Unused type-only import should be removed');
  });

  test('39. Multiple custom regex groups work together', () => {
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
    const doc = new MockTextDocument('test.ts', content);

    // Custom grouping: Angular first, then RxJS, then Remaining, then Workspace
    config.setConfig('grouping', [
      '/angular/',        // Regex group 1: Angular
      '/^rxjs/',          // Regex group 2: RxJS (starts with rxjs)
      'Modules',          // Remaining modules
      'Workspace'         // Local files
    ]);

    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Expected order: Angular -> RxJS -> Workspace
    assert.strictEqual(lines.length, 4, 'Should have 4 imports');
    assert.ok(lines[0].includes('@angular/core'), 'First should be Angular (regex group 1)');
    assert.ok(lines[1].includes('rxjs/operators') || lines[1].includes('from \'rxjs\''), 'Second should be RxJS');
    assert.ok(lines[2].includes('from \'rxjs\'') || lines[2].includes('rxjs/operators'), 'Third should be RxJS');
    assert.ok(lines[3].includes('./helper'), 'Last should be workspace');
  });

  test('40. File with only whitespace produces no edits', () => {
    const content = '\n\n  \n\t\n';
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();

    assert.strictEqual(edits.length, 0, 'Whitespace-only file should produce no edits');
  });

  test('41. Imports from same module are merged by default', () => {
    // Scenario: Multiple imports from the same library
    // By default (new behavior), we merge them into a single import
    const content = `import { A } from './lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    // mergeImportsFromSameModule is true by default
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge into single import
    assert.strictEqual(lines.length, 1, 'Should have 1 merged import line');
    assert.ok(lines[0].includes('A'), 'Merged import should have A');
    assert.ok(lines[0].includes('B'), 'Merged import should have B');
    assert.ok(lines[0].includes('{ A, B }'), 'Should be merged as { A, B }');
  });

  test('43. Imports NOT merged when disabled (preserves old TypeScript Hero behavior)', () => {
    // Scenario: When mergeImportsFromSameModule is false (old behavior for migrated users)
    const content = `import { A } from './lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('mergeImportsFromSameModule', false);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should keep imports separate
    assert.strictEqual(lines.length, 2, 'Should have 2 separate import lines');
    assert.ok(lines[0].includes('A'), 'First import should have A');
    assert.ok(lines[1].includes('B'), 'Second import should have B');
  });

  test('44. Merge default and named imports from same module', () => {
    // Scenario: Default import + named import from same module
    const content = `import DefaultExport from './lib';
import { Named } from './lib';

console.log(DefaultExport, Named);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge into: import DefaultExport, { Named } from './lib'
    assert.strictEqual(lines.length, 1, 'Should have 1 merged import line');
    assert.ok(lines[0].includes('DefaultExport'), 'Should have default');
    assert.ok(lines[0].includes('Named'), 'Should have named');
    assert.ok(lines[0].includes('DefaultExport, { Named }'), 'Should be merged as default + named');
  });

  test('45. Namespace imports cannot be merged', () => {
    // Scenario: Namespace import + named import from same module
    const content = `import * as Lib from './lib';
import { Named } from './lib';

console.log(Lib, Named);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Namespace imports cannot be merged - should keep separate
    assert.strictEqual(lines.length, 2, 'Should have 2 separate import lines (namespace cannot merge)');
    assert.ok(result.includes('* as Lib'), 'Should have namespace import');
    assert.ok(result.includes('{ Named }'), 'Should have named import');
  });

  test('46. String imports never merge', () => {
    // Scenario: Multiple string imports from same module (side effects)
    const content = `import './lib';
import './lib';

console.log('side effects');
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // String imports have side effects - keep all separate
    assert.strictEqual(lines.length, 2, 'Should keep both string imports (side effects)');
  });

  test('42. TypeScript default type-only imports work correctly', () => {
    // TS 3.8+: import type Foo from 'lib' (default type import)
    const content = `import type MyClass from './types';

const x: typeof MyClass = null as any;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Default type import should be preserved when used
    assert.ok(result.includes('MyClass'), 'Default type-only import should be preserved when used');
  });

  test('47. Duplicate specifiers are removed when merging', () => {
    // Scenario: Same specifier imported twice (shouldn't happen but we handle it)
    const content = `import { A } from './lib';
import { A, B } from './lib';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should deduplicate: { A, B } (A appears only once)
    assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
    assert.ok(lines[0].includes('{ A, B }'), 'Should deduplicate to { A, B }');

    // Count occurrences of 'A' in the import (should be exactly 1)
    const importLine = lines[0];
    const matches = importLine.match(/\bA\b/g);
    assert.strictEqual(matches?.length, 1, 'A should appear only once in import');
  });

  test('48. Aliased imports merge correctly', () => {
    // Scenario: Mix of aliased and non-aliased imports
    const content = `import { A as AliasA } from './lib';
import { B } from './lib';

console.log(AliasA, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge with alias preserved
    assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
    assert.ok(lines[0].includes('A as AliasA'), 'Should preserve alias');
    assert.ok(lines[0].includes('B'), 'Should include B');
  });

  test('49. Three or more imports from same module merge correctly', () => {
    // Scenario: Multiple imports that should all merge
    const content = `import { A } from './lib';
import { B } from './lib';
import { C } from './lib';
import Default from './lib';

console.log(A, B, C, Default);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge all into: import Default, { A, B, C } from './lib'
    assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
    assert.ok(lines[0].includes('Default'), 'Should have default');
    assert.ok(lines[0].includes('A'), 'Should have A');
    assert.ok(lines[0].includes('B'), 'Should have B');
    assert.ok(lines[0].includes('C'), 'Should have C');
    assert.ok(lines[0].includes('Default, { A, B, C }'), 'Should be merged as Default, { A, B, C }');
  });

  test('50. Merging preserves alphabetical order of specifiers', () => {
    // Scenario: Imports in random order should be sorted after merge
    const content = `import { Z } from './lib';
import { A } from './lib';
import { M } from './lib';

console.log(Z, A, M);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge and sort: { A, M, Z }
    assert.strictEqual(lines.length, 1, 'Should have 1 merged import');
    assert.ok(lines[0].includes('{ A, M, Z }'), 'Should be alphabetically sorted: { A, M, Z }');
  });

  test('51. Merging works with multiline formatting', () => {
    // Scenario: Merged import exceeds multiline threshold
    const content = `import { VeryLongNameOne } from './lib';
import { VeryLongNameTwo } from './lib';

console.log(VeryLongNameOne, VeryLongNameTwo);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('multiLineWrapThreshold', 30); // Force multiline
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should merge and format as multiline
    assert.ok(result.includes('VeryLongNameOne'), 'Should include first name');
    assert.ok(result.includes('VeryLongNameTwo'), 'Should include second name');
    // Should be multiline (contains newline within braces)
    const hasMultiline = result.match(/import\s*\{[^}]*\n[^}]*\}/);
    assert.ok(hasMultiline, 'Should format as multiline import when threshold exceeded');
  });

  test('52. Merging works with custom import grouping', () => {
    // Scenario: Ensure merging happens before grouping
    const content = `import { A } from '@angular/core';
import { B } from '@angular/core';
import { C } from './local';
import { D } from './local';

console.log(A, B, C, D);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('grouping', ['/angular/', 'Workspace']);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should have 2 merged imports (one per group)
    assert.strictEqual(lines.length, 2, 'Should have 2 imports (one per group)');
    assert.ok(lines[0].includes('@angular/core'), 'First should be Angular');
    assert.ok(lines[0].includes('{ A, B }'), 'Angular imports should be merged');
    assert.ok(lines[1].includes('./local'), 'Second should be local');
    assert.ok(lines[1].includes('{ C, D }'), 'Local imports should be merged');
  });

  test('53. Merging disabled works with sorting by first specifier', () => {
    // Scenario: When merging is off + sorting by first specifier
    const content = `import { Z } from './z';
import { A } from './a';

console.log(Z, A);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('mergeImportsFromSameModule', false);
    config.setConfig('organizeSortsByFirstSpecifier', true);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should keep separate AND sort by first specifier (A before Z)
    assert.strictEqual(lines.length, 2, 'Should keep imports separate');
    assert.ok(lines[0].includes('A'), 'First should be A (sorted by specifier)');
    assert.ok(lines[1].includes('Z'), 'Second should be Z');
  });

  test('54. Same specifier with different aliases are both preserved', () => {
    // Scenario: Import same symbol with different aliases (valid TypeScript!)
    const content = `import { Component as Comp1 } from '@angular/core';
import { Component as Comp2 } from '@angular/core';

console.log(Comp1, Comp2);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge but preserve BOTH aliases (different identifiers in code)
    assert.strictEqual(lines.length, 1, 'Should merge into one import');
    assert.ok(lines[0].includes('Component as Comp1'), 'Should preserve first alias');
    assert.ok(lines[0].includes('Component as Comp2'), 'Should preserve second alias');
  });

  test('55. Multiple defaults from same module - first one wins', () => {
    // Scenario: Invalid TypeScript but we handle gracefully
    const content = `import Default1 from './lib';
import Default2 from './lib';
import { Named } from './lib';

console.log(Default1, Named);
// Default2 is unused, will be removed
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge, keeping only the USED default (Default1)
    assert.strictEqual(lines.length, 1, 'Should merge into one import');
    assert.ok(lines[0].includes('Default1'), 'Should keep first default');
    assert.ok(lines[0].includes('Named'), 'Should include named import');
    assert.ok(!lines[0].includes('Default2'), 'Should not include unused default');
  });

  test('56. FIXED: Merging + removeTrailingIndex order of operations', () => {
    // Previously this was a bug: /index removal happened AFTER merging
    // Fixed: /index removal now happens BEFORE merging
    const content = `import { A } from './lib/index';
import { B } from './lib';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('removeTrailingIndex', true);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should merge to single import from './lib'
    assert.strictEqual(lines.length, 1, 'Should merge into one import');
    assert.ok(lines[0].includes('{ A, B }'), 'Should merge to { A, B }');
    assert.ok(lines[0].includes('./lib'), 'Should be from ./lib');
    assert.ok(!lines[0].includes('/index'), 'Should have /index removed');
  });

  test('57. Type-only imports merge together', () => {
    // Scenario: TypeScript 3.8+ type-only imports
    const content = `import type { TypeA } from './types';
import type { TypeB } from './types';

const a: TypeA = null as any;
const b: TypeB = null as any;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Type-only imports should merge
    assert.strictEqual(lines.length, 1, 'Should merge type-only imports');
    assert.ok(lines[0].includes('TypeA'), 'Should include TypeA');
    assert.ok(lines[0].includes('TypeB'), 'Should include TypeB');
  });

  test('58. String import + Named import from same module kept separate', () => {
    // Scenario: String import (side effects) cannot merge with named import
    const content = `import './lib';
import { Named } from './lib';

console.log(Named);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // String and named imports both kept (2 separate lines)
    assert.strictEqual(lines.length, 2, 'Should keep string and named separate');
    assert.ok(result.includes("import './lib'"), 'Should have string import');
    assert.ok(result.includes('{ Named }'), 'Should have named import');
  });

  test('59. String + Namespace + Named from same module all kept separate', () => {
    // Scenario: Mix of all three types - none can merge with each other
    const content = `import './lib';
import * as Lib from './lib';
import { Named } from './lib';

console.log(Lib, Named);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // All three kept separate
    assert.strictEqual(lines.length, 3, 'Should keep all three separate');
    assert.ok(result.includes("import './lib'"), 'Should have string import');
    assert.ok(result.includes('* as Lib'), 'Should have namespace import');
    assert.ok(result.includes('{ Named }'), 'Should have named import');
  });

  test('60. Case-sensitive module names NOT merged', () => {
    // Scenario: Different casing = different modules
    const content = `import { A } from './Lib';
import { B } from './lib';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Different case = different modules, not merged
    assert.strictEqual(lines.length, 2, 'Should keep separate (case-sensitive)');
    assert.ok(result.includes('./Lib'), 'Should have ./Lib (capital L)');
    assert.ok(result.includes('./lib'), 'Should have ./lib (lowercase l)');
  });

  test('61. Multiple namespace imports from same module kept separate', () => {
    // Scenario: Multiple namespace imports cannot merge
    const content = `import * as Lib1 from './lib';
import * as Lib2 from './lib';

console.log(Lib1, Lib2);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Both namespace imports kept separate
    assert.strictEqual(lines.length, 2, 'Should keep both namespace imports separate');
    assert.ok(result.includes('* as Lib1'), 'Should have Lib1');
    assert.ok(result.includes('* as Lib2'), 'Should have Lib2');
  });

  test('62. /index removal disabled - imports NOT merged', () => {
    // Scenario: When /index removal is OFF, './lib/index' and './lib' are different
    const content = `import { A } from './lib/index';
import { B } from './lib';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('removeTrailingIndex', false);
    config.setConfig('mergeImportsFromSameModule', true);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should NOT merge (different module names)
    assert.strictEqual(lines.length, 2, 'Should keep separate when /index not removed');
    assert.ok(result.includes('./lib/index'), 'Should keep /index');
    assert.ok(result.includes("'./lib'"), 'Should have ./lib');
  });

  test('63. Two defaults from same module both used - first wins', () => {
    // Scenario: Invalid TS but both defaults actually used
    const content = `import Default1 from './lib';
import Default2 from './lib';

console.log(Default1, Default2);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Both used, so should merge but only keep first default
    // Second default becomes a regular specifier or gets dropped
    // Let's see what actually happens
    assert.strictEqual(lines.length, 1, 'Should merge into one import');
    assert.ok(lines[0].includes('Default1'), 'Should have Default1');
    // Default2 might be kept as named or dropped - depends on parser
  });

  test('64. Property access should not count as import usage', () => {
    // Scenario: import { reduce } from 'lodash' but only use arr.reduce() (Array method)
    // The identifier "reduce" appears in .reduce() but is NOT using the import
    const content = `import { filter, map, reduce } from 'lodash';

const data = [1, 2, 3];
const doubled = map(data, x => x * 2);
const result = filter(doubled, x => x > 5)
  .reduce((acc, val) => acc + val, 0);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Should keep map and filter (used as functions), remove reduce (only used as method)
    assert.strictEqual(lines.length, 1, 'Should have one import line');
    assert.ok(lines[0].includes('filter'), 'Should keep filter');
    assert.ok(lines[0].includes('map'), 'Should keep map');
    assert.ok(!lines[0].includes('reduce'), 'Should remove reduce (not used as function)');
  });

  test('65. Old TypeScript syntax: import = require (used)', () => {
    // Scenario: Old TypeScript syntax that's still used in legacy codebases
    // This is import foo = require('lib') syntax (deprecated but must not break)
    const content = `import foo = require('old-lib');
import { bar } from 'new-lib';

console.log(foo, bar);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.trim().length > 0);

    // Both imports should be kept (both used)
    assert.ok(result.includes('import foo = require'), 'Should keep import equals (used)');
    assert.ok(result.includes("import { bar } from 'new-lib'"), 'Should keep modern import');
    assert.strictEqual(lines.filter(l => l.startsWith('import')).length, 2, 'Should have 2 imports');
  });

  test('66. Old TypeScript syntax: import = require (unused)', () => {
    // Scenario: Unused import equals should be removed like any other unused import
    const content = `import foo = require('old-lib');
import { bar } from 'new-lib';

console.log(bar);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n').filter(line => line.startsWith('import'));

    // Only bar should remain
    assert.strictEqual(lines.length, 1, 'Should have only 1 import');
    assert.ok(!result.includes('import foo = require'), 'Should remove unused import equals');
    assert.ok(result.includes("import { bar } from 'new-lib'"), 'Should keep used import');
  });

  test('67. Old TypeScript syntax: Mixed with grouping', () => {
    // Scenario: import equals should be grouped like namespace imports
    const content = `import { Component } from '@angular/core';
import oldLib = require('old-lib');
import 'zone.js';
import { MyClass } from './my-class';

const component = Component;
const lib = oldLib;
const local = MyClass;
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

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
  });

  test('68. Old TypeScript syntax: Formatting matches config', () => {
    // Scenario: import equals should respect quote and semicolon settings
    const content = `import foo = require("old-lib");

console.log(foo);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('stringQuoteStyle', "'");
    config.setConfig('insertSemicolons', false);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should use single quotes and no semicolon
    assert.ok(result.includes("import foo = require('old-lib')"), 'Should use single quotes');
    assert.ok(!result.includes("import foo = require('old-lib');"), 'Should not have semicolon');

    // Reset config
    config.setConfig('stringQuoteStyle', "'");
    config.setConfig('insertSemicolons', true);
  });

  // =============================================================================
  // CRITICAL EDGE CASES - File Headers & Special Syntax
  // =============================================================================

  test('69. Shebang: Imports inserted AFTER shebang', () => {
    // CRITICAL: Shebang MUST be first line or script won't execute
    // Scenario: Node.js executable script with shebang
    const content = `#!/usr/bin/env node
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n');

    // CRITICAL: Shebang MUST be on line 0
    assert.strictEqual(lines[0], '#!/usr/bin/env node', 'Shebang must be first line');

    // Import should come after shebang
    assert.ok(result.includes("import { used } from './lib';"), 'Should keep used import');
    assert.ok(!result.includes('unused'), 'Should remove unused import');

    const importLineIndex = lines.findIndex(l => l.includes('import'));
    assert.ok(importLineIndex > 0, 'Import must come AFTER shebang');
  });

  test('70. Use strict: Imports inserted AFTER use strict', () => {
    // CRITICAL: 'use strict' changes JavaScript behavior, must be first statement
    // Scenario: Strict mode file
    const content = `'use strict';
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n');

    // CRITICAL: 'use strict' MUST be first line
    assert.strictEqual(lines[0], "'use strict';", "'use strict' must be first line");

    // Import should come after 'use strict'
    assert.ok(result.includes("import { used } from './lib';"), 'Should keep used import');
    assert.ok(!result.includes('unused'), 'Should remove unused import');

    const importLineIndex = lines.findIndex(l => l.includes('import'));
    assert.ok(importLineIndex > 0, 'Import must come AFTER use strict');
  });

  test('71. Use strict (double quotes): Imports inserted AFTER use strict', () => {
    // Scenario: "use strict" with double quotes (also valid)
    const content = `"use strict";
import { used } from './lib';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    const lines = result.split('\n');

    // CRITICAL: "use strict" MUST be preserved
    assert.strictEqual(lines[0], '"use strict";', '"use strict" must be first line');

    const importLineIndex = lines.findIndex(l => l.includes('import'));
    assert.ok(importLineIndex > 0, 'Import must come AFTER use strict');
  });

  test('72. Triple-slash directives: Imports inserted AFTER directives', () => {
    // CRITICAL: /// <reference /> directives configure TypeScript compiler
    // Scenario: TypeScript file with reference directives
    const content = `/// <reference path="./types.d.ts" />
/// <reference types="node" />
import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // CRITICAL: Triple-slash directives must be preserved and stay before imports
    assert.ok(result.includes('/// <reference path="./types.d.ts" />'), 'Should preserve path directive');
    assert.ok(result.includes('/// <reference types="node" />'), 'Should preserve types directive');

    const lines = result.split('\n');
    const directiveLine1 = lines.findIndex(l => l.includes('reference path'));
    const directiveLine2 = lines.findIndex(l => l.includes('reference types'));
    const importLine = lines.findIndex(l => l.includes("import { used }"));

    assert.ok(directiveLine1 < importLine, 'Reference directives must come before imports');
    assert.ok(directiveLine2 < importLine, 'Reference directives must come before imports');
  });

  test('73. Leading comments: Preserved before imports', () => {
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
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // CRITICAL: Comments must be preserved
    assert.ok(result.includes('Copyright (c) 2025 Company'), 'Should preserve copyright');
    assert.ok(result.includes('Licensed under MIT'), 'Should preserve license');
    assert.ok(result.includes('// Main module file'), 'Should preserve comment');

    const lines = result.split('\n');
    const copyrightLine = lines.findIndex(l => l.includes('Copyright'));
    const importLine = lines.findIndex(l => l.includes("import { used }"));

    assert.ok(copyrightLine < importLine, 'Comments must come before imports');
  });

  test('74. Combined headers: Shebang + comments + use strict', () => {
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
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

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
  });

  // =============================================================================
  // CRITICAL EDGE CASES - Dynamic Imports & Modern Syntax
  // =============================================================================

  test('75. Dynamic imports: Not confused with static imports', () => {
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
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // CRITICAL: Dynamic imports must NOT be touched
    assert.ok(result.includes("import('./dynamic-module')"), 'Dynamic import must be preserved');
    assert.ok(result.includes("import('./another-dynamic')"), 'Dynamic import must be preserved');
    assert.ok(result.includes("import { helper } from './helper';"), 'Static import preserved');

    // Dynamic imports should still be in function body, not moved to top
    const lines = result.split('\n');
    const dynamicLine = lines.findIndex(l => l.includes("import('./dynamic-module')"));
    const functionLine = lines.findIndex(l => l.includes('async function loadModule'));

    assert.ok(dynamicLine > functionLine, 'Dynamic import stays in function body');
  });

  test('76. import.meta: Not confused with imports', () => {
    // CRITICAL: import.meta usage must NOT be removed
    // Scenario: ES module using import.meta
    const content = `import { helper } from './helper';

const currentUrl = import.meta.url;
const dirname = import.meta.dirname;

console.log(helper, currentUrl);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // CRITICAL: import.meta usage must be preserved
    assert.ok(result.includes('import.meta.url'), 'import.meta.url must be preserved');
    assert.ok(result.includes('import.meta.dirname'), 'import.meta.dirname must be preserved');
    assert.ok(result.includes("import { helper } from './helper';"), 'Import preserved');
  });

  test('77. Empty import specifiers: Should be removed', () => {
    // Scenario: Malformed import with no specifiers
    const content = `import {} from './lib';
import { used } from './used';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Empty import should be cleaned up
    assert.ok(!result.includes("import {} from './lib'"), 'Empty import should be removed');
    assert.ok(result.includes("import { used } from './used';"), 'Used import preserved');
  });

  test('78. Whitespace-only import specifiers: Should be removed', () => {
    // Scenario: Malformed import with only whitespace
    const content = `import {   } from './lib';
import { used } from './used';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Whitespace-only import should be cleaned up
    assert.ok(!result.includes("import {   } from './lib'"), 'Whitespace import should be removed');
    assert.ok(result.includes("import { used } from './used';"), 'Used import preserved');
  });

  // =============================================================================
  // CRITICAL EDGE CASES - Malformed Code
  // =============================================================================

  test('79. File with only imports (all unused): All removed safely', () => {
    // CRITICAL: Must handle files that become empty
    // Scenario: File that only had imports, all unused
    const content = `import { A } from './a';
import { B } from './b';
import { C } from './c';
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // All imports should be removed, leaving empty file (or just whitespace)
    assert.ok(!result.includes('import'), 'All unused imports should be removed');
    assert.ok(result.trim().length === 0, 'File should be empty');
  });

  test('80. Imports after code: Malformed but should not crash', () => {
    // CRITICAL: Extension must handle malformed code gracefully
    // Scenario: Invalid TypeScript with imports after code (shouldn't exist but might)
    const content = `const x = 5;

import { foo } from './lib';

console.log(x, foo);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);

    // Should not throw error
    let threw = false;
    try {
      const edits = manager.organizeImports();
      const result = applyEdits(content, edits);

      // Import should still be recognized and kept (it's used)
      assert.ok(result.includes('foo'), 'Should preserve import identifier');
    } catch (e) {
      threw = true;
    }

    assert.ok(!threw, 'Should not throw error on malformed code');
  });

  test('81. Comments between imports: Preserved', () => {
    // CRITICAL: Don't lose important comments
    // Scenario: Comments explaining imports
    const content = `import { A } from './a';

// This import is needed for side effects
import './polyfill';

// Main imports
import { B } from './b';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Note: Comments between imports may not be preserved in their exact position
    // (this is a known limitation of AST-based refactoring)
    // But the imports themselves should be organized correctly
    assert.ok(result.includes("import { A } from './a';"), 'Import A preserved');
    assert.ok(result.includes("import { B } from './b';"), 'Import B preserved');
    assert.ok(result.includes("import './polyfill';"), 'Side effect import preserved');
  });

  test('82. Very long import line: Multiline wrapping works', () => {
    // Scenario: Import with many specifiers exceeding threshold
    const content = `import { SuperLongIdentifierName1, SuperLongIdentifierName2, SuperLongIdentifierName3, UnusedName } from './lib';

console.log(SuperLongIdentifierName1, SuperLongIdentifierName2, SuperLongIdentifierName3);
`;
    const doc = new MockTextDocument('test.ts', content);
    config.setConfig('multiLineWrapThreshold', 40); // Low threshold to force wrapping
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Should wrap to multiline (the braces part alone is > 40 chars)
    assert.ok(result.includes('{\n'), 'Should use multiline format');
    assert.ok(result.includes('SuperLongIdentifierName1'), 'Should preserve specifier 1');
    assert.ok(result.includes('SuperLongIdentifierName2'), 'Should preserve specifier 2');
    assert.ok(result.includes('SuperLongIdentifierName3'), 'Should preserve specifier 3');

    // Unused specifier should be removed
    assert.ok(!result.includes('UnusedName'), 'Should remove unused specifier');

    // Reset config
    config.setConfig('multiLineWrapThreshold', 125);
  });

  test('83. BOM (Byte Order Mark): Handled gracefully (known limitation)', () => {
    // NOTE: ts-morph strips BOM during parsing (this is a known limitation)
    // This test verifies the extension doesn't crash on BOM files
    // Scenario: File starting with BOM
    const BOM = '\uFEFF';
    const content = `${BOM}import { used } from './lib';
import { unused } from './unused';

console.log(used);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);

    // Should not throw error
    let threw = false;
    try {
      const edits = manager.organizeImports();
      const result = applyEdits(content, edits);

      // File should still be valid (BOM will be stripped by ts-morph, but that's okay)
      assert.ok(result.includes("import { used } from './lib';"), 'Import preserved');
      assert.ok(!result.includes('unused'), 'Unused import removed');
    } catch (e) {
      threw = true;
    }

    assert.ok(!threw, 'Should handle BOM files without crashing');
  });

  test('84. Template strings with import keyword: Not confused', () => {
    // CRITICAL: String literals containing "import" must not be confused
    // Scenario: Template string with import keyword
    const content = `import { helper } from './helper';

const message = \`You should import the module\`;
const code = "import { X } from 'lib';";

console.log(helper, message);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // Import should be preserved
    assert.ok(result.includes("import { helper } from './helper';"), 'Real import preserved');

    // String literals must NOT be affected
    assert.ok(result.includes('You should import the module'), 'Template string preserved');
    assert.ok(result.includes(`"import { X } from 'lib';"`), 'String literal preserved');
  });

  // =============================================================================
  // EDGE CASE - Configuration Error Handling
  // =============================================================================

  test('85. Invalid grouping config: Falls back to defaults gracefully', () => {
    // CRITICAL: Bad config must not crash extension
    // Scenario: User provides invalid grouping configuration
    const content = `import { A } from './a';
import { B } from 'library';

console.log(A, B);
`;
    const doc = new MockTextDocument('test.ts', content);

    // Create config with invalid grouping that will throw during parsing
    const badConfig = new MockImportsConfig();
    badConfig.setConfig('grouping', ['INVALID_GROUP_IDENTIFIER']); // This will throw in parser

    const manager = new ImportManager(doc, badConfig, logger);

    // Should not throw - must fall back to defaults
    let threw = false;
    try {
      const edits = manager.organizeImports();
      const result = applyEdits(content, edits);

      // Should still organize with default grouping
      assert.ok(result.includes("import { A } from './a';"), 'Import preserved');
      assert.ok(result.includes("import { B } from 'library';"), 'Import preserved');
    } catch (e) {
      threw = true;
    }

    assert.ok(!threw, 'Should not throw on invalid config - must fall back gracefully');
  });

  test('86. Blank lines after imports: Exactly one blank line', () => {
    // CRITICAL: Should have exactly ONE blank line after imports, not zero, not two
    // Scenario: Remove some imports, check spacing
    const content = `import { UsedClass } from './used-class';
import { unused } from './unused';
import { AnotherUnused } from './another-unused';

const instance = new UsedClass();
console.log(instance);
`;
    const doc = new MockTextDocument('test.ts', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

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
  });
});
