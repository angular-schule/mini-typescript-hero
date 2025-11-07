import * as assert from 'assert';
import { Uri, workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { ImportsConfig } from '../configuration';

/**
 * Comprehensive tests for configuration priority order:
 * 1. .editorconfig (highest - team standard, ONLY if EditorConfig extension is active)
 * 2. VSCode TypeScript/JavaScript preferences (middle)
 * 3. Our extension settings (lowest - fallback)
 *
 * NOTE: Tests mock the EditorConfig extension check to ensure tests run on CI
 * where the extension is not installed.
 */

/**
 * Mock config that allows controlling whether EditorConfig extension is "active"
 */
class MockImportsConfig extends ImportsConfig {
  private editorConfigActive = true;

  setEditorConfigActive(active: boolean): void {
    this.editorConfigActive = active;
  }

  protected isEditorConfigActive(): boolean {
    return this.editorConfigActive;
  }
}

suite('ImportsConfig Priority Tests', () => {
  let tempDir: string;
  let testFile: Uri;
  let config: MockImportsConfig;

  setup(async () => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mini-ts-hero-config-test-'));
    testFile = Uri.file(path.join(tempDir, 'test.ts'));

    // Create a dummy test file
    fs.writeFileSync(testFile.fsPath, 'const x = 1;');

    config = new MockImportsConfig();
    config.setEditorConfigActive(true); // Default: EditorConfig extension is "installed"
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

    const tsConfig = workspace.getConfiguration('typescript.preferences');
    await tsConfig.update('quoteStyle', undefined, true);

    const tsFormatConfig = workspace.getConfiguration('typescript.format');
    await tsFormatConfig.update('semicolons', undefined, true);

    const jsConfig = workspace.getConfiguration('javascript.preferences');
    await jsConfig.update('quoteStyle', undefined, true);

    const jsFormatConfig = workspace.getConfiguration('javascript.format');
    await jsFormatConfig.update('semicolons', undefined, true);
  });

  suite('Quote Style Priority', () => {
    test('Priority 1: .editorconfig wins (when EditorConfig extension is active)', async () => {
      // Mock: EditorConfig extension IS installed
      config.setEditorConfigActive(true);

      // Create .editorconfig with single quotes
      const editorConfigPath = path.join(tempDir, '.editorconfig');
      fs.writeFileSync(editorConfigPath, `
root = true

[*.ts]
quote_type = single
`);

      // Set VSCode to double quotes (should be overridden)
      const tsConfig = workspace.getConfiguration('typescript.preferences', testFile);
      await tsConfig.update('quoteStyle', 'double', true);

      // Set our extension to double quotes (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('stringQuoteStyle', '"', true);

      // .editorconfig should win
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, `'`, '.editorconfig should override all other settings');
    });

    test('Priority 2: VSCode TypeScript preferences (when .editorconfig not set)', async () => {
      // Set VSCode TypeScript to double quotes
      const tsConfig = workspace.getConfiguration('typescript.preferences', testFile);
      await tsConfig.update('quoteStyle', 'double', true);

      // Set our extension to single quotes (should be overridden)
      const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports', testFile);
      await ourConfig.update('stringQuoteStyle', `'`, true);

      // VSCode setting should win (no .editorconfig present)
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, '"', 'VSCode TypeScript preference should override our extension setting');
    });

    test('Priority 2: VSCode JavaScript preferences (for .js files)', async () => {
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

    test('Priority 3: Our extension setting (fallback when others not set)', async () => {
      // Don't set VSCode TypeScript preference (leave as default)
      // Don't create .editorconfig

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

    test('.editorconfig ignored when EditorConfig extension NOT installed', async () => {
      // Mock: EditorConfig extension is NOT installed
      config.setEditorConfigActive(false);

      // Create .editorconfig with single quotes
      const editorConfigPath = path.join(tempDir, '.editorconfig');
      fs.writeFileSync(editorConfigPath, `
root = true

[*.ts]
quote_type = single
`);

      // Set VSCode to double quotes
      const tsConfig = workspace.getConfiguration('typescript.preferences', testFile);
      await tsConfig.update('quoteStyle', 'double', true);

      // VSCode should win (EditorConfig extension not installed)
      const result = await config.stringQuoteStyle(testFile);
      assert.strictEqual(result, '"', 'VSCode setting should win when EditorConfig extension not installed');
    });
  });

  suite('Semicolon Priority', () => {
    test('Priority 2: VSCode TypeScript format.semicolons = insert', async () => {
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

    test('Priority 2: VSCode TypeScript format.semicolons = remove', async () => {
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

    test('Priority 2: VSCode TypeScript format.semicolons = ignore (falls through to our setting)', async () => {
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

    test('Priority 3: Our extension setting (fallback when VSCode not set)', async () => {
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
      // Mock: EditorConfig extension IS installed
      config.setEditorConfigActive(true);

      // Create .editorconfig with only quote_type (no semicolon setting)
      const editorConfigPath = path.join(tempDir, '.editorconfig');
      fs.writeFileSync(editorConfigPath, `
root = true

[*.ts]
quote_type = double
`);

      // Set VSCode TypeScript semicolons
      const tsFormatConfig = workspace.getConfiguration('typescript.format', testFile);
      await tsFormatConfig.update('semicolons', 'remove', true);

      // Get both settings
      const quoteStyle = await config.stringQuoteStyle(testFile);
      const insertSemicolons = await config.insertSemicolons(testFile);

      // Quote style from .editorconfig
      assert.strictEqual(quoteStyle, '"', 'Quote style should come from .editorconfig');

      // Semicolons from VSCode
      assert.strictEqual(insertSemicolons, false, 'Semicolons should come from VSCode setting');
    });
  });

  suite('Error Handling', () => {
    test('Invalid .editorconfig file does not crash', async () => {
      // Mock: EditorConfig extension IS installed
      config.setEditorConfigActive(true);

      // Create invalid .editorconfig
      const editorConfigPath = path.join(tempDir, '.editorconfig');
      fs.writeFileSync(editorConfigPath, 'this is not valid editorconfig syntax!!!');

      // Should fall back gracefully
      const result = await config.stringQuoteStyle(testFile);
      assert.ok(result === '"' || result === `'`, 'Should return valid quote style even with invalid .editorconfig');
    });

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
