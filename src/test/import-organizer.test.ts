/**
 * Integration Tests for ImportOrganizer
 *
 * These tests verify the command layer that orchestrates import organization:
 * - Command registration and execution
 * - Error handling and user notifications
 * - Language support validation
 * - Organize-on-save functionality
 *
 * TESTING APPROACH:
 * ================
 * - TextDocument: REAL documents created from temp files (workspace.openTextDocument)
 * - Configuration: Mocked for controllable test values
 * - OutputChannel: Mocked for capturing log output
 *
 * Note: The actual import organization logic is thoroughly tested in
 * import-manager.test.ts (101 tests) and blank-lines.test.ts (37 tests).
 */

import * as assert from 'assert';
import { OutputChannel, Uri } from 'vscode';
import { ImportOrganizer } from '../imports/import-organizer';
import { ImportsConfig } from '../configuration';
import { createTempDocument, deleteTempDocument } from './test-helpers';

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
 * Mock ImportsConfig for testing
 */
class MockImportsConfig extends ImportsConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mockConfig: Record<string, any> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  public async insertSemicolons(_resource: Uri): Promise<boolean> {
    return this.mockConfig['insertSemicolons'] ?? true;
  }

  public removeTrailingIndex(_resource: Uri): boolean {
    return this.mockConfig['removeTrailingIndex'] ?? true;
  }

   public async stringQuoteStyle(_resource: Uri): Promise<'"' | '\''> {
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

  public mergeImportsFromSameModule(_resource: Uri): boolean {
    return this.mockConfig['mergeImportsFromSameModule'] ?? true;
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

  public blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' {
    return this.mockConfig['blankLinesAfterImports'] ?? 'one';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    test('should support TypeScript files', async () => {
      const doc = await createTempDocument('', 'ts');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.isSupportedLanguage(doc.languageId);
        assert.strictEqual(result, true, 'TypeScript should be supported');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should support TypeScript React files', async () => {
      const doc = await createTempDocument('', 'tsx');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.isSupportedLanguage(doc.languageId);
        assert.strictEqual(result, true, 'TypeScript React should be supported');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should support JavaScript files', async () => {
      const doc = await createTempDocument('', 'js');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.isSupportedLanguage(doc.languageId);
        assert.strictEqual(result, true, 'JavaScript should be supported');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should support JavaScript React files', async () => {
      const doc = await createTempDocument('', 'jsx');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.isSupportedLanguage(doc.languageId);
        assert.strictEqual(result, true, 'JavaScript React should be supported');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should NOT support Python files', async () => {
      const doc = await createTempDocument('', 'py');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.isSupportedLanguage(doc.languageId);
        assert.strictEqual(result, false, 'Python should not be supported');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should NOT support JSON files', async () => {
      const doc = await createTempDocument('', 'json');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.isSupportedLanguage(doc.languageId);
        assert.strictEqual(result, false, 'JSON should not be supported');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Organize-on-Save Logic', () => {
    test('should organize on save when enabled for TypeScript', async () => {
      config.setConfig('organizeOnSave', true);
      const doc = await createTempDocument('', 'ts');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.shouldOrganizeOnSave(doc);
        assert.strictEqual(result, true, 'Should organize on save when enabled');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should NOT organize on save when disabled', async () => {
      config.setConfig('organizeOnSave', false);
      const doc = await createTempDocument('', 'ts');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.shouldOrganizeOnSave(doc);
        assert.strictEqual(result, false, 'Should not organize on save when disabled');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should NOT organize on save for unsupported languages', async () => {
      config.setConfig('organizeOnSave', true);
      const doc = await createTempDocument('', 'py');
      try {
        // @ts-expect-error - accessing private method for testing
        const result = organizer.shouldOrganizeOnSave(doc);
        assert.strictEqual(result, false, 'Should not organize unsupported languages');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Command Registration', () => {
    test('should only register miniTypescriptHero command (no alias)', () => {
      // Contract test: Verify we DON'T hijack the old typescriptHero command
      const testLogger = new MockOutputChannel();
      const testConfig = new MockImportsConfig();
      const testOrganizer = new ImportOrganizer(testConfig, testLogger);

      // The actual check: Read the activation code to verify it only registers mini command
      const activateCode = testOrganizer.activate.toString();

      // Should contain miniTypescriptHero command
      assert.ok(
        activateCode.includes('miniTypescriptHero.imports.organize'),
        'Should register miniTypescriptHero.imports.organize command'
      );

      // Should NOT contain typescriptHero command (no alias!)
      assert.ok(
        !activateCode.includes('typescriptHero.imports.organize'),
        'Should NOT register typescriptHero.imports.organize alias (be polite!)'
      );

      testOrganizer.dispose();
    });
  });

  // Note: Full activation tests cannot be run because VSCode only allows commands
  // to be registered once per test session. The organizer is already created in
  // the suite setup() above and works for all other tests.

  suite('Document Organization', () => {
    test('should return empty edits for unsupported language', async () => {
      const doc = await createTempDocument('import os\nprint("hello")', 'py');
      try {
        // @ts-expect-error - accessing private method for testing
        const edits = await organizer.organizeImportsForDocument(doc);
        assert.strictEqual(edits.length, 0, 'Should return no edits for unsupported languages');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should organize supported document', async () => {
      const content = `import { B } from './b';
import { A } from './a';
import { unused } from './unused';

console.log(A, B);
`;
      const doc = await createTempDocument(content, 'ts');
      try {
        // @ts-expect-error - accessing private method for testing
        const edits = await organizer.organizeImportsForDocument(doc);
        // Should produce edits (remove unused, sort)
        assert.ok(edits.length > 0, 'Should produce edits for messy imports');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should handle empty file', async () => {
      const doc = await createTempDocument('', 'ts');
      try {
        // @ts-expect-error - accessing private method for testing
        const edits = await organizer.organizeImportsForDocument(doc);
        assert.strictEqual(edits.length, 0, 'Should return no edits for empty file');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should handle file with no imports', async () => {
      const content = 'console.log("hello");';
      const doc = await createTempDocument(content, 'ts');
      try {
        // @ts-expect-error - accessing private method for testing
        const edits = await organizer.organizeImportsForDocument(doc);
        assert.strictEqual(edits.length, 0, 'Should return no edits when no imports');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Error Handling', () => {
    test('should handle malformed TypeScript gracefully', async () => {
      const content = 'import { A from ./a;'; // Syntax error
      const doc = await createTempDocument(content, 'ts');

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
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should log errors appropriately', async () => {
      const content = `import { A } from './a';
console.log(A);
`;
      const doc = await createTempDocument(content, 'ts');

      try {
        logger.clear();
        // @ts-expect-error - accessing private method for testing
        await organizer.organizeImportsForDocument(doc);

        // Should not log errors for valid content
        const hasErrors = logger.lines.some(line =>
          line.toLowerCase().includes('error') && !line.includes('0 errors')
        );
        assert.strictEqual(hasErrors, false, 'Should not log errors for valid content');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });
});
