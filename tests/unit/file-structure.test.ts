/**
 * File structure validation tests
 *
 * These tests verify that core files have the correct content and capabilities
 * (not just that they exist - the filesystem guarantees uniqueness by path).
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('File Structure Validation', () => {

  test('import-types.ts supports attributes and comments', () => {
    const projectRoot = path.resolve(__dirname, '../../..');
    const filePath = path.join(projectRoot, 'src/imports/import-types.ts');
    const content = fs.readFileSync(filePath, 'utf8');

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
    const projectRoot = path.resolve(__dirname, '../../..');
    const filePath = path.join(projectRoot, 'src/imports/import-organizer.ts');
    const content = fs.readFileSync(filePath, 'utf8');

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

});
