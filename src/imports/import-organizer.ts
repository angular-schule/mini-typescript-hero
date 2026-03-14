import {
  commands,
  Disposable,
  OutputChannel,
  TextDocument,
  TextDocumentWillSaveEvent,
  TextEdit,
  TextEditor,
  Uri,
  window,
  workspace,
} from 'vscode';

import { minimatch } from 'minimatch';

import { ImportsConfig } from '../configuration';
import { ImportManager } from './import-manager';

/**
 * Handles import organization commands and organize-on-save functionality.
 */
export class ImportOrganizer implements Disposable {
  private disposables: Disposable[] = [];
  private runningOrganizes = new Set<string>();

  /**
   * When true, organize-on-save is suppressed for all files.
   * Used by BatchOrganizer to prevent double-parsing during batch saves.
   */
  public suppressOrganizeOnSave = false;

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
        async (textEditor) => {
          await this.organizeImportsCommand(textEditor);
        },
      ),
    );

    // Register organize-on-save handler
    this.disposables.push(
      workspace.onWillSaveTextDocument((event: TextDocumentWillSaveEvent) => {
        if (this.shouldOrganizeOnSave(event.document)) {
          // Guard: Re-entrancy protection
          const key = event.document.uri.toString();
          if (this.runningOrganizes.has(key)) {
            this.logger.appendLine(`[ImportOrganizer] Skipping organize-on-save for ${event.document.fileName} (already running)`);
            return;
          }

          this.runningOrganizes.add(key);
          event.waitUntil(
            this.organizeImportsForDocument(event.document)
              .catch(err => {
                this.logger.appendLine(`[ImportOrganizer] Error in organize-on-save: ${err}`);
                return []; // Return empty edits on error to allow save to proceed
              })
              .finally(() => {
                this.runningOrganizes.delete(key);
              }),
          );
        }
      }),
    );

    this.logger.appendLine('[ImportOrganizer] Activated successfully');
  }

  /**
   * Execute the organize imports command for the active editor.
   */
  private async organizeImportsCommand(providedEditor?: TextEditor): Promise<void> {
    const editor = providedEditor ?? window.activeTextEditor;

    if (!editor) {
      window.showWarningMessage('No active editor found');
      return;
    }

    // Only process file:// and untitled: schemes (skip git diffs, SCM views, etc.)
    const scheme = editor.document.uri.scheme;
    if (scheme !== 'file' && scheme !== 'untitled') {
      return;
    }

    // Re-entrancy guard (same as organize-on-save)
    const key = editor.document.uri.toString();
    if (this.runningOrganizes.has(key)) {
      return;
    }

    if (!this.isSupportedLanguage(editor.document.languageId)) {
      window.showWarningMessage(
        `Mini TypeScript Hero: Organize imports is not supported for ${editor.document.languageId} files`,
      );
      return;
    }

    // Check if file is excluded by user/team patterns
    if (this.isFileExcluded(editor.document.uri)) {
      window.showWarningMessage(
        `Mini TypeScript Hero: This file is excluded from import organization by your workspace settings (check excludePatterns)`,
      );
      this.logger.appendLine(`[ImportOrganizer] File excluded by excludePatterns: ${editor.document.fileName}`);
      return;
    }

    this.runningOrganizes.add(key);
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
    } finally {
      this.runningOrganizes.delete(key);
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
      return await manager.organizeImports();
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
    // Guard: Suppressed during batch operations to prevent double-parsing
    if (this.suppressOrganizeOnSave) {
      return false;
    }

    // Guard: Only process file:// scheme (skip untitled:, vscode-notebook-cell:, etc.)
    if (document.uri.scheme !== 'file') {
      return false;
    }

    if (!this.isSupportedLanguage(document.languageId)) {
      return false;
    }

    if (!this.config.organizeOnSave(document.uri)) {
      return false;
    }

    // Check if file is excluded by user/team patterns (same check as manual command)
    if (this.isFileExcluded(document.uri)) {
      this.logger.appendLine(`[ImportOrganizer] Skipping organize-on-save for excluded file: ${document.fileName}`);
      return false;
    }

    // Note: Conflict detection runs on activation (see extension.ts)
    // If user has both Mini TS Hero AND VSCode built-in organize imports enabled,
    // they were warned and offered auto-resolution via "Disable for Me" button.
    // We proceed here - if they chose to keep both, that's their decision.

    return true;
  }

  /**
   * Check if a file should be excluded from import organization based on exclude patterns.
   * Uses both built-in defaults and user-configured patterns.
   */
  private isFileExcluded(fileUri: Uri): boolean {
    // Get workspace folder for this file
    const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) {
      // File not in workspace - don't exclude
      return false;
    }

    // Default exclude patterns (same as BatchOrganizer)
    const defaultPatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/coverage/**',
    ];

    // Get user-configured patterns
    const userPatterns = this.config.excludePatterns(fileUri);
    const allPatterns = [...defaultPatterns, ...userPatterns];

    // Convert file URI to path relative to workspace root
    // Normalize to forward slashes for glob matching (Windows uses backslashes)
    const relativePath = fileUri.fsPath
      .substring(workspaceFolder.uri.fsPath.length + 1)
      .replace(/\\/g, '/');

    // Check if file matches any exclude pattern
    for (const pattern of allPatterns) {
      if (minimatch(relativePath, pattern)) {
        return true;
      }
    }

    return false;
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
