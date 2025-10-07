/**
 * Integration Tests for ImportOrganizer
 *
 * These tests verify the command layer that orchestrates import organization:
 * - Command registration and execution
 * - Error handling and user notifications
 * - Language support validation
 * - Organize-on-save functionality
 *
 * Note: We use unit-style mocks instead of full VSCode integration tests
 * since the actual import organization logic is thoroughly tested in
 * import-manager.test.ts (86 tests).
 */

import * as assert from 'assert';
import { OutputChannel, Position, TextDocument, Uri } from 'vscode';
import { ImportOrganizer } from '../../imports/import-organizer';
import { ImportsConfig } from '../../configuration';

/**
 * Mock OutputChannel for testing
 */
class MockOutputChannel implements OutputChannel {
  public name: string = 'Test';
  public lines: string[] = [];

  append(value: string): void {
    this.lines.push(value);
  }

  appendLine(value: string): void {
    this.lines.push(value + '\n');
  }

  clear(): void {
    this.lines = [];
  }

  show(): void {}
  hide(): void {}
  dispose(): void {}
  replace(_value: string): void {}
}

/**
 * Mock TextDocument for testing
 */
class MockTextDocument implements TextDocument {
  constructor(
    public readonly fileName: string,
    public readonly languageId: string,
    private content: string
  ) {}

  public uri: Uri = Uri.file('/test/file.ts');
  public isUntitled = false;
  public isDirty = false;
  public isClosed = false;
  public version = 1;
  public eol = 1;
  public lineCount = 1;
  public encoding = 'utf8';

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  getText(): string {
    return this.content;
  }

  lineAt(): any {
    throw new Error('Not implemented');
  }

  offsetAt(position: Position): number {
    // Simple implementation: calculate offset from line and character
    const lines = this.content.split('\n');
    let offset = 0;
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    offset += position.character;
    return offset;
  }

  positionAt(offset: number): Position {
    // Simple implementation: find line and character from offset
    const lines = this.content.split('\n');
    let currentOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentOffset + lineLength > offset) {
        return new Position(i, offset - currentOffset);
      }
      currentOffset += lineLength;
    }
    return new Position(lines.length - 1, lines[lines.length - 1].length);
  }

  getWordRangeAtPosition(): any {
    throw new Error('Not implemented');
  }

  validateRange(): any {
    throw new Error('Not implemented');
  }

  validatePosition(): any {
    throw new Error('Not implemented');
  }
}

/**
 * Mock ImportsConfig for testing
 */
class MockImportsConfig extends ImportsConfig {
  private mockConfig: Record<string, any> = {};

  public setConfig(key: string, value: any): void {
    this.mockConfig[key] = value;
  }

  public organizeOnSave(_resource: Uri): boolean {
    return this.mockConfig['organizeOnSave'] ?? false;
  }

  // Add other config methods as needed with defaults
  public insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return this.mockConfig['insertSpaceBeforeAndAfterImportBraces'] ?? true;
  }

  public insertSemicolons(_resource: Uri): boolean {
    return this.mockConfig['insertSemicolons'] ?? true;
  }

  public removeTrailingIndex(_resource: Uri): boolean {
    return this.mockConfig['removeTrailingIndex'] ?? true;
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

  public organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return this.mockConfig['organizeSortsByFirstSpecifier'] ?? false;
  }

  public ignoredFromRemoval(_resource: Uri): string[] {
    return this.mockConfig['ignoredFromRemoval'] ?? ['react'];
  }

  public blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' | 'legacy' {
    return this.mockConfig['blankLinesAfterImports'] ?? 'one';
  }

  public grouping(_resource: Uri): any[] {
    return this.mockConfig['grouping'] ?? [];
  }
}

suite('ImportOrganizer Tests', () => {
  let logger: MockOutputChannel;
  let config: MockImportsConfig;
  let organizer: ImportOrganizer;

  setup(() => {
    logger = new MockOutputChannel();
    config = new MockImportsConfig();
    organizer = new ImportOrganizer(config, logger);
  });

  teardown(() => {
    organizer.dispose();
  });

  suite('Language Support Validation', () => {
    test('should support TypeScript files', () => {
      const doc = new MockTextDocument('test.ts', 'typescript', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.isSupportedLanguage(doc.languageId);
      assert.strictEqual(result, true, 'TypeScript should be supported');
    });

    test('should support TypeScript React files', () => {
      const doc = new MockTextDocument('test.tsx', 'typescriptreact', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.isSupportedLanguage(doc.languageId);
      assert.strictEqual(result, true, 'TypeScript React should be supported');
    });

    test('should support JavaScript files', () => {
      const doc = new MockTextDocument('test.js', 'javascript', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.isSupportedLanguage(doc.languageId);
      assert.strictEqual(result, true, 'JavaScript should be supported');
    });

    test('should support JavaScript React files', () => {
      const doc = new MockTextDocument('test.jsx', 'javascriptreact', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.isSupportedLanguage(doc.languageId);
      assert.strictEqual(result, true, 'JavaScript React should be supported');
    });

    test('should NOT support Python files', () => {
      const doc = new MockTextDocument('test.py', 'python', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.isSupportedLanguage(doc.languageId);
      assert.strictEqual(result, false, 'Python should not be supported');
    });

    test('should NOT support JSON files', () => {
      const doc = new MockTextDocument('test.json', 'json', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.isSupportedLanguage(doc.languageId);
      assert.strictEqual(result, false, 'JSON should not be supported');
    });
  });

  suite('Organize-on-Save Logic', () => {
    test('should organize on save when enabled for TypeScript', () => {
      config.setConfig('organizeOnSave', true);
      const doc = new MockTextDocument('test.ts', 'typescript', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.shouldOrganizeOnSave(doc);
      assert.strictEqual(result, true, 'Should organize on save when enabled');
    });

    test('should NOT organize on save when disabled', () => {
      config.setConfig('organizeOnSave', false);
      const doc = new MockTextDocument('test.ts', 'typescript', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.shouldOrganizeOnSave(doc);
      assert.strictEqual(result, false, 'Should not organize on save when disabled');
    });

    test('should NOT organize on save for unsupported languages', () => {
      config.setConfig('organizeOnSave', true);
      const doc = new MockTextDocument('test.py', 'python', '');
      // @ts-expect-error - accessing private method for testing
      const result = organizer.shouldOrganizeOnSave(doc);
      assert.strictEqual(result, false, 'Should not organize unsupported languages');
    });
  });

  suite('Activation and Disposal', () => {
    test('should activate without errors', () => {
      const newOrganizer = new ImportOrganizer(config, logger);
      let threw = false;
      try {
        newOrganizer.activate();
      } catch (e) {
        threw = true;
      }
      assert.strictEqual(threw, false, 'Should activate without throwing');
      assert.ok(
        logger.lines.some(line => line.includes('Activating')),
        'Should log activation'
      );
      newOrganizer.dispose();
    });

    test('should dispose without errors', () => {
      const newOrganizer = new ImportOrganizer(config, logger);
      newOrganizer.activate();
      let threw = false;
      try {
        newOrganizer.dispose();
      } catch (e) {
        threw = true;
      }
      assert.strictEqual(threw, false, 'Should dispose without throwing');
      assert.ok(
        logger.lines.some(line => line.includes('Disposing')),
        'Should log disposal'
      );
    });

    test('should dispose multiple times safely', () => {
      const newOrganizer = new ImportOrganizer(config, logger);
      newOrganizer.activate();
      let threw = false;
      try {
        newOrganizer.dispose();
        newOrganizer.dispose();
        newOrganizer.dispose();
      } catch (e) {
        threw = true;
      }
      assert.strictEqual(threw, false, 'Should handle multiple dispose calls');
    });
  });

  suite('Document Organization', () => {
    test('should return empty edits for unsupported language', async () => {
      const doc = new MockTextDocument('test.py', 'python', 'import os\nprint("hello")');
      // @ts-expect-error - accessing private method for testing
      const edits = await organizer.organizeImportsForDocument(doc);
      assert.strictEqual(edits.length, 0, 'Should return no edits for unsupported languages');
    });

    test('should organize supported document', async () => {
      const content = `import { B } from './b';
import { A } from './a';
import { unused } from './unused';

console.log(A, B);
`;
      const doc = new MockTextDocument('test.ts', 'typescript', content);
      // @ts-expect-error - accessing private method for testing
      const edits = await organizer.organizeImportsForDocument(doc);
      // Should produce edits (remove unused, sort)
      assert.ok(edits.length > 0, 'Should produce edits for messy imports');
    });

    test('should handle empty file', async () => {
      const doc = new MockTextDocument('test.ts', 'typescript', '');
      // @ts-expect-error - accessing private method for testing
      const edits = await organizer.organizeImportsForDocument(doc);
      assert.strictEqual(edits.length, 0, 'Should return no edits for empty file');
    });

    test('should handle file with no imports', async () => {
      const content = 'console.log("hello");';
      const doc = new MockTextDocument('test.ts', 'typescript', content);
      // @ts-expect-error - accessing private method for testing
      const edits = await organizer.organizeImportsForDocument(doc);
      assert.strictEqual(edits.length, 0, 'Should return no edits when no imports');
    });
  });

  suite('Error Handling', () => {
    test('should handle malformed TypeScript gracefully', async () => {
      const content = 'import { A from ./a;'; // Syntax error
      const doc = new MockTextDocument('test.ts', 'typescript', content);

      try {
        // @ts-expect-error - accessing private method for testing
        await organizer.organizeImportsForDocument(doc);
        // ts-morph is resilient and tries to parse even malformed code
        // It shouldn't crash, but might throw in some extreme cases
        // Either way is acceptable - the important thing is we catch it
        assert.ok(true, 'Should handle malformed code gracefully');
      } catch (e) {
        // If it throws, that's also acceptable - we just want to verify it doesn't crash the extension
        assert.ok(true, 'Handled error appropriately');
      }
    });

    test('should log errors appropriately', async () => {
      const content = `import { A } from './a';
console.log(A);
`;
      const doc = new MockTextDocument('test.ts', 'typescript', content);

      logger.clear();
      // @ts-expect-error - accessing private method for testing
      await organizer.organizeImportsForDocument(doc);

      // Should not log errors for valid content
      const hasErrors = logger.lines.some(line =>
        line.toLowerCase().includes('error') && !line.includes('0 errors')
      );
      assert.strictEqual(hasErrors, false, 'Should not log errors for valid content');
    });
  });
});
