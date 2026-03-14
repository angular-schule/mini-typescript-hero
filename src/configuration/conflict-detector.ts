/**
 * Conflict Detection Logic
 *
 * Detects conflicts where multiple tools would organize imports simultaneously.
 * Extracted from extension.ts for testability.
 */

import { workspace, extensions } from 'vscode';

const OLD_EXTENSION_ID = 'rbbit.typescript-hero';

/**
 * Types of conflicts that can be detected.
 */
export interface ConflictInfo {
  /** Old TypeScript Hero extension is installed */
  oldExtensionInstalled: boolean;
  /** Old TypeScript Hero organize-on-save is enabled */
  oldOrganizeOnSaveEnabled: boolean;
  /** VS Code built-in organize imports is enabled */
  vsCodeBuiltInEnabled: boolean;
  /** Our own organize-on-save setting */
  ourOrganizeOnSaveEnabled: boolean;
  /** List of human-readable conflict descriptions */
  conflicts: string[];
}

/**
 * Detects import organization conflicts.
 *
 * Returns information about detected conflicts:
 * - Old TypeScript Hero extension presence
 * - Organize-on-save conflicts (old extension, VS Code built-in)
 * - Only reports on-save conflicts if OUR organizeOnSave is also enabled
 *
 * @returns Conflict information
 */
export function detectConflicts(): ConflictInfo {
  const conflicts: string[] = [];

  // Read our own organizeOnSave setting to determine if on-save conflicts are real.
  // Check all scopes including workspace folders (unscoped read misses folder-level settings).
  const ourOrganizeOnSave = isBooleanSettingEnabled('miniTypescriptHero.imports', 'organizeOnSave');

  // Check 1: Old TypeScript Hero extension installed
  const oldExtension = extensions.getExtension(OLD_EXTENSION_ID);
  const oldExtensionInstalled = oldExtension !== undefined;

  if (oldExtensionInstalled) {
    conflicts.push('• Old TypeScript Hero extension is installed (keyboard shortcut Ctrl+Alt+O will trigger BOTH extensions)');
  }

  // Check 2: Old TypeScript Hero organize-on-save enabled
  // Only a conflict if OUR organizeOnSave is also enabled
  const oldOrganizeOnSave = isBooleanSettingEnabled('typescriptHero.imports', 'organizeOnSave');
  const oldOrganizeOnSaveEnabled = oldOrganizeOnSave && ourOrganizeOnSave;

  if (oldOrganizeOnSaveEnabled) {
    // Always add on-save conflict (separate from keyboard conflict — both can coexist)
    conflicts.push('• Old TypeScript Hero "organizeOnSave" is enabled (will run on save alongside this extension)');
  }

  // Check 3: VS Code built-in organize imports enabled
  // Only a conflict if OUR organizeOnSave is also enabled
  const vsCodeBuiltInEnabled = isOrganizeImportsCodeActionEnabled();
  const vsCodeBuiltInConflict = vsCodeBuiltInEnabled && ourOrganizeOnSave;

  if (vsCodeBuiltInConflict) {
    conflicts.push('• VS Code built-in "editor.codeActionsOnSave: source.organizeImports" is enabled (will run on save)');
  }

  return {
    oldExtensionInstalled,
    oldOrganizeOnSaveEnabled,
    vsCodeBuiltInEnabled,  // Return actual enabled state, not conflict state
    ourOrganizeOnSaveEnabled: ourOrganizeOnSave,
    conflicts,
  };
}

/**
 * Check if a boolean setting is enabled in any scope (global, workspace, or any workspace folder).
 * Unscoped getConfiguration().get() misses workspace-folder-level values in multi-root workspaces.
 */
function isBooleanSettingEnabled(section: string, key: string): boolean {
  const config = workspace.getConfiguration(section);
  const inspect = config.inspect<boolean>(key);
  if (inspect?.globalValue || inspect?.workspaceValue) {
    return true;
  }
  for (const folder of workspace.workspaceFolders ?? []) {
    const fi = workspace.getConfiguration(section, folder.uri).inspect<boolean>(key);
    if (fi?.workspaceFolderValue) {
      return true;
    }
  }
  return false;
}

/**
 * Check if editor.codeActionsOnSave has source.organizeImports enabled in any scope.
 */
function isOrganizeImportsCodeActionEnabled(): boolean {
  const config = workspace.getConfiguration('editor');
  const inspect = config.inspect('codeActionsOnSave');

  const checkValue = (value: unknown): boolean => {
    if (value && typeof value === 'object') {
      const oi = (value as Record<string, boolean | string>)['source.organizeImports'];
      return oi !== false && oi !== 'never' && oi !== undefined && oi !== null;
    }
    return false;
  };

  if (checkValue(inspect?.globalValue) || checkValue(inspect?.workspaceValue)) {
    return true;
  }
  for (const folder of workspace.workspaceFolders ?? []) {
    const fi = workspace.getConfiguration('editor', folder.uri).inspect('codeActionsOnSave');
    if (checkValue(fi?.workspaceFolderValue)) {
      return true;
    }
  }
  return false;
}
