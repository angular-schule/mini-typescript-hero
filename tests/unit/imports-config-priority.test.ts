import * as assert from 'assert';
import { Uri, workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { ImportsConfig } from '../../src/configuration';

/**
 * Comprehensive tests for configuration priority order:
 * 1. VSCode TypeScript/JavaScript preferences (highest)
 * 2. Our extension settings (fallback)
 *
 * NOTE: We NO LONGER parse .editorconfig manually.
 * For indentation, VS Code applies .editorconfig automatically (if extension installed).
 * For quotes, teams should use VS Code settings.
 */

suite('ImportsConfig Priority Tests', () => {
  let tempDir: string;
  let testFile: Uri;
  let config: ImportsConfig;

  setup(async () => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-ts-hero-config-test-'));
    testFile = Uri.file(path.join(tempDir, 'test.ts'));

    // Create a dummy test file
    fs.writeFileSync(testFile.fsPath, 'const x = 1;');

    config = new ImportsConfig();
  });

  teardown(async () => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset all settings to defaults
    const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports');
    await ourConfig.update('stringQuoteStyle', undefined, true);
    await ourConfig.update('insertSemicolons', undefined, true);
    await ourConfig.update('useOnlyExtensionSettings', undefined, true);
    await ourConfig.update('tabSize', undefined, true);
    await ourConfig.update('insertSpaces', undefined, true);

    const tsConfig = workspace.getConfiguration('typescript.preferences');
    await tsConfig.update('quoteStyle', undefined, true);

    const tsFormatConfig = workspace.getConfiguration('typescript.format');
    await tsFormatConfig.update('semicolons', undefined, true);

    const jsConfig = workspace.getConfiguration('javascript.preferences');
    await jsConfig.update('quoteStyle', undefined, true);

    const jsFormatConfig = workspace.getConfiguration('javascript.format');
    await jsFormatConfig.update('semicolons', undefined, true);

    const editorConfig = workspace.getConfiguration('editor');
    await editorConfig.update('tabSize', undefined, true);
    await editorConfig.update('insertSpaces', undefined, true);
  });

  suite('Quote Style Priority', () => {
    test('Priority 1: VSCode TypeScript preferences', async () => {
      // Set VSCode TypeScript to double quotes
      const tsConfig = workspace.getConfiguration('typescript.preferences', testFile);
      await tsConfig.update('quoteStyle', 'double', true);

      // Set our extension to single quotes (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('stringQuoteStyle', `'`, true);

      // VSCode setting should win
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, '"', 'VSCode TypeScript preference should override our extension setting');
    });

    test('Priority 1: VSCode JavaScript preferences (for .js files)', async () => {
      const jsFile = Uri.file(path.join(tempDir, 'test.js'));
      fs.writeFileSync(jsFile.fsPath, 'const x = 1;');

      // Set VSCode JavaScript to double quotes
      const jsConfig = workspace.getConfiguration('javascript.preferences', jsFile);
      await jsConfig.update('quoteStyle', 'double', true);

      // Set our extension to single quotes (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', jsFile);
      await ourConfig.update('stringQuoteStyle', `'`, true);

      // VSCode setting should win
      const result = await config.stringQuoteStyle(jsFile);
      assert.strictEqual(result, '"', 'VSCode JavaScript preference should override our extension setting');
    });

    test('Priority 2: Our extension setting (fallback when VS Code not set)', async () => {
      // Don't set VSCode TypeScript preference (leave as default)

      // Set our extension to double quotes
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('stringQuoteStyle', '"', true);

      // Our setting should be used as fallback
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, '"', 'Our extension setting should be used as fallback');
    });

    test('Default: Single quotes when nothing is configured', async () => {
      // Don't set any configuration
      // Default should be single quotes
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, `'`, 'Default should be single quotes');
    });
  });

  suite('Semicolon Priority', () => {
    test('Priority 1: VSCode TypeScript format.semicolons = insert', async () => {
      // Set VSCode TypeScript to insert semicolons
      const tsFormatConfig = workspace.getConfiguration('typescript.format', testFile);
      await tsFormatConfig.update('semicolons', 'insert', true);

      // Set our extension to false (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('insertSemicolons', false, true);

      // VSCode setting should win
      const result = await config.insertSemicolons(testFile);
      assert.strictEqual(result, true, 'VSCode format.semicolons=insert should override our setting');
    });

    test('Priority 1: VSCode TypeScript format.semicolons = remove', async () => {
      // Set VSCode TypeScript to remove semicolons
      const tsFormatConfig = workspace.getConfiguration('typescript.format', testFile);
      await tsFormatConfig.update('semicolons', 'remove', true);

      // Set our extension to true (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('insertSemicolons', true, true);

      // VSCode setting should win
      const result = await config.insertSemicolons(testFile);
      assert.strictEqual(result, false, 'VSCode format.semicolons=remove should override our setting');
    });

    test('Priority 1: VSCode TypeScript format.semicolons = ignore (falls through to our setting)', async () => {
      // Set VSCode TypeScript to ignore semicolons
      const tsFormatConfig = workspace.getConfiguration('typescript.format', testFile);
      await tsFormatConfig.update('semicolons', 'ignore', true);

      // Set our extension to false
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('insertSemicolons', false, true);

      // Our setting should be used (VSCode says 'ignore')
      const result = await config.insertSemicolons(testFile);
      assert.strictEqual(result, false, 'Our setting should be used when VSCode says ignore');
    });

    test('Priority 2: Our extension setting (fallback when VSCode not set)', async () => {
      // Don't set VSCode TypeScript format

      // Set our extension to false
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('insertSemicolons', false, true);

      // Our setting should be used as fallback
      const result = await config.insertSemicolons(testFile);
      assert.strictEqual(result, false, 'Our extension setting should be used as fallback');
    });

    test('Default: Insert semicolons when nothing is configured', async () => {
      // Don't set any configuration
      // Default should be true (insert semicolons)
      const result = await config.insertSemicolons(testFile);
      assert.strictEqual(result, true, 'Default should be to insert semicolons');
    });

    test('VSCode JavaScript format.semicolons (for .js files)', async () => {
      const jsFile = Uri.file(path.join(tempDir, 'test.js'));
      fs.writeFileSync(jsFile.fsPath, 'const x = 1;');

      // Set VSCode JavaScript to remove semicolons
      const jsFormatConfig = workspace.getConfiguration('javascript.format', jsFile);
      await jsFormatConfig.update('semicolons', 'remove', true);

      // Set our extension to true (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', jsFile);
      await ourConfig.update('insertSemicolons', true, true);

      // VSCode setting should win
      const result = await config.insertSemicolons(jsFile);
      assert.strictEqual(result, false, 'VSCode JavaScript format.semicolons should override our setting');
    });
  });

  suite('Integration: All Priorities Working Together', () => {
    test('Different settings can come from different priority levels', async () => {
      // Set VSCode TypeScript quotes to double
      const tsConfig = workspace.getConfiguration('typescript.preferences', testFile);
      await tsConfig.update('quoteStyle', 'double', true);

      // Set VSCode TypeScript semicolons to remove
      const tsFormatConfig = workspace.getConfiguration('typescript.format', testFile);
      await tsFormatConfig.update('semicolons', 'remove', true);

      // Get both settings
      const quoteStyle = await config.stringQuoteStyle(testFile);
      const insertSemicolons = await config.insertSemicolons(testFile);

      // Quote style from VS Code
      assert.strictEqual(quoteStyle, '"', 'Quote style should come from VSCode setting');

      // Semicolons from VSCode
      assert.strictEqual(insertSemicolons, false, 'Semicolons should come from VSCode setting');
    });
  });

  suite('useOnlyExtensionSettings Override', () => {
    test('Override: useOnlyExtensionSettings ignores VS Code quote preferences', async () => {
      // Set VSCode TypeScript to double quotes
      const tsConfig = workspace.getConfiguration('typescript.preferences', testFile);
      await tsConfig.update('quoteStyle', 'double', true);

      // Set our extension to single quotes
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('stringQuoteStyle', `'`, true);

      // Enable useOnlyExtensionSettings
      await ourConfig.update('useOnlyExtensionSettings', true, true);

      // Extension setting should win (ignores VS Code)
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, `'`, 'useOnlyExtensionSettings should ignore VS Code preferences');
    });

    test('Override: useOnlyExtensionSettings ignores VS Code semicolon preferences', async () => {
      // Set VSCode TypeScript to remove semicolons
      const tsFormatConfig = workspace.getConfiguration('typescript.format', testFile);
      await tsFormatConfig.update('semicolons', 'remove', true);

      // Set our extension to insert semicolons
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('insertSemicolons', true, true);

      // Enable useOnlyExtensionSettings
      await ourConfig.update('useOnlyExtensionSettings', true, true);

      // Extension setting should win (ignores VS Code)
      const result = await config.insertSemicolons(testFile);
      assert.strictEqual(result, true, 'useOnlyExtensionSettings should ignore VS Code preferences');
    });

    test('Override: useOnlyExtensionSettings ignores VS Code editor settings for indentation', async () => {
      // Set VSCode editor to 8 spaces
      const editorConfig = workspace.getConfiguration('editor', testFile);
      await editorConfig.update('tabSize', 8, true);
      await editorConfig.update('insertSpaces', true, true);

      // Set our extension to 2 spaces
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('tabSize', 2, true);
      await ourConfig.update('insertSpaces', true, true);

      // Enable useOnlyExtensionSettings
      await ourConfig.update('useOnlyExtensionSettings', true, true);

      // Extension setting should win (ignores VS Code)
      const result = config.indentation(testFile);
      assert.strictEqual(result, '  ', 'useOnlyExtensionSettings should ignore editor.tabSize');
    });
  });

  suite('Error Handling', () => {
    test('Non-existent file path does not crash', async () => {
      const nonExistentFile = Uri.file(path.join(tempDir, 'does-not-exist.ts'));

      // Should not crash
      const quoteStyle = await config.stringQuoteStyle(nonExistentFile);
      const insertSemicolons = await config.insertSemicolons(nonExistentFile);

      assert.ok(quoteStyle === '"' || quoteStyle === `'`, 'Should return valid quote style');
      assert.ok(typeof insertSemicolons === 'boolean', 'Should return valid boolean');
    });
  });
});
