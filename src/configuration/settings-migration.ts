import { ExtensionContext, workspace, ConfigurationTarget, window, extensions, Uri } from 'vscode';

const OLD_SECTION = 'typescriptHero.imports';
const NEW_SECTION = 'miniTypescriptHero.imports';
const MIGRATION_KEY = 'settingsMigrationAttempted';
const OLD_EXTENSION_ID = 'rbbit.typescript-hero';

/**
 * List of all import-related settings to migrate from the old TypeScript Hero extension.
 */
const SETTINGS_TO_MIGRATE = [
  'insertSpaceBeforeAndAfterImportBraces',
  'insertSemicolons',
  'removeTrailingIndex',
  'stringQuoteStyle',
  'multiLineWrapThreshold',
  'multiLineTrailingComma',
  'disableImportRemovalOnOrganize',
  'disableImportsSorting',
  'organizeOnSave',
  'organizeSortsByFirstSpecifier',
  'ignoredFromRemoval',
  'grouping',
];

/**
 * Expected types for each setting. Used to validate migrated values.
 */
const SETTING_TYPES: Record<string, string> = {
  'insertSpaceBeforeAndAfterImportBraces': 'boolean',
  'insertSemicolons': 'boolean',
  'removeTrailingIndex': 'boolean',
  'stringQuoteStyle': 'string',
  'multiLineWrapThreshold': 'number',
  'multiLineTrailingComma': 'boolean',
  'disableImportRemovalOnOrganize': 'boolean',
  'disableImportsSorting': 'boolean',
  'organizeOnSave': 'boolean',
  'organizeSortsByFirstSpecifier': 'boolean',
  'ignoredFromRemoval': 'object', // array
  'grouping': 'object', // array
};

/**
 * Validates that a setting value has the expected type.
 */
function isValidSettingType(setting: string, value: unknown): boolean {
  const expectedType = SETTING_TYPES[setting];
  if (!expectedType) {
    return true; // Unknown setting, allow migration
  }
  return value !== null && typeof value === expectedType;
}

/**
 * Migrates settings from the original TypeScript Hero extension to Mini TypeScript Hero.
 *
 * This function:
 * 1. Checks if migration has already been attempted (stored in globalState)
 * 2. Reads old settings from 'typescriptHero.imports.*'
 * 3. Writes them to 'miniTypescriptHero.imports.*' if they exist
 * 4. Shows notification if settings were migrated
 * 5. Suggests deactivating old extension if it's still installed
 * 6. Marks migration as attempted to prevent running again
 *
 * Only runs once per installation to ensure smooth migration for existing users.
 *
 * @param context - The extension context for accessing globalState
 */
export async function migrateSettings(context: Pick<ExtensionContext, 'globalState'>): Promise<void> {
  // Check if we've already attempted migration
  const alreadyAttempted = context.globalState.get<boolean>(MIGRATION_KEY, false);
  if (alreadyAttempted) {
    return;
  }

  // Try to migrate settings
  // CRITICAL: Always set migration flag in finally block to prevent retry loop
  // if any config.update() call fails during migration
  try {
    const migratedCount = await performMigration();

    // Show notification if settings were migrated
    if (migratedCount > 0) {
      const oldExtension = extensions.getExtension(OLD_EXTENSION_ID);
      const isOldExtensionInstalled = oldExtension !== undefined;

      if (isOldExtensionInstalled) {
        const message = `Mini TypeScript Hero: Migrated ${migratedCount} setting(s) from TypeScript Hero. You can now disable the old extension if you want.`;
        window.showInformationMessage(message);
      } else {
        const message = `Mini TypeScript Hero: Migrated ${migratedCount} setting(s) from TypeScript Hero.`;
        window.showInformationMessage(message);
      }
    }
  } catch {
    // Migration failed — swallow silently, finally block sets the flag to prevent retry loop
  } finally {
    // Mark migration as attempted (always, even if migration failed)
    try {
      await context.globalState.update(MIGRATION_KEY, true);
    } catch {
      // Silently ignore — worst case, migration runs again on next activation
    }
  }
}

/**
 * Performs the actual migration of settings.
 *
 * @returns Number of settings migrated
 */
async function performMigration(): Promise<number> {
  const oldConfig = workspace.getConfiguration(OLD_SECTION);
  const newConfig = workspace.getConfiguration(NEW_SECTION);

  let migratedCount = 0;
  let migratedGlobalCount = 0;
  let migratedWorkspaceCount = 0;
  let migratedWorkspaceFolderCount = 0;
  const migratedFolderUris: Uri[] = [];

  // Step 1: Migrate global and workspace-level settings
  for (const setting of SETTINGS_TO_MIGRATE) {
    const inspect = oldConfig.inspect(setting);

    if (!inspect) {
      continue;
    }

    // Migrate workspace settings
    if (inspect.workspaceValue !== undefined && isValidSettingType(setting, inspect.workspaceValue)) {
      await newConfig.update(setting, inspect.workspaceValue, ConfigurationTarget.Workspace);
      migratedCount++;
      migratedWorkspaceCount++;
    }

    // Migrate global (user) settings
    if (inspect.globalValue !== undefined && isValidSettingType(setting, inspect.globalValue)) {
      await newConfig.update(setting, inspect.globalValue, ConfigurationTarget.Global);
      migratedCount++;
      migratedGlobalCount++;
    }
  }

  // Step 2: Migrate workspace-folder-level settings
  // getConfiguration() without a URI cannot see workspaceFolderValue in multi-root,
  // so we iterate over each workspace folder explicitly.
  for (const folder of workspace.workspaceFolders ?? []) {
    const oldFolderConfig = workspace.getConfiguration(OLD_SECTION, folder.uri);
    const newFolderConfig = workspace.getConfiguration(NEW_SECTION, folder.uri);

    for (const setting of SETTINGS_TO_MIGRATE) {
      const inspect = oldFolderConfig.inspect(setting);
      if (!inspect || inspect.workspaceFolderValue === undefined) {
        continue;
      }

      if (isValidSettingType(setting, inspect.workspaceFolderValue)) {
        await newFolderConfig.update(setting, inspect.workspaceFolderValue, ConfigurationTarget.WorkspaceFolder);
        migratedCount++;
        migratedWorkspaceFolderCount++;
        if (!migratedFolderUris.some(u => u.toString() === folder.uri.toString())) {
          migratedFolderUris.push(folder.uri);
        }
      }
    }
  }

  // For migrated users: Enable legacyMode for formatting backward compatibility
  // Write legacyMode to the SAME scope(s) where old settings were found
  if (migratedCount > 0) {
    // Simply enable legacyMode: true to replicate old formatting behaviors:
    // - Within-group sorting bug (always sorts by library name, ignores disableImportsSorting/organizeSortsByFirstSpecifier)
    // - Blank line preservation (uses 'preserve' mode, keeps existing blank lines from source)
    // - Merge timing: When mergeImportsFromSameModule is true, merges BEFORE removeTrailingIndex (matches old bug)
    // - Type-only merging: Strips 'import type' keywords and allows merging type-only with value imports (old behavior)
    // Check if legacyMode is already set at any scope
    // NOTE: unscoped inspect() can't see workspaceFolderValue in multi-root workspaces,
    // so we must iterate each folder individually to detect folder-level settings
    const legacyModeInspect = newConfig.inspect('legacyMode');
    let folderLevelLegacyModeExists = false;
    for (const folder of workspace.workspaceFolders ?? []) {
      const scopedInspect = workspace.getConfiguration(NEW_SECTION, folder.uri).inspect('legacyMode');
      if (scopedInspect?.workspaceFolderValue !== undefined) {
        folderLevelLegacyModeExists = true;
        break;
      }
    }
    if (legacyModeInspect?.globalValue === undefined &&
        legacyModeInspect?.workspaceValue === undefined &&
        !folderLevelLegacyModeExists) {

      // Write legacyMode to the scopes where old settings were migrated
      if (migratedGlobalCount > 0) {
        await newConfig.update('legacyMode', true, ConfigurationTarget.Global);
      }
      if (migratedWorkspaceCount > 0) {
        await newConfig.update('legacyMode', true, ConfigurationTarget.Workspace);
      }
      if (migratedWorkspaceFolderCount > 0) {
        // Only write legacyMode to folders that actually had old settings
        for (const folderUri of migratedFolderUris) {
          const scopedConfig = workspace.getConfiguration(NEW_SECTION, folderUri);
          await scopedConfig.update('legacyMode', true, ConfigurationTarget.WorkspaceFolder);
        }
      }

      // If no scopes detected (shouldn't happen), default to Global
      if (migratedGlobalCount === 0 && migratedWorkspaceCount === 0 && migratedWorkspaceFolderCount === 0) {
        await newConfig.update('legacyMode', true, ConfigurationTarget.Global);
      }
    }
  }

  return migratedCount;
}

/**
 * Resets the migration flag (useful for testing).
 *
 * @param context - The extension context
 */
export async function resetMigrationFlag(context: Pick<ExtensionContext, 'globalState'>): Promise<void> {
  await context.globalState.update(MIGRATION_KEY, undefined);
}
