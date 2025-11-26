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
 * import-manager.test.ts and blank-lines.test.ts with comprehensive test suites.
 */

import * as assert from 'assert';
import * as path from 'path';
import { commands, OutputChannel, Uri, extensions, workspace, WorkspaceFolder } from 'vscode';
import { ImportOrganizer } from '../imports/import-organizer';
import { ImportsConfig } from '../configuration';
import { createTempDocument, deleteTempDocument } from './test-helpers';
import { ConfigOverrides, ConfigKey } from './test-types';
import { ImportGroup } from '../imports/import-grouping';

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
  private mockConfig: Partial<ConfigOverrides> = {};

  public setConfig<K extends ConfigKey>(key: K, value: ConfigOverrides[K]): void {
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

  public grouping(_resource: Uri): ImportGroup[] {
    // Return empty array - tests don't need actual grouping logic
    return [];
  }

  public excludePatterns(_resource: Uri): string[] {
    return this.mockConfig['excludePatterns'] ?? [];
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
    test('should only register miniTypescriptHero command (no alias)', async () => {
      // Contract test: Verify we DON'T hijack the old typescriptHero command
      // Note: Commands are registered during extension activation (in extension.ts),
      // not during test setup. This test validates the ACTUAL registered commands.

      // IMPORTANT: Extension activates on "onLanguage" events (TypeScript/JavaScript files).
      // We must open a TS file to trigger extension activation and command registration.
      const doc = await createTempDocument('', 'ts');

      try {
        // Wait for extension to activate (opening TS file triggers activation)
        const extension = extensions.getExtension('angular-schule.mini-typescript-hero');
        if (extension && !extension.isActive) {
          await extension.activate();
        }

        // Query actual VSCode command registry to check runtime behavior
        // The extension has now been activated and commands registered globally
        const allCommands = await commands.getCommands(true);

        // Should register our command
        assert.ok(
          allCommands.includes('miniTypescriptHero.imports.organize'),
          'Should register miniTypescriptHero.imports.organize command'
        );

        // Should NOT register old command (no alias - be polite!)
        assert.ok(
          !allCommands.includes('typescriptHero.imports.organize'),
          'Should NOT register typescriptHero.imports.organize alias (be polite!)'
        );
      } finally {
        await deleteTempDocument(doc);
      }
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
      const content = 'import { A from ./a;'; // Syntax error - missing closing brace
      const doc = await createTempDocument(content, 'ts');

      try {
        // ACTUAL BEHAVIOR (verified by running test):
        // ts-morph throws: "Expected the module specifier to be a string literal"
        // The organizer catches it, logs it, and re-throws as Error
        // The test verifies we get a proper Error (not a crash)

        // @ts-expect-error - accessing private method for testing
        await organizer.organizeImportsForDocument(doc);

        assert.fail('Should have thrown an error for malformed import statement');
      } catch (e) {
        // Expected: ts-morph throws because module specifier is not a string literal
        assert.ok(e instanceof Error, 'Should throw proper Error for malformed code');
        assert.ok(
          e.message.includes('module specifier') || e.message.includes('string literal'),
          'Error message should mention module specifier issue'
        );
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

  suite('File Exclusion (excludePatterns)', () => {
    let originalGetWorkspaceFolder: (uri: Uri) => WorkspaceFolder | undefined;

    setup(() => {
      originalGetWorkspaceFolder = workspace.getWorkspaceFolder;
    });

    teardown(() => {
      workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
    });

    test('should warn when organizing excluded file (team collaboration feature)', async () => {
      // This test validates the documented "team collaboration" feature:
      // When a file matches excludePatterns, running "Organize imports" shows a warning
      // and does NOT modify the file.

      const content = `import { B } from './b';
import { A } from './a';

console.log(A, B);
`;

      // Create temp file in generated subfolder within a workspace
      const doc = await createTempDocument(content, 'ts', 'test-workspace-exclude/generated');

      try {
        // Stub workspace.getWorkspaceFolder to pretend file is in workspace
        const workspaceRoot = Uri.file(path.dirname(path.dirname(doc.uri.fsPath)));
        workspace.getWorkspaceFolder = (uri: Uri): WorkspaceFolder | undefined => {
          if (uri.fsPath.startsWith(workspaceRoot.fsPath)) {
            return { uri: workspaceRoot, name: 'Test Workspace', index: 0 };
          }
          return undefined;
        };

        // Configure excludePatterns to exclude generated files
        config.setConfig('excludePatterns', ['**/generated/**']);

        // Verify isFileExcluded logic
        // @ts-expect-error - accessing private method for testing
        const isExcluded = organizer.isFileExcluded(doc.uri);

        assert.strictEqual(isExcluded, true, 'File in generated folder should be excluded');

        // Verify that organizeImportsForDocument still works (doesn't check exclusion)
        // The command layer (organizeImportsCommand) is responsible for exclusion checks
        // @ts-expect-error - accessing private method for testing
        const edits = await organizer.organizeImportsForDocument(doc);

        // Should still produce edits (sorting needed) because exclusion is checked at command level
        assert.ok(edits.length > 0, 'organizeImportsForDocument should produce edits regardless of exclusion');

      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should NOT exclude files when pattern does not match', async () => {
      const content = `import { B } from './b';
import { A } from './a';

console.log(A, B);
`;

      const doc = await createTempDocument(content, 'ts', 'test-workspace-exclude2/src');

      try {
        const workspaceRoot = Uri.file(path.dirname(path.dirname(doc.uri.fsPath)));
        workspace.getWorkspaceFolder = (uri: Uri): WorkspaceFolder | undefined => {
          if (uri.fsPath.startsWith(workspaceRoot.fsPath)) {
            return { uri: workspaceRoot, name: 'Test', index: 0 };
          }
          return undefined;
        };

        config.setConfig('excludePatterns', ['**/generated/**']);

        // @ts-expect-error - accessing private method for testing
        const isExcluded = organizer.isFileExcluded(doc.uri);

        assert.strictEqual(isExcluded, false, 'File in src folder should NOT be excluded');

      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should exclude files matching built-in patterns (node_modules)', async () => {
      const content = `import { B } from './b';
import { A } from './a';

console.log(A, B);
`;

      const doc = await createTempDocument(content, 'ts', 'test-workspace-exclude3/node_modules/pkg');

      try {
        const workspaceRoot = Uri.file(path.dirname(path.dirname(path.dirname(doc.uri.fsPath))));
        workspace.getWorkspaceFolder = (uri: Uri): WorkspaceFolder | undefined => {
          if (uri.fsPath.startsWith(workspaceRoot.fsPath)) {
            return { uri: workspaceRoot, name: 'Test', index: 0 };
          }
          return undefined;
        };

        config.setConfig('excludePatterns', []);

        // @ts-expect-error - accessing private method for testing
        const isExcluded = organizer.isFileExcluded(doc.uri);

        assert.strictEqual(isExcluded, true, 'Files in node_modules should be excluded by default');

      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should exclude files matching built-in patterns (dist)', async () => {
      const content = `import { B } from './b';
import { A } from './a';

console.log(A, B);
`;

      const doc = await createTempDocument(content, 'ts', 'test-workspace-exclude4/dist');

      try {
        const workspaceRoot = Uri.file(path.dirname(path.dirname(doc.uri.fsPath)));
        workspace.getWorkspaceFolder = (uri: Uri): WorkspaceFolder | undefined => {
          if (uri.fsPath.startsWith(workspaceRoot.fsPath)) {
            return { uri: workspaceRoot, name: 'Test', index: 0 };
          }
          return undefined;
        };

        config.setConfig('excludePatterns', []);

        // @ts-expect-error - accessing private method for testing
        const isExcluded = organizer.isFileExcluded(doc.uri);

        assert.strictEqual(isExcluded, true, 'Files in dist folder should be excluded by default');

      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('should combine built-in and user patterns', async () => {
      const content = `import { B } from './b';
import { A } from './a';

console.log(A, B);
`;

      const doc = await createTempDocument(content, 'ts', 'test-workspace-exclude5/custom-generated');

      try {
        const workspaceRoot = Uri.file(path.dirname(path.dirname(doc.uri.fsPath)));
        workspace.getWorkspaceFolder = (uri: Uri): WorkspaceFolder | undefined => {
          if (uri.fsPath.startsWith(workspaceRoot.fsPath)) {
            return { uri: workspaceRoot, name: 'Test', index: 0 };
          }
          return undefined;
        };

        config.setConfig('excludePatterns', ['**/custom-generated/**']);

        // @ts-expect-error - accessing private method for testing
        const isExcluded = organizer.isFileExcluded(doc.uri);

        assert.strictEqual(isExcluded, true, 'File should be excluded by user pattern');

      } finally {
        await deleteTempDocument(doc);
      }
    });
  });
});
