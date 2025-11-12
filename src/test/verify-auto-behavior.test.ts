/**
 * PROOF TEST - When does VS Code return "auto"?
 *
 * Investigation: VS Code has "auto" as the default, but when does it
 * actually return "auto" vs inferring from file content?
 */

import * as assert from 'assert';
import { workspace, Uri } from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

suite('PROOF: When does VS Code return "auto"?', () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-behavior-test-'));
  });

  teardown(async () => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset all VS Code settings to defaults to prevent pollution
    const tsConfig = workspace.getConfiguration('typescript.preferences');
    await tsConfig.update('quoteStyle', undefined, true);

    const tsFormatConfig = workspace.getConfiguration('typescript.format');
    await tsFormatConfig.update('semicolons', undefined, true);
  });

  test('PROOF: Empty file with quoteStyle="auto"', () => {
    const testFile = Uri.file(path.join(tempDir, 'empty.ts'));
    fs.writeFileSync(testFile.fsPath, '');

    const value = workspace
      .getConfiguration('typescript.preferences', testFile)
      .get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('Empty file - quoteStyle:', value);
    assert.strictEqual(value, 'auto', 'Empty file should return "auto"');
  });

  test('PROOF: File with single quotes and quoteStyle="auto"', () => {
    const testFile = Uri.file(path.join(tempDir, 'single.ts'));
    fs.writeFileSync(testFile.fsPath, "import { foo } from 'bar';\n");

    const value = workspace
      .getConfiguration('typescript.preferences', testFile)
      .get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('File with single quotes - quoteStyle:', value);
    assert.strictEqual(value, 'auto', 'Still returns "auto" - VS Code does NOT infer from file content via this API');
  });

  test('PROOF: File with double quotes and quoteStyle="auto"', () => {
    const testFile = Uri.file(path.join(tempDir, 'double.ts'));
    fs.writeFileSync(testFile.fsPath, 'import { foo } from "bar";\n');

    const value = workspace
      .getConfiguration('typescript.preferences', testFile)
      .get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('File with double quotes - quoteStyle:', value);
    assert.strictEqual(value, 'auto', 'Still returns "auto" - VS Code does NOT infer from file content via this API');
  });

  test('PROOF: When user explicitly sets quoteStyle="single"', async () => {
    const testFile = Uri.file(path.join(tempDir, 'explicit.ts'));
    fs.writeFileSync(testFile.fsPath, '');

    // Explicitly set to single
    await workspace.getConfiguration('typescript.preferences', testFile).update('quoteStyle', 'single', true);

    // Get a FRESH config object to read the value
    const value = workspace.getConfiguration('typescript.preferences', testFile).get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('Explicitly set to single - quoteStyle:', value);
    assert.strictEqual(value, 'single', 'Returns "single" when user explicitly sets it');
  });

  test('PROOF: When user explicitly sets quoteStyle="double"', async () => {
    const testFile = Uri.file(path.join(tempDir, 'explicit2.ts'));
    fs.writeFileSync(testFile.fsPath, '');

    // Explicitly set to double
    await workspace.getConfiguration('typescript.preferences', testFile).update('quoteStyle', 'double', true);

    // Get a FRESH config object to read the value
    const value = workspace.getConfiguration('typescript.preferences', testFile).get('quoteStyle');

    // eslint-disable-next-line no-console
    console.log('Explicitly set to double - quoteStyle:', value);
    assert.strictEqual(value, 'double', 'Returns "double" when user explicitly sets it');
  });

  test('PROOF: When does semicolons return "ignore" vs "insert"/"remove"?', () => {
    const testFile = Uri.file(path.join(tempDir, 'semi.ts'));
    fs.writeFileSync(testFile.fsPath, 'import { foo } from "bar";\n');

    const value = workspace
      .getConfiguration('typescript.format', testFile)
      .get('semicolons');

    // eslint-disable-next-line no-console
    console.log('Default semicolons value:', value);
    assert.strictEqual(value, 'ignore', 'Returns "ignore" by default');
  });

  test('PROOF: When user explicitly sets semicolons="insert"', async () => {
    const testFile = Uri.file(path.join(tempDir, 'semi-insert.ts'));
    fs.writeFileSync(testFile.fsPath, '');

    await workspace.getConfiguration('typescript.format', testFile).update('semicolons', 'insert', true);

    // Get a FRESH config object to read the value
    const value = workspace.getConfiguration('typescript.format', testFile).get('semicolons');

    // eslint-disable-next-line no-console
    console.log('Explicitly set to insert - semicolons:', value);
    assert.strictEqual(value, 'insert', 'Returns "insert" when user explicitly sets it');
  });

  test('PROOF: When user explicitly sets semicolons="remove"', async () => {
    const testFile = Uri.file(path.join(tempDir, 'semi-remove.ts'));
    fs.writeFileSync(testFile.fsPath, '');

    await workspace.getConfiguration('typescript.format', testFile).update('semicolons', 'remove', true);

    // Get a FRESH config object to read the value
    const value = workspace.getConfiguration('typescript.format', testFile).get('semicolons');

    // eslint-disable-next-line no-console
    console.log('Explicitly set to remove - semicolons:', value);
    assert.strictEqual(value, 'remove', 'Returns "remove" when user explicitly sets it');
  });
});
