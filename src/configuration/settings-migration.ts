import { ExtensionContext, workspace, ConfigurationTarget, window, extensions } from 'vscode';

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
export async function migrateSettings(context: ExtensionContext): Promise<void> {
  // Check if we've already attempted migration
  const alreadyAttempted = context.globalState.get<boolean>(MIGRATION_KEY, false);
  if (alreadyAttempted) {
    return;
  }

  // Try to migrate settings
  const migratedCount = await performMigration();

  // Mark migration as attempted (always, even if no settings found)
  await context.globalState.update(MIGRATION_KEY, true);

  // Show notification if settings were migrated
  if (migratedCount > 0) {
    const oldExtension = extensions.getExtension(OLD_EXTENSION_ID);
    const isOldExtensionActive = oldExtension !== undefined;

    if (isOldExtensionActive) {
      const message = `Mini TypeScript Hero: Migrated ${migratedCount} setting(s) from TypeScript Hero. You can now disable the old extension if you want.`;
      window.showInformationMessage(message);
    } else {
      const message = `Mini TypeScript Hero: Migrated ${migratedCount} setting(s) from TypeScript Hero.`;
      window.showInformationMessage(message);
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

  for (const setting of SETTINGS_TO_MIGRATE) {
    // Check if old setting exists (has been configured by user)
    const inspect = oldConfig.inspect(setting);

    if (!inspect) {
      continue;
    }

    // Migrate from each configuration level where it was set
    // Priority: workspace > workspaceFolder > global

    // Migrate workspace settings
    if (inspect.workspaceValue !== undefined) {
      await newConfig.update(setting, inspect.workspaceValue, ConfigurationTarget.Workspace);
      migratedCount++;
    }

    // Migrate workspace folder settings
    if (inspect.workspaceFolderValue !== undefined) {
      await newConfig.update(setting, inspect.workspaceFolderValue, ConfigurationTarget.WorkspaceFolder);
      migratedCount++;
    }

    // Migrate global (user) settings
    if (inspect.globalValue !== undefined) {
      await newConfig.update(setting, inspect.globalValue, ConfigurationTarget.Global);
      migratedCount++;
    }
  }

  // For migrated users: Set compatibility settings to preserve old behavior
  if (migratedCount > 0) {
    // Set blankLinesAfterImports to 'legacy' to preserve old blank line behavior
    // (Old TypeScript Hero had complex blank line logic where blanks before imports affected blanks after)
    const blankLinesInspect = newConfig.inspect('blankLinesAfterImports');
    if (blankLinesInspect?.globalValue === undefined &&
        blankLinesInspect?.workspaceValue === undefined &&
        blankLinesInspect?.workspaceFolderValue === undefined) {
      await newConfig.update('blankLinesAfterImports', 'legacy', ConfigurationTarget.Global);
    }

    // Set mergeImportsFromSameModule based on old disableImportRemovalOnOrganize setting
    // (In old TypeScript Hero, merging only happened when removal was enabled)
    // This preserves 100% backward compatibility:
    // - If they had disableImportRemovalOnOrganize: true → merging was OFF → set mergeImportsFromSameModule: false
    // - If they had disableImportRemovalOnOrganize: false (or default) → merging was ON → set mergeImportsFromSameModule: true
    const disableRemovalInspect = newConfig.inspect('disableImportRemovalOnOrganize');
    const mergeImportsInspect = newConfig.inspect('mergeImportsFromSameModule');

    // Only set if mergeImportsFromSameModule hasn't been explicitly configured
    if (mergeImportsInspect?.globalValue === undefined &&
        mergeImportsInspect?.workspaceValue === undefined &&
        mergeImportsInspect?.workspaceFolderValue === undefined) {

      // Check the migrated value of disableImportRemovalOnOrganize at each level
      if (disableRemovalInspect?.workspaceFolderValue !== undefined) {
        const shouldMerge = !disableRemovalInspect.workspaceFolderValue;
        await newConfig.update('mergeImportsFromSameModule', shouldMerge, ConfigurationTarget.WorkspaceFolder);
      } else if (disableRemovalInspect?.workspaceValue !== undefined) {
        const shouldMerge = !disableRemovalInspect.workspaceValue;
        await newConfig.update('mergeImportsFromSameModule', shouldMerge, ConfigurationTarget.Workspace);
      } else if (disableRemovalInspect?.globalValue !== undefined) {
        const shouldMerge = !disableRemovalInspect.globalValue;
        await newConfig.update('mergeImportsFromSameModule', shouldMerge, ConfigurationTarget.Global);
      } else {
        // Default case: if no disableImportRemovalOnOrganize was set, they had merging enabled
        await newConfig.update('mergeImportsFromSameModule', true, ConfigurationTarget.Global);
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
export async function resetMigrationFlag(context: ExtensionContext): Promise<void> {
  await context.globalState.update(MIGRATION_KEY, undefined);
}
