/**
 * File structure validation tests
 *
 * These tests ensure there are no duplicate core files that could cause
 * conflicting behavior at runtime.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('File Structure Validation', () => {

  test('exactly one import-organizer.ts exists', () => {
    // When tests run from out/test/, we need to go up to project root then into src
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'src/imports');
    const files = findFilesRecursive(srcDir, 'import-organizer.ts');

    assert.strictEqual(
      files.length,
      1,
      `Expected exactly 1 import-organizer.ts, found ${files.length}: ${files.join(', ')}`
    );
  });

  test('exactly one import-types.ts exists', () => {
    // When tests run from out/test/, we need to go up to project root then into src
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'src/imports');
    const files = findFilesRecursive(srcDir, 'import-types.ts');

    assert.strictEqual(
      files.length,
      1,
      `Expected exactly 1 import-types.ts, found ${files.length}: ${files.join(', ')}`
    );
  });

  test('import-types.ts supports attributes', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'src/imports');
    const files = findFilesRecursive(srcDir, 'import-types.ts');

    assert.strictEqual(files.length, 1, 'Should have exactly one import-types.ts');

    const content = fs.readFileSync(files[0], 'utf8');

    // Check for attributes field in the Import interface
    assert.ok(
      /attributes\?:\s*string/.test(content),
      'import-types.ts must have attributes?: string field'
    );

    // Check for isTypeOnly in NamedImport
    assert.ok(
      /isTypeOnly:\s*boolean/.test(content),
      'import-types.ts must have isTypeOnly: boolean field'
    );

    // Check for specifier comments
    assert.ok(
      /leadingComment\?:\s*string/.test(content),
      'import-types.ts must have leadingComment?: string field'
    );

    assert.ok(
      /trailingComment\?:\s*string/.test(content),
      'import-types.ts must have trailingComment?: string field'
    );
  });

  test('import-organizer.ts does not register old command alias', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'src/imports');
    const files = findFilesRecursive(srcDir, 'import-organizer.ts');

    assert.strictEqual(files.length, 1, 'Should have exactly one import-organizer.ts');

    const content = fs.readFileSync(files[0], 'utf8');

    // Check that it does NOT register the old command
    assert.ok(
      !content.includes("'typescriptHero.imports.organize'"),
      'import-organizer.ts must NOT register the old typescriptHero.imports.organize command'
    );

    // Check that it DOES register the new command
    assert.ok(
      content.includes("'miniTypescriptHero.imports.organize'"),
      'import-organizer.ts must register miniTypescriptHero.imports.organize command'
    );
  });

  test('no conflicting source files exist', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.join(projectRoot, 'src');

    // These are the canonical files that must be unique
    const coreFiles = [
      'imports/import-organizer.ts',
      'imports/import-types.ts',
      'imports/import-manager.ts',
      'configuration/imports-config.ts',
    ];

    for (const relativePath of coreFiles) {
      const fullPath = path.join(srcDir, relativePath);
      assert.ok(
        fs.existsSync(fullPath),
        `Core file must exist: ${relativePath}`
      );

      // Check that no duplicates exist anywhere else
      const filename = path.basename(relativePath);
      const allMatches = findFilesRecursive(srcDir, filename);

      assert.strictEqual(
        allMatches.length,
        1,
        `Found multiple copies of ${filename}: ${allMatches.join(', ')}`
      );
    }
  });
});

/**
 * Recursively find all files with a given name in a directory.
 */
function findFilesRecursive(dir: string, filename: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and test directories
      if (entry.name !== 'node_modules' && entry.name !== 'test' && entry.name !== 'out') {
        results.push(...findFilesRecursive(fullPath, filename));
      }
    } else if (entry.isFile() && entry.name === filename) {
      results.push(fullPath);
    }
  }

  return results;
}
