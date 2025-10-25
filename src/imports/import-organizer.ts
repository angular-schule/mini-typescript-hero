import {
  commands,
  Disposable,
  OutputChannel,
  TextDocument,
  TextDocumentWillSaveEvent,
  TextEdit,
  window,
  workspace,
} from 'vscode';

import { ImportsConfig } from '../configuration';
import { ImportManager } from './import-manager';

/**
 * Handles import organization commands and organize-on-save functionality.
 */
export class ImportOrganizer implements Disposable {
  private disposables: Disposable[] = [];

  constructor(
    private readonly config: ImportsConfig,
    private readonly logger: OutputChannel,
  ) {}

  /**
   * Activate the ImportOrganizer by registering commands and event handlers.
   */
  public activate(): void {
    this.logger.appendLine('[ImportOrganizer] Activating');

    // Register main command
    this.disposables.push(
      commands.registerTextEditorCommand(
        'miniTypescriptHero.imports.organize',
        async () => {
          await this.organizeImportsCommand();
        },
      ),
    );

    // Register organize-on-save handler
    this.disposables.push(
      workspace.onWillSaveTextDocument((event: TextDocumentWillSaveEvent) => {
        if (this.shouldOrganizeOnSave(event.document)) {
          event.waitUntil(this.organizeImportsForDocument(event.document));
        }
      }),
    );

    this.logger.appendLine('[ImportOrganizer] Activated successfully');
  }

  /**
   * Execute the organize imports command for the active editor.
   */
  private async organizeImportsCommand(): Promise<void> {
    const editor = window.activeTextEditor;

    if (!editor) {
      window.showWarningMessage('No active editor found');
      return;
    }

    if (!this.isSupportedLanguage(editor.document.languageId)) {
      window.showWarningMessage(
        `Mini TypeScript Hero: Organize imports is not supported for ${editor.document.languageId} files`,
      );
      return;
    }

    try {
      this.logger.appendLine(`[ImportOrganizer] Organizing imports for ${editor.document.fileName}`);

      const edits = await this.organizeImportsForDocument(editor.document);

      if (edits.length === 0) {
        this.logger.appendLine('[ImportOrganizer] No changes needed');
        return;
      }

      // Apply the edits
      const success = await editor.edit(editBuilder => {
        for (const edit of edits) {
          if (edit.newText === '') {
            editBuilder.delete(edit.range);
          } else if (edit.range.isEmpty) {
            editBuilder.insert(edit.range.start, edit.newText);
          } else {
            editBuilder.replace(edit.range, edit.newText);
          }
        }
      });

      if (success) {
        this.logger.appendLine('[ImportOrganizer] Imports organized successfully');
      } else {
        window.showErrorMessage('Mini TypeScript Hero: Failed to apply import organization changes');
        this.logger.appendLine('[ImportOrganizer] Failed to apply edits');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(`Mini TypeScript Hero: Error organizing imports: ${errorMessage}`);
      this.logger.appendLine(`[ImportOrganizer] Error: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        this.logger.appendLine(error.stack);
      }
    }
  }

  /**
   * Organize imports for a specific document and return TextEdits.
   */
  private async organizeImportsForDocument(document: TextDocument): Promise<TextEdit[]> {
    if (!this.isSupportedLanguage(document.languageId)) {
      return [];
    }

    try {
      const manager = new ImportManager(document, this.config);
      return manager.organizeImports();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.appendLine(`[ImportOrganizer] Error organizing ${document.fileName}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Check if organize-on-save is enabled for this document.
   */
  private shouldOrganizeOnSave(document: TextDocument): boolean {
    if (!this.isSupportedLanguage(document.languageId)) {
      return false;
    }

    return this.config.organizeOnSave(document.uri);
  }

  /**
   * Check if the language is supported (TypeScript, JavaScript, TSX, JSX).
   */
  private isSupportedLanguage(languageId: string): boolean {
    return ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(languageId);
  }

  /**
   * Dispose of all resources.
   */
  public dispose(): void {
    this.logger.appendLine('[ImportOrganizer] Disposing');
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
