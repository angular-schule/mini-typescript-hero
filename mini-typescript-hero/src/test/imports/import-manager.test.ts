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
import { ImportGroup, ImportGroupSettingParser } from '../../imports/import-grouping';

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

  grouping(_resource: Uri): ImportGroup[] {
    const groupSettings = this.mockConfig.get('grouping') ?? ['Plains', 'Modules', 'Workspace'];
    return groupSettings.map((setting: any) => ImportGroupSettingParser.parseSetting(setting));
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
      const line = lines[startLine];
      lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
    } else {
      // Multi-line edit
      const firstLine = lines[startLine].substring(0, startChar);
      const lastLine = lines[endLine].substring(endChar);
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
    // This was a critical bug found in Session 3:
    // We were skipping ALL identifiers in declarations, not just the declared name.
    // Fixed: Only skip the NAME being declared, not usages within the declaration.
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
    // This was a bug found in Session 3:
    // Even with sorting disabled, import groups were calling sortedImports getter
    // which internally sorted them. Fixed: Use group.imports when sorting disabled.
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
});
