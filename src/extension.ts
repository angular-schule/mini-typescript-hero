import { ExtensionContext, OutputChannel, window, commands, workspace, ConfigurationTarget, Uri } from 'vscode';

import { ImportsConfig, migrateSettings } from './configuration';
import { detectConflicts } from './configuration/conflict-detector';
import { BatchOrganizer } from './commands/batch-organizer';
import { ImportOrganizer } from './imports/import-organizer';

let outputChannel: OutputChannel;
let organizer: ImportOrganizer;

/**
 * Check for conflicts and show warning if any exist.
 * Can be called manually via command or automatically on activation.
 *
 * @param context Extension context for globalState access
 * @param outputChannel Output channel for logging
 * @param forceCheck If true, ignore hasWarned flag and always check
 */
async function checkForConflicts(
  context: ExtensionContext,
  outputChannel: OutputChannel,
  forceCheck: boolean = false
): Promise<void> {
  const hasWarnedKey = 'hasWarnedAboutConflicts';
  const hasWarned = context.globalState.get<boolean>(hasWarnedKey, false);

  // Skip check if already warned (unless forced)
  if (hasWarned && !forceCheck) {
    return;
  }

  // Use extracted conflict detection logic
  const conflictInfo = detectConflicts();
  const { conflicts, oldExtensionInstalled, oldOrganizeOnSaveEnabled, vsCodeBuiltInEnabled, ourOrganizeOnSaveEnabled } = conflictInfo;

  // Log detected conflicts
  if (oldExtensionInstalled) {
    outputChannel.appendLine('Mini TypeScript Hero: WARNING - Old TypeScript Hero extension detected!');
  }
  if (oldOrganizeOnSaveEnabled) {
    outputChannel.appendLine('Mini TypeScript Hero: WARNING - Old TypeScript Hero organize-on-save is enabled!');
  }
  if (vsCodeBuiltInEnabled) {
    outputChannel.appendLine('Mini TypeScript Hero: WARNING - VS Code built-in organize imports is enabled!');
  }

  // If forced check and no conflicts, show success message
  if (forceCheck && conflicts.length === 0) {
    window.showInformationMessage('Mini TypeScript Hero: No conflicts detected!');
    outputChannel.appendLine('Mini TypeScript Hero: Conflict check completed - no conflicts found');
    return;
  }

  // Show ONE warning if any conflicts detected
  if (conflicts.length > 0) {
    let message: string;

    // Count how many things will organize imports on save
    const onSaveCount = conflicts.filter(c =>
      c.includes('will run on save') || c.includes('organizeOnSave') || c.includes('codeActionsOnSave')
    ).length;

    const hasKeyboardConflict = conflicts.some(c => c.includes('Ctrl+Alt+O'));
    const hasVSCodeBuiltIn = vsCodeBuiltInEnabled;
    const hasOldExtension = oldExtensionInstalled || oldOrganizeOnSaveEnabled;

    if (conflicts.length === 1 && hasKeyboardConflict && !onSaveCount) {
      // Only old extension installed (not organize-on-save)
      message = 'Mini TypeScript Hero: The old TypeScript Hero extension (by rbbit) is still installed.\n\n' +
               'Keyboard shortcut Ctrl+Alt+O will trigger BOTH extensions.\n\n' +
               'Please disable or uninstall the old TypeScript Hero extension manually.';
    } else if (conflicts.length === 1 && onSaveCount === 1 && hasVSCodeBuiltIn) {
      // Only VSCode built-in conflict - can auto-fix!
      message = `Mini TypeScript Hero: Import organization conflict detected.\n\n${conflicts[0]}\n\n` +
               'This will organize imports multiple times on every save.\n\n' +
               'Click "Disable for Me" to let us fix this automatically.';
    } else if (conflicts.length === 1 && onSaveCount === 1) {
      // Only old TypeScript Hero organize-on-save conflict
      message = `Mini TypeScript Hero: Import organization conflict detected.\n\n${conflicts[0]}\n\n` +
               'This will organize imports multiple times on every save.\n\n' +
               'Please disable or uninstall the old TypeScript Hero extension manually.';
    } else {
      // Multiple conflicts
      // Add 1 to onSaveCount only if our organizeOnSave is enabled
      const totalOnSaveCount = onSaveCount > 0 && ourOrganizeOnSaveEnabled ? onSaveCount + 1 : onSaveCount;
      const conflictType = totalOnSaveCount > 0
        ? `imports will be organized ${totalOnSaveCount} times on every save`
        : 'keyboard shortcut conflicts';

      const autoFixNote = hasVSCodeBuiltIn
        ? '\n\nClick "Disable for Me" to let us disable the VSCode built-in setting.'
        : '';

      const oldExtNote = hasOldExtension
        ? '\n\nPlease disable or uninstall the old TypeScript Hero extension manually.'
        : '';

      message = `Mini TypeScript Hero: ${conflicts.length} configuration conflicts detected (${conflictType}):\n\n` +
               `${conflicts.join('\n')}${autoFixNote}${oldExtNote}`;
    }

    // Determine which buttons to show based on conflict type
    const buttons: string[] = [];

    // Can we auto-fix VSCode built-in?
    const canAutoFixVSCode = vsCodeBuiltInEnabled;

    if (canAutoFixVSCode) {
      buttons.push('Disable for Me');
    }

    // Only offer "Open Extensions" if old extension is installed
    if (hasOldExtension) {
      buttons.push('Open Extensions');
    }

    buttons.push('Remind on Next Restart', 'Don\'t Show Again');

    window.showWarningMessage(
      message,
      ...buttons
    ).then(async selection => {
      if (selection === 'Disable for Me') {
        // Automatically disable VSCode's built-in organize imports
        try {
          const editorConfig = workspace.getConfiguration('editor');
          const currentActions = editorConfig.get('codeActionsOnSave') as Record<string, boolean | string> | undefined;

          if (currentActions) {
            // Create new object with source.organizeImports set to false
            const newActions = { ...currentActions };
            newActions['source.organizeImports'] = false;

            // Determine which scope to update (most specific scope wins)
            const inspection = editorConfig.inspect('codeActionsOnSave');
            let target = ConfigurationTarget.Global;

            if (inspection?.workspaceFolderValue) {
              target = ConfigurationTarget.WorkspaceFolder;
            } else if (inspection?.workspaceValue) {
              target = ConfigurationTarget.Workspace;
            }

            await editorConfig.update('codeActionsOnSave', newActions, target);

            window.showInformationMessage(
              'Mini TypeScript Hero: VSCode built-in organize imports has been disabled. ' +
              'You can re-enable it anytime in Settings.'
            );
            outputChannel.appendLine('Mini TypeScript Hero: Successfully disabled VSCode built-in organize imports');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          window.showErrorMessage(`Mini TypeScript Hero: Failed to disable VSCode built-in: ${errorMessage}`);
          outputChannel.appendLine(`Mini TypeScript Hero: Error disabling VSCode built-in: ${errorMessage}`);
        }
        // Mark as warned - conflict resolved
        await context.globalState.update(hasWarnedKey, true);
      } else if (selection === 'Open Extensions') {
        // Open Extensions sidebar so user can disable old TypeScript Hero manually
        // NOTE: Using 'workbench.view.extensions' instead of 'workbench.extensions.action.showInstalledExtensions'
        // because the latter silently fails in some contexts.
        await commands.executeCommand('workbench.view.extensions');
      } else if (selection === 'Don\'t Show Again') {
        // User explicitly wants to suppress warning
        await context.globalState.update(hasWarnedKey, true);
      }
      // else: "Remind on Next Restart" or dismissed (undefined) -> Don't set flag, will warn on next activation
    });
  }
}

/**
 * Activate the Mini TypeScript Hero extension.
 */
export async function activate(context: ExtensionContext): Promise<void> {
  // Create output channel for logging
  outputChannel = window.createOutputChannel('Mini TypeScript Hero');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('Mini TypeScript Hero: Activating extension');

  try {
    // Migrate settings from old TypeScript Hero extension (runs once)
    await migrateSettings(context);

    /**
     * =============================================================================
     * CONFLICT DETECTION & RESOLUTION SYSTEM
     * =============================================================================
     *
     * This system detects conflicts where multiple tools would organize imports,
     * causing duplicate work and potentially conflicting results. It runs ONCE on
     * extension activation and offers automatic resolution where possible.
     *
     * DETECTED CONFLICTS:
     * -------------------
     * 1. Old TypeScript Hero extension installed (keyboard shortcut Ctrl+Alt+O conflicts)
     * 2. Old TypeScript Hero "organizeOnSave" enabled (will run on save alongside us)
     * 3. VSCode built-in "editor.codeActionsOnSave: source.organizeImports" enabled
     *
     * CONFLICT CATEGORIZATION:
     * ------------------------
     * - Keyboard conflicts: Multiple extensions respond to same shortcut
     * - On-save conflicts: Multiple tools organize imports on file save
     *
     * AUTOMATIC RESOLUTION:
     * ---------------------
     * For VSCode built-in conflicts, we offer "Disable for Me" button that:
     * 1. Reads current "editor.codeActionsOnSave" setting
     * 2. Detects which scope has the setting (Global/Workspace/WorkspaceFolder)
     * 3. Creates new config object with source.organizeImports = false
     * 4. Updates the correct scope using workspace.getConfiguration().update()
     * 5. Shows success/error message
     * 6. Marks conflict as resolved (won't warn again)
     *
     * MANUAL RESOLUTION:
     * ------------------
     * For old extension conflicts, user must manually disable/uninstall the extension:
     * - "Open Extensions" button → Opens Extensions view for manual action
     * - Message clearly states that only the user can disable extensions
     * - No automatic resolution available (VSCode API limitation)
     *
     * WARNING PERSISTENCE:
     * --------------------
     * - hasWarnedKey stored in globalState (persists across VSCode sessions)
     * - Set to true when:
     *   - User clicks "Disable for Me" (VSCode built-in conflict auto-resolved)
     *   - User clicks "Don't Show Again" (explicit suppression)
     * - NOT set when:
     *   - User clicks "Open Extensions" (might not actually fix it)
     *   - User clicks "Remind on Next Restart" (wants to see warning again)
     *   - User dismisses dialog (clicks X or presses Escape)
     *
     * BUTTON COMBINATIONS:
     * --------------------
     * Shown buttons vary based on detected conflicts:
     *
     * Single VSCode built-in conflict:
     *   [Disable for Me] [Remind on Next Restart] [Don't Show Again]
     *
     * Single old extension conflict (keyboard only):
     *   [Open Extensions] [Remind on Next Restart] [Don't Show Again]
     *
     * Single old extension conflict (organize-on-save):
     *   [Open Extensions] [Remind on Next Restart] [Don't Show Again]
     *
     * Multiple conflicts (including VSCode built-in):
     *   [Disable for Me] [Open Extensions] [Remind on Next Restart] [Don't Show Again]
     *
     * Multiple conflicts (no VSCode built-in):
     *   [Open Extensions] [Remind on Next Restart] [Don't Show Again]
     *
     * EDGE CASES HANDLED:
     * -------------------
     * - Old extension installed but organizeOnSave disabled: Only keyboard conflict
     * - VSCode built-in already set to false: No conflict detected
     * - codeActionsOnSave is object but source.organizeImports missing: No conflict
     * - Multiple scopes have codeActionsOnSave: Update most specific scope
     * - Auto-disable fails (permissions/read-only): Show error, don't mark as warned
     * - User has both old extension AND VSCode built-in: Show both in message
     *
     * =============================================================================
     */

    // Check for conflicts on activation (only if not already warned)
    await checkForConflicts(context, outputChannel, false);

    // Create configuration
    const config = new ImportsConfig();

    // Register command: Check for conflicts manually
    const checkConflictsCommand = commands.registerCommand('miniTypescriptHero.checkConflicts', async () => {
      outputChannel.appendLine('Mini TypeScript Hero: Running conflict check (manual)');
      await checkForConflicts(context, outputChannel, true);
    });
    context.subscriptions.push(checkConflictsCommand);

    // Register command: Toggle legacy mode
    const toggleLegacyModeCommand = commands.registerCommand('miniTypescriptHero.toggleLegacyMode', async () => {
      try {
        const importsConfig = workspace.getConfiguration('miniTypescriptHero.imports');
        const currentValue = importsConfig.get<boolean>('legacyMode', false);
        const newValue = !currentValue;

        // Determine best scope to update
        // Priority: WorkspaceFolder > Workspace > Global
        const inspection = importsConfig.inspect('legacyMode');
        let target = ConfigurationTarget.Global;
        let scopeName = 'User (Global)';

        if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
          if (inspection?.workspaceFolderValue !== undefined) {
            target = ConfigurationTarget.WorkspaceFolder;
            scopeName = 'Workspace Folder';
          } else if (inspection?.workspaceValue !== undefined) {
            target = ConfigurationTarget.Workspace;
            scopeName = 'Workspace';
          } else if (workspace.workspaceFolders.length === 1) {
            // Single workspace folder - prefer Workspace scope
            target = ConfigurationTarget.Workspace;
            scopeName = 'Workspace';
          }
        }

        await importsConfig.update('legacyMode', newValue, target);
        const statusText = newValue ? 'enabled' : 'disabled';
        window.showInformationMessage(
          `Mini TypeScript Hero: Legacy mode ${statusText} (${scopeName} settings)`
        );
        outputChannel.appendLine(`Mini TypeScript Hero: Legacy mode ${statusText} at ${scopeName} scope`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(`Mini TypeScript Hero: Failed to toggle legacy mode: ${errorMessage}`);
        outputChannel.appendLine(`Mini TypeScript Hero: Error toggling legacy mode: ${errorMessage}`);
      }
    });
    context.subscriptions.push(toggleLegacyModeCommand);

    // Create batch organizer for workspace/folder operations
    const batchOrganizer = new BatchOrganizer(config, outputChannel);

    // Register command: Organize imports in workspace
    const organizeWorkspaceCommand = commands.registerCommand('miniTypescriptHero.imports.organizeWorkspace', async () => {
      outputChannel.appendLine('Mini TypeScript Hero: Running organize imports in workspace');
      await batchOrganizer.organizeWorkspace();
    });
    context.subscriptions.push(organizeWorkspaceCommand);

    // Register command: Organize imports in folder
    const organizeFolderCommand = commands.registerCommand('miniTypescriptHero.imports.organizeFolder', async (clickedFolder?: Uri) => {
      try {
        if (!clickedFolder) {
          // Fallback: use workspace root if called from command palette
          if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
            window.showWarningMessage('Mini TypeScript Hero: No workspace folder open');
            return;
          }
          clickedFolder = workspace.workspaceFolders[0].uri;
        }

        outputChannel.appendLine(`Mini TypeScript Hero: Running organize imports in folder: ${clickedFolder.fsPath}`);
        await batchOrganizer.organizeFolder(clickedFolder);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        window.showErrorMessage(`Mini TypeScript Hero: Failed to organize folder: ${errorMessage}`);
        outputChannel.appendLine(`Mini TypeScript Hero: Error organizing folder: ${errorMessage}`);
      }
    });
    context.subscriptions.push(organizeFolderCommand);

    // Create and activate import organizer
    organizer = new ImportOrganizer(config, outputChannel);
    organizer.activate();

    context.subscriptions.push(organizer);

    outputChannel.appendLine('Mini TypeScript Hero: Extension activated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`Mini TypeScript Hero: Failed to activate: ${errorMessage}`);
    window.showErrorMessage(`Mini TypeScript Hero: Failed to activate: ${errorMessage}`);
  }
}

/**
 * Deactivate the extension.
 */
export function deactivate(): void {
  if (outputChannel) {
    outputChannel.appendLine('Mini TypeScript Hero: Deactivating extension');
    outputChannel.dispose();
  }
}
