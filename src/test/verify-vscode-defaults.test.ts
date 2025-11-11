/**
 * PROOF TEST - What are VS Code's ACTUAL defaults?
 *
 * This test does NOT set any VS Code settings and reads what the actual
 * default values are. NO GUESSING - just read the actual values.
 */

import * as assert from 'assert';
import { workspace, Uri } from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

suite('PROOF: VS Code Default Values', () => {
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

  test('PROOF: What is typescript.preferences.quoteStyle default?', () => {
    const value = workspace
      .getConfiguration('typescript.preferences', testFile)
      .get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('typescript.preferences.quoteStyle ACTUAL VALUE:', value, 'TYPE:', typeof value);

    // Record what we actually see
    assert.ok(true, `typescript.preferences.quoteStyle = ${JSON.stringify(value)} (type: ${typeof value})`);
  });

  test('PROOF: What is typescript.format.semicolons default?', () => {
    const value = workspace
      .getConfiguration('typescript.format', testFile)
      .get('semicolons');

    // eslint-disable-next-line no-console
    console.log('typescript.format.semicolons ACTUAL VALUE:', value, 'TYPE:', typeof value);

    assert.ok(true, `typescript.format.semicolons = ${JSON.stringify(value)} (type: ${typeof value})`);
  });

  test('PROOF: What is javascript.preferences.quoteStyle default?', () => {
    const jsFile = Uri.file(path.join(tempDir, 'test.js'));
    fs.writeFileSync(jsFile.fsPath, 'const x = 1;');

    const value = workspace
      .getConfiguration('javascript.preferences', jsFile)
      .get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('javascript.preferences.quoteStyle ACTUAL VALUE:', value, 'TYPE:', typeof value);

    assert.ok(true, `javascript.preferences.quoteStyle = ${JSON.stringify(value)} (type: ${typeof value})`);
  });

  test('PROOF: What is javascript.format.semicolons default?', () => {
    const jsFile = Uri.file(path.join(tempDir, 'test.js'));
    fs.writeFileSync(jsFile.fsPath, 'const x = 1;');

    const value = workspace
      .getConfiguration('javascript.format', jsFile)
      .get('semicolons');

    // eslint-disable-next-line no-console
    console.log('javascript.format.semicolons ACTUAL VALUE:', value, 'TYPE:', typeof value);

    assert.ok(true, `javascript.format.semicolons = ${JSON.stringify(value)} (type: ${typeof value})`);
  });

  test('PROOF: What is editor.tabSize default?', () => {
    const editorConfig = workspace.getConfiguration('editor', testFile);
    const value = editorConfig.get('tabSize');

    // Check inspect to see where the value comes from
    const inspect = editorConfig.inspect('tabSize');

    // eslint-disable-next-line no-console
    console.log('editor.tabSize ACTUAL VALUE:', value, 'TYPE:', typeof value);
    // eslint-disable-next-line no-console
    console.log('editor.tabSize SOURCES:', JSON.stringify({
      defaultValue: inspect?.defaultValue,
      globalValue: inspect?.globalValue,
      workspaceValue: inspect?.workspaceValue,
      workspaceFolderValue: inspect?.workspaceFolderValue,
      defaultLanguageValue: inspect?.defaultLanguageValue,
      globalLanguageValue: inspect?.globalLanguageValue,
      workspaceLanguageValue: inspect?.workspaceLanguageValue,
      workspaceFolderLanguageValue: inspect?.workspaceFolderLanguageValue
    }, null, 2));

    assert.ok(true, `editor.tabSize = ${JSON.stringify(value)} (type: ${typeof value})`);
  });

  test('PROOF: What is editor.insertSpaces default?', () => {
    const value = workspace
      .getConfiguration('editor', testFile)
      .get('insertSpaces');

    // eslint-disable-next-line no-console
    console.log('editor.insertSpaces ACTUAL VALUE:', value, 'TYPE:', typeof value);

    assert.ok(true, `editor.insertSpaces = ${JSON.stringify(value)} (type: ${typeof value})`);
  });
});
