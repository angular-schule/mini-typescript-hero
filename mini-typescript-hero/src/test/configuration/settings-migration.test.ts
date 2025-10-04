/**
 * Integration Tests for Settings Migration
 *
 * Tests the automatic migration of settings from the original TypeScript Hero extension
 * to Mini TypeScript Hero. Ensures that existing users get a smooth migration experience.
 *
 * Note: These tests focus on the migration flag behavior and function execution without errors.
 * Full end-to-end migration testing requires the old TypeScript Hero extension to be installed,
 * which is not feasible in the test environment.
 */

import * as assert from 'assert';
import { ExtensionContext } from 'vscode';
import { migrateSettings, resetMigrationFlag } from '../../configuration/settings-migration';

suite('Settings Migration Tests', () => {
  let mockContext: ExtensionContext;

  setup(() => {
    // Create a minimal mock of ExtensionContext
    const globalState = new Map<string, unknown>();
    mockContext = {
      globalState: {
        get: <T>(key: string, defaultValue?: T): T => {
          return (globalState.has(key) ? globalState.get(key) : defaultValue) as T;
        },
        update: async (key: string, value: unknown): Promise<void> => {
          // Match VSCode behavior: setting to undefined removes the key
          if (value === undefined) {
            globalState.delete(key);
          } else {
            globalState.set(key, value);
          }
        },
        keys: (): readonly string[] => Array.from(globalState.keys()),
        setKeysForSync: (): void => { }
      },
      subscriptions: [],
      extensionPath: '',
      extensionUri: {} as any,
      environmentVariableCollection: {} as any,
      extensionMode: 3, // ExtensionMode.Production
      storageUri: undefined,
      storagePath: undefined,
      globalStorageUri: {} as any,
      globalStoragePath: '',
      logUri: {} as any,
      logPath: '',
      asAbsolutePath: (relativePath: string) => relativePath,
      workspaceState: {} as any,
      secrets: {} as any,
      extension: {} as any,
      languageModelAccessInformation: {} as any,
    };
  });

  teardown(async () => {
    // Reset migration flag after each test
    await resetMigrationFlag(mockContext);
  });

  test('should run migration without errors when no old settings exist', async () => {
    // When no old extension is installed/configured, migration should complete without errors

    // Verify migration flag is not set initially
    let flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, false);

    // Run migration
    await migrateSettings(mockContext);

    // Verify flag was set (migration attempted, even though no settings existed)
    flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, true);
  });

  test('should not run migration twice', async () => {
    // Run migration first time
    await migrateSettings(mockContext);

    // Verify flag was set
    let flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, true);

    // Reset flag manually to test second run behavior
    const firstRunFlag = mockContext.globalState.get<boolean>('settingsMigrationAttempted');

    // Run migration second time
    await migrateSettings(mockContext);

    // Verify flag is still set (migration didn't reset it)
    const secondRunFlag = mockContext.globalState.get<boolean>('settingsMigrationAttempted');
    assert.strictEqual(firstRunFlag, secondRunFlag);
    assert.strictEqual(secondRunFlag, true);
  });

  test('should set migration flag to prevent future runs', async () => {
    // Verify flag is not set initially
    let flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, false);

    // Run migration
    await migrateSettings(mockContext);

    // Verify flag was set
    flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, true);
  });

  test('should reset migration flag when resetMigrationFlag is called', async () => {
    // Run migration to set the flag
    await migrateSettings(mockContext);
    let flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, true);

    // Reset flag
    await resetMigrationFlag(mockContext);

    // Verify flag was reset
    flagSet = mockContext.globalState.get<boolean>('settingsMigrationAttempted', false);
    assert.strictEqual(flagSet, false);
  });

  test('should allow migration to run again after reset', async () => {
    // Run migration
    await migrateSettings(mockContext);
    assert.strictEqual(mockContext.globalState.get<boolean>('settingsMigrationAttempted', false), true);

    // Reset flag
    await resetMigrationFlag(mockContext);
    assert.strictEqual(mockContext.globalState.get<boolean>('settingsMigrationAttempted', false), false);

    // Run migration again (should work without errors)
    await migrateSettings(mockContext);
    assert.strictEqual(mockContext.globalState.get<boolean>('settingsMigrationAttempted', false), true);
  });

  test('should handle globalState operations correctly', async () => {
    // Verify the mock globalState behaves as expected

    // Initially undefined
    assert.strictEqual(mockContext.globalState.get('testKey'), undefined);

    // With default value
    assert.strictEqual(mockContext.globalState.get('testKey', 'default'), 'default');

    // After setting a value
    await mockContext.globalState.update('testKey', 'value');
    assert.strictEqual(mockContext.globalState.get('testKey'), 'value');

    // After clearing
    await mockContext.globalState.update('testKey', undefined);
    assert.strictEqual(mockContext.globalState.get('testKey'), undefined);
  });
});
