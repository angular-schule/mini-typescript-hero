import { ExtensionContext, OutputChannel, window } from 'vscode';

import { ImportsConfig, migrateSettings } from './configuration';
import { ImportOrganizer } from './imports/import-organizer';

let outputChannel: OutputChannel;
let organizer: ImportOrganizer;

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

    // Create configuration
    const config = new ImportsConfig();

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
