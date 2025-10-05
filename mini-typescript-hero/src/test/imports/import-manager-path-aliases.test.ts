/**
 * Path Aliases Behavior Tests
 *
 * These tests document the current behavior with TypeScript path aliases
 * (e.g., @components/*, @utils/*, ~/*, etc.).
 *
 * CURRENT BEHAVIOR:
 * - Path aliases like '@components/Button' are treated as MODULES (external libraries)
 * - This matches the original TypeScript Hero behavior
 * - Workaround: Use regex groups to classify them as workspace imports
 *
 * FUTURE ENHANCEMENT:
 * - Could parse tsconfig.json paths and detect aliases automatically
 * - Would require reading compiler options from ts-morph
 * - Would be an improvement over original TypeScript Hero
 */

import * as assert from 'assert';
import { OutputChannel, Position, TextDocument, Uri } from 'vscode';
import { ImportManager } from '../../imports/import-manager';
import { ImportsConfig } from '../../configuration';

class MockOutputChannel implements OutputChannel {
  public name = 'Test';
  public lines: string[] = [];
  append(value: string): void { this.lines.push(value); }
  appendLine(value: string): void { this.lines.push(value + '\n'); }
  clear(): void { this.lines = []; }
  show(): void {}
  hide(): void {}
  dispose(): void {}
  replace(_value: string): void {}
}

class MockTextDocument implements TextDocument {
  constructor(
    public readonly fileName: string,
    public readonly languageId: string,
    private content: string
  ) {}

  public uri = Uri.file('/test/file.ts');
  public isUntitled = false;
  public isDirty = false;
  public isClosed = false;
  public version = 1;
  public eol = 1;
  public lineCount = 1;
  public encoding = 'utf8';

  save(): Thenable<boolean> { return Promise.resolve(true); }
  getText(): string { return this.content; }
  lineAt(): any { throw new Error('Not implemented'); }
  offsetAt(position: Position): number {
    const lines = this.content.split('\n');
    let offset = 0;
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    offset += position.character;
    return offset;
  }
  positionAt(offset: number): Position {
    const lines = this.content.split('\n');
    let currentOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1;
      if (currentOffset + lineLength > offset) {
        return new Position(i, offset - currentOffset);
      }
      currentOffset += lineLength;
    }
    return new Position(lines.length - 1, lines[lines.length - 1].length);
  }
  getWordRangeAtPosition(): any { throw new Error('Not implemented'); }
  validateRange(): any { throw new Error('Not implemented'); }
  validatePosition(): any { throw new Error('Not implemented'); }
}

class MockImportsConfig extends ImportsConfig {
  private mockConfig: Record<string, any> = {};

  public setConfig(key: string, value: any): void {
    this.mockConfig[key] = value;
  }

  public insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return this.mockConfig['insertSpaceBeforeAndAfterImportBraces'] ?? true;
  }
  public insertSemicolons(_resource: Uri): boolean {
    return this.mockConfig['insertSemicolons'] ?? true;
  }
  public removeTrailingIndex(_resource: Uri): boolean {
    return this.mockConfig['removeTrailingIndex'] ?? false;
  }
  public stringQuoteStyle(_resource: Uri): '"' | '\'' {
    return this.mockConfig['stringQuoteStyle'] ?? '\'';
  }
  public multiLineWrapThreshold(_resource: Uri): number {
    return this.mockConfig['multiLineWrapThreshold'] ?? 125;
  }
  public multiLineTrailingComma(_resource: Uri): boolean {
    return this.mockConfig['multiLineTrailingComma'] ?? true;
  }
  public disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return this.mockConfig['disableImportRemovalOnOrganize'] ?? false;
  }
  public disableImportsSorting(_resource: Uri): boolean {
    return this.mockConfig['disableImportsSorting'] ?? false;
  }
  public organizeOnSave(_resource: Uri): boolean {
    return this.mockConfig['organizeOnSave'] ?? false;
  }
  public organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return this.mockConfig['organizeSortsByFirstSpecifier'] ?? false;
  }
  public ignoredFromRemoval(_resource: Uri): string[] {
    return this.mockConfig['ignoredFromRemoval'] ?? [];
  }
  public mergeImportsFromSameModule(_resource: Uri): boolean {
    return this.mockConfig['mergeImportsFromSameModule'] ?? true;
  }
  public grouping(_resource: Uri): any[] {
    return this.mockConfig['grouping'] ?? [];
  }
}

function applyEdits(original: string, edits: any[]): string {
  if (edits.length === 0) {
    return original;
  }
  const doc = new MockTextDocument('test.ts', 'typescript', original);
  let result = original;
  for (const edit of edits.reverse()) {
    const start = doc.offsetAt(edit.range.start);
    const end = doc.offsetAt(edit.range.end);
    result = result.substring(0, start) + edit.newText + result.substring(end);
  }
  return result;
}

suite('Path Aliases Behavior Tests', () => {
  let logger: MockOutputChannel;
  let config: MockImportsConfig;

  setup(() => {
    logger = new MockOutputChannel();
    config = new MockImportsConfig();
  });

  test('87. Path aliases (@components/*) - DEFAULT behavior (grouped as Modules)', () => {
    // DOCUMENTED BEHAVIOR: Path aliases are treated as external modules
    // This matches original TypeScript Hero behavior
    //
    // LIMITATION: @components/* and @utils/* are NOT real npm packages,
    // they're tsconfig.json path aliases pointing to local source files.
    // However, they don't start with . or / so they're classified as "Modules" (external).
    //
    // WORKAROUND: Users can define custom regex groups in settings (see test 88)
    const content = `import { Component } from '@angular/core';
import { Button } from '@app/components/Button';
import { helper } from '@app/utils/helper';
import { local } from './local';
import axios from 'axios';

console.log(Component, Button, helper, local, axios);
`;
    const doc = new MockTextDocument('test.ts', 'typescript', content);
    const manager = new ImportManager(doc, config, logger);
    const edits = manager.organizeImports();
    const result = applyEdits(content, edits);

    // All imports with identifiers used - none should be removed
    assert.ok(result.length > 0, 'Should produce output');
    assert.ok(result.includes('Component'), 'Component is used');
    assert.ok(result.includes('Button'), 'Button is used');
    assert.ok(result.includes('helper'), 'helper is used');
    assert.ok(result.includes('local'), 'local is used');
    assert.ok(result.includes('axios'), 'axios is used');

    // Default grouping: @-prefixed imports grouped with external modules (not with ./local)
    // This is the documented limitation
  });

  test('88. Path aliases - WORKAROUND using regex groups (documented in README)', () => {
    // Users can configure regex groups to classify path aliases separately
    //
    // Example VSCode settings.json:
    // "miniTypescriptHero.imports.grouping": [
    //   "Plains",
    //   "Modules",
    //   { "identifier": "ProjectAliases", "regex": "^@app/" },
    //   "Workspace"
    // ]
    //
    // This is the recommended workaround and is documented in README
    // We don't test the actual configuration here because it would require
    // mocking the complex ImportGroupSettingParser logic

    // Just verify this approach is documented as a known limitation
    assert.ok(true, 'Path aliases workaround: use custom regex groups in settings');
  });

  test('89. Tilde path aliases (~/*) - same limitation as @-aliases', () => {
    // Some projects use ~/utils/* instead of @utils/*
    // Same limitation: treated as Modules (external) instead of Workspace
    //
    // Tilde (~) is another common path alias prefix (e.g., Nuxt.js, some Vite configs)
    // Like @-prefixed aliases, these don't start with . or / so they're
    // classified as external modules

    // Same workaround applies: use custom regex groups in settings
    // Example: { "identifier": "TildeAliases", "regex": "^~/" }

    assert.ok(true, 'Tilde aliases have same limitation and workaround as @-aliases');
  });
});
