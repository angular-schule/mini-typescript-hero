/**
 * Manifest validation tests
 *
 * These tests ensure the package.json manifest is correctly configured
 * and doesn't conflict with the old TypeScript Hero extension.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Manifest Validation', () => {

  let packageJson: any;

  suiteSetup(() => {
    const packagePath = path.resolve(__dirname, '../../package.json');
    const content = fs.readFileSync(packagePath, 'utf8');
    packageJson = JSON.parse(content);
  });

  test('contributes only miniTypescriptHero.* commands', () => {
    const commands = (packageJson.contributes?.commands ?? []).map((c: any) => c.command);

    // All commands must start with miniTypescriptHero
    assert.ok(
      commands.every((c: string) => c.startsWith('miniTypescriptHero.')),
      `All commands must start with 'miniTypescriptHero.', found: ${commands.join(', ')}`
    );

    // No commands should start with typescriptHero (old extension)
    assert.ok(
      commands.every((c: string) => !c.startsWith('typescriptHero.')),
      `No commands should start with 'typescriptHero.', found: ${commands.join(', ')}`
    );

    // Should have at least the organize command
    assert.ok(
      commands.includes('miniTypescriptHero.imports.organize'),
      'Must include miniTypescriptHero.imports.organize command'
    );
  });

  test('all configuration properties start with miniTypescriptHero.imports.*', () => {
    const configProps = Object.keys(packageJson.contributes?.configuration?.properties ?? {});

    assert.ok(
      configProps.every(k => k.startsWith('miniTypescriptHero.imports.')),
      `All settings must start with 'miniTypescriptHero.imports.*', found: ${configProps.join(', ')}`
    );

    // Verify no old extension settings
    assert.ok(
      configProps.every(k => !k.startsWith('typescriptHero.')),
      `No settings should start with 'typescriptHero.*', found: ${configProps.join(', ')}`
    );
  });

  test('has correct extension metadata', () => {
    assert.strictEqual(packageJson.name, 'mini-typescript-hero', 'Extension name must be mini-typescript-hero');
    assert.strictEqual(packageJson.displayName, 'Mini TypeScript Hero', 'Display name must be Mini TypeScript Hero');
    assert.strictEqual(packageJson.publisher, 'angular-schule', 'Publisher must be angular-schule');
  });

  test('ignoredFromRemoval has correct default', () => {
    const ignoredFromRemoval = packageJson.contributes?.configuration?.properties?.['miniTypescriptHero.imports.ignoredFromRemoval'];
    assert.deepStrictEqual(
      ignoredFromRemoval?.default,
      ['react'],
      'Default for ignoredFromRemoval must be ["react"]'
    );
  });

  test('legacyMode defaults to false for new users', () => {
    const legacyMode = packageJson.contributes?.configuration?.properties?.['miniTypescriptHero.imports.legacyMode'];
    assert.strictEqual(
      legacyMode?.default,
      false,
      'Default for legacyMode must be false (new users get modern behavior)'
    );
  });

  test('mergeImportsFromSameModule defaults to true', () => {
    const merge = packageJson.contributes?.configuration?.properties?.['miniTypescriptHero.imports.mergeImportsFromSameModule'];
    assert.strictEqual(
      merge?.default,
      true,
      'Default for mergeImportsFromSameModule must be true (modern behavior)'
    );
  });
});
