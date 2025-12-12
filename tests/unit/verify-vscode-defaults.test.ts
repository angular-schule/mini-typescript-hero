/**
 * VS Code Default Values - Verification Tests
 *
 * PURPOSE: Verify that VS Code's built-in defaults are what we expect.
 * These tests validate that our extension reads VS Code settings correctly.
 *
 * NOTE: These tests validate ACTUAL values, not just log them.
 * The expected values are based on VS Code's documented defaults:
 * - typescript.preferences.quoteStyle: 'auto' (VS Code 1.40+)
 * - typescript.format.semicolons: 'ignore' (VS Code default)
 * - javascript.preferences.quoteStyle: 'auto' (VS Code 1.40+)
 * - javascript.format.semicolons: 'ignore' (VS Code default)
 * - editor.tabSize: 4 (VS Code default)
 * - editor.insertSpaces: true (VS Code default)
 */

import * as assert from 'assert';
import { workspace, Uri } from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

suite('VS Code Default Values Verification', () => {
  let tempDir: string;
  let testFile: Uri;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-defaults-test-'));
    testFile = Uri.file(path.join(tempDir, 'test.ts'));
    fs.writeFileSync(testFile.fsPath, 'const x = 1;');
  });

  teardown(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('typescript.preferences.quoteStyle defaults to "auto"', () => {
    const value = workspace
      .getConfiguration('typescript.preferences', testFile)
      .get('quoteStyle');

    // VS Code's default is 'auto' - our extension should fall back to its own default
    // when this value is 'auto' (which means "let TypeScript decide")
    assert.strictEqual(value, 'auto', 'typescript.preferences.quoteStyle should default to "auto"');
  });

  test('typescript.format.semicolons defaults to "ignore"', () => {
    const value = workspace
      .getConfiguration('typescript.format', testFile)
      .get('semicolons');

    // VS Code's default is 'ignore' - our extension should fall back to its own default
    assert.strictEqual(value, 'ignore', 'typescript.format.semicolons should default to "ignore"');
  });

  test('javascript.preferences.quoteStyle defaults to "auto"', () => {
    const jsFile = Uri.file(path.join(tempDir, 'test.js'));
    fs.writeFileSync(jsFile.fsPath, 'const x = 1;');

    const value = workspace
      .getConfiguration('javascript.preferences', jsFile)
      .get('quoteStyle');

    assert.strictEqual(value, 'auto', 'javascript.preferences.quoteStyle should default to "auto"');
  });

  test('javascript.format.semicolons defaults to "ignore"', () => {
    const jsFile = Uri.file(path.join(tempDir, 'test.js'));
    fs.writeFileSync(jsFile.fsPath, 'const x = 1;');

    const value = workspace
      .getConfiguration('javascript.format', jsFile)
      .get('semicolons');

    assert.strictEqual(value, 'ignore', 'javascript.format.semicolons should default to "ignore"');
  });

  test('editor.tabSize defaults to 4', () => {
    const editorConfig = workspace.getConfiguration('editor', testFile);
    const value = editorConfig.get('tabSize');

    // VS Code's default is 4 - verify this is what we read
    assert.strictEqual(value, 4, 'editor.tabSize should default to 4');
  });

  test('editor.insertSpaces defaults to true', () => {
    const value = workspace
      .getConfiguration('editor', testFile)
      .get('insertSpaces');

    assert.strictEqual(value, true, 'editor.insertSpaces should default to true');
  });
});
