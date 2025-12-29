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

  // Read our own organizeOnSave setting to determine if on-save conflicts are real
  const ourConfig = workspace.getConfiguration('miniTypescriptHero.imports');
  const ourOrganizeOnSave = ourConfig.get<boolean>('organizeOnSave', false);

  // Check 1: Old TypeScript Hero extension installed
  const oldExtension = extensions.getExtension(OLD_EXTENSION_ID);
  const oldExtensionInstalled = oldExtension !== undefined;

  if (oldExtensionInstalled) {
    conflicts.push('• Old TypeScript Hero extension is installed (keyboard shortcut Ctrl+Alt+O will trigger BOTH extensions)');
  }

  // Check 2: Old TypeScript Hero organize-on-save enabled
  // Only a conflict if OUR organizeOnSave is also enabled
  const oldTsHeroConfig = workspace.getConfiguration('typescriptHero.imports');
  const oldOrganizeOnSave = oldTsHeroConfig.get<boolean>('organizeOnSave', false);
  const oldOrganizeOnSaveEnabled = oldOrganizeOnSave && ourOrganizeOnSave;

  if (oldOrganizeOnSaveEnabled) {
    if (!conflicts.some(c => c.includes('Old TypeScript Hero extension'))) {
      conflicts.push('• Old TypeScript Hero "organizeOnSave" is enabled (will run on save alongside this extension)');
    }
  }

  // Check 3: VS Code built-in organize imports enabled
  // Only a conflict if OUR organizeOnSave is also enabled
  // Ignore "never" and false values (explicitly disabled)
  const editorConfig = workspace.getConfiguration('editor');
  const codeActionsOnSaveRaw = editorConfig.get('codeActionsOnSave');
  // Handle different types - codeActionsOnSave could be object, boolean, string, or undefined
  let organizeImportsValue: boolean | string | undefined;
  if (codeActionsOnSaveRaw && typeof codeActionsOnSaveRaw === 'object') {
    organizeImportsValue = (codeActionsOnSaveRaw as Record<string, boolean | string>)['source.organizeImports'];
  }
  // If codeActionsOnSave is not an object, organizeImportsValue stays undefined (no conflict)
  const vsCodeBuiltInEnabled = organizeImportsValue !== false && organizeImportsValue !== 'never' && organizeImportsValue !== undefined;
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
