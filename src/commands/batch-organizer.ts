import {
  CancellationToken,
  OutputChannel,
  Progress,
  ProgressLocation,
  TextEdit,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from 'vscode';

import { ImportsConfig } from '../configuration';
import { ImportManager } from '../imports/import-manager';

/**
 * Result of batch organization operation.
 */
interface BatchResult {
  processed: number;
  errors: number;
  skipped: number;
}

/**
 * Handles batch organization of imports across multiple files.
 * Used for workspace-wide and folder-wide operations.
 */
export class BatchOrganizer {
  constructor(
    private readonly config: ImportsConfig,
    private readonly logger: OutputChannel,
  ) {}

  /**
   * Organize imports in all TypeScript/JavaScript files in the workspace.
   */
  async organizeWorkspace(): Promise<void> {
    this.logger.appendLine('[BatchOrganizer] Starting workspace-wide organization');

    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
      window.showWarningMessage('Mini TypeScript Hero: No workspace folder open');
      this.logger.appendLine('[BatchOrganizer] No workspace folders found');
      return;
    }

    try {
      const files = await this.findTargetFiles();

      if (files.length === 0) {
        window.showInformationMessage('Mini TypeScript Hero: No .ts/.tsx/.js/.jsx files found');
        this.logger.appendLine('[BatchOrganizer] No files found');
        return;
      }

      const result = await window.withProgress(
        {
          location: ProgressLocation.Window,
          title: 'Organizing imports',
          cancellable: true,
        },
        (progress, token) => this.processFilesWithProgress(files, progress, token),
      );

      this.showSummary(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        window.showInformationMessage('Mini TypeScript Hero: Operation cancelled');
        this.logger.appendLine('[BatchOrganizer] Operation cancelled by user');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(`Mini TypeScript Hero: Failed to organize workspace: ${errorMessage}`);
      this.logger.appendLine(`[BatchOrganizer] Error: ${errorMessage}`);
    }
  }

  /**
   * Organize imports in all TypeScript/JavaScript files in a specific folder.
   */
  async organizeFolder(folderUri: Uri): Promise<void> {
    this.logger.appendLine(`[BatchOrganizer] Starting folder organization: ${folderUri.fsPath}`);

    try {
      const files = await this.findTargetFilesInFolder(folderUri);

      if (files.length === 0) {
        window.showInformationMessage('Mini TypeScript Hero: No .ts/.tsx/.js/.jsx files found in folder');
        this.logger.appendLine('[BatchOrganizer] No files found in folder');
        return;
      }

      const result = await window.withProgress(
        {
          location: ProgressLocation.Window,
          title: 'Organizing imports in folder',
          cancellable: true,
        },
        (progress, token) => this.processFilesWithProgress(files, progress, token),
      );

      this.showSummary(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        window.showInformationMessage('Mini TypeScript Hero: Operation cancelled');
        this.logger.appendLine('[BatchOrganizer] Operation cancelled by user');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      window.showErrorMessage(`Mini TypeScript Hero: Failed to organize folder: ${errorMessage}`);
      this.logger.appendLine(`[BatchOrganizer] Error: ${errorMessage}`);
    }
  }

  /**
   * Find all TypeScript/JavaScript files in the workspace.
   */
  private async findTargetFiles(): Promise<Uri[]> {
    const include = '**/*.{ts,tsx,js,jsx}';
    const exclude = this.getExcludePattern();

    this.logger.appendLine(`[BatchOrganizer] Searching workspace: ${include}`);
    this.logger.appendLine(`[BatchOrganizer] Excluding: ${exclude}`);

    const files = await workspace.findFiles(include, exclude, 5000);
    this.logger.appendLine(`[BatchOrganizer] Found ${files.length} files`);

    return files;
  }

  /**
   * Find all TypeScript/JavaScript files in a specific folder.
   */
  private async findTargetFilesInFolder(folderUri: Uri): Promise<Uri[]> {
    // Get folder path relative to workspace
    const workspaceFolder = workspace.getWorkspaceFolder(folderUri);
    if (!workspaceFolder) {
      throw new Error('Folder is not in workspace');
    }

    // Calculate relative path from workspace root to folder
    const relativePath = folderUri.fsPath.substring(workspaceFolder.uri.fsPath.length + 1);
    // Handle case where folder IS the workspace root (relative path is empty)
    const include = relativePath
      ? `${relativePath}/**/*.{ts,tsx,js,jsx}`
      : '**/*.{ts,tsx,js,jsx}';
    const exclude = this.getExcludePattern();

    this.logger.appendLine(`[BatchOrganizer] Searching folder: ${include}`);
    this.logger.appendLine(`[BatchOrganizer] Excluding: ${exclude}`);

    const files = await workspace.findFiles(include, exclude, 5000);
    this.logger.appendLine(`[BatchOrganizer] Found ${files.length} files in folder`);

    return files;
  }

  /**
   * Get the exclude pattern for file search.
   * Excludes common build and dependency directories.
   */
  private getExcludePattern(): string {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/coverage/**',
      '**/.vscode-test/**',
    ].join(',');
  }

  /**
   * Process files with progress tracking and cancellation support.
   * Uses two-phase approach: analyze all files, then apply edits atomically.
   */
  private async processFilesWithProgress(
    files: Uri[],
    progress: Progress<{ message?: string; increment?: number }>,
    token: CancellationToken,
  ): Promise<BatchResult> {
    let processed = 0;
    let errors = 0;
    let skipped = 0;
    const workspaceEdit = new WorkspaceEdit();

    // Phase 1: Analyze all files and generate edits (0-70% of progress)
    this.logger.appendLine('[BatchOrganizer] Phase 1: Analyzing files...');

    for (let i = 0; i < files.length; i++) {
      if (token.isCancellationRequested) {
        throw new Error('Operation cancelled by user');
      }

      const fileUri = files[i];
      const fileName = fileUri.fsPath.split('/').pop() || fileUri.fsPath;

      try {
        const doc = await workspace.openTextDocument(fileUri);

        // Skip if not a supported language
        if (!this.isSupportedLanguage(doc.languageId)) {
          skipped++;
          this.logger.appendLine(`[BatchOrganizer] Skipped (unsupported): ${fileUri.fsPath}`);
          continue;
        }

        const manager = new ImportManager(doc, this.config);
        const edits: TextEdit[] = await manager.organizeImports();

        if (edits.length > 0) {
          workspaceEdit.set(fileUri, edits);
          this.logger.appendLine(`[BatchOrganizer] Will modify: ${fileUri.fsPath}`);
        } else {
          this.logger.appendLine(`[BatchOrganizer] No changes needed: ${fileUri.fsPath}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.appendLine(`[BatchOrganizer] Error analyzing ${fileUri.fsPath}: ${errorMessage}`);
        errors++;
      }

      // Update progress (first 70% for analysis)
      progress.report({
        message: `Analyzing: ${fileName} (${i + 1}/${files.length})`,
        increment: 70 / files.length,
      });
    }

    // Check if any edits need to be applied
    const editCount = workspaceEdit.size;
    if (editCount === 0) {
      this.logger.appendLine('[BatchOrganizer] No changes needed');
      progress.report({ increment: 30 }); // Complete progress bar
      return { processed: 0, errors, skipped };
    }

    // Phase 2: Apply all edits atomically (70-100% of progress)
    this.logger.appendLine(`[BatchOrganizer] Phase 2: Applying edits to ${editCount} files...`);

    if (token.isCancellationRequested) {
      throw new Error('Operation cancelled by user');
    }

    try {
      progress.report({
        message: `Applying changes to ${editCount} files...`,
        increment: 15,
      });

      const success = await workspace.applyEdit(workspaceEdit);

      if (success) {
        processed = editCount;
        this.logger.appendLine(`[BatchOrganizer] Successfully applied edits to ${processed} files`);
      } else {
        window.showErrorMessage('Mini TypeScript Hero: Failed to apply some edits');
        this.logger.appendLine('[BatchOrganizer] Failed to apply edits');
        errors++;
      }

      progress.report({
        message: `Done! Organized ${processed} files`,
        increment: 15,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.appendLine(`[BatchOrganizer] Error applying edits: ${errorMessage}`);
      errors++;
    }

    return { processed, errors, skipped };
  }

  /**
   * Show summary notification to user.
   */
  private showSummary(result: BatchResult): void {
    const { processed, errors, skipped } = result;

    if (errors === 0 && skipped === 0) {
      const message = processed === 0
        ? 'No changes needed'
        : `Organized ${processed} ${processed === 1 ? 'file' : 'files'}`;
      window.showInformationMessage(`Mini TypeScript Hero: ${message}`);
      this.logger.appendLine(`[BatchOrganizer] Completed: ${message}`);
    } else if (errors === 0) {
      const message = `Organized ${processed} ${processed === 1 ? 'file' : 'files'} (${skipped} skipped)`;
      window.showInformationMessage(`Mini TypeScript Hero: ${message}`);
      this.logger.appendLine(`[BatchOrganizer] Completed: ${message}`);
    } else {
      const message = `Organized ${processed} ${processed === 1 ? 'file' : 'files'} (${errors} ${errors === 1 ? 'error' : 'errors'}, ${skipped} skipped)`;
      window.showWarningMessage(`Mini TypeScript Hero: ${message}`);
      this.logger.appendLine(`[BatchOrganizer] Completed with errors: ${message}`);
    }
  }

  /**
   * Check if the language is supported (TypeScript, JavaScript, TSX, JSX).
   */
  private isSupportedLanguage(languageId: string): boolean {
    return ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(languageId);
  }
}
