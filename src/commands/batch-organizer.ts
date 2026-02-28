import {
  CancellationToken,
  OutputChannel,
  Progress,
  ProgressLocation,
  RelativePattern,
  TextEdit,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from 'vscode';

import { minimatch } from 'minimatch';

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

      // Warn user about large workspaces to prevent memory issues
      if (files.length > 1000) {
        const proceed = await window.showWarningMessage(
          `Mini TypeScript Hero: Found ${files.length} files. This may take a while and use significant memory. Continue?`,
          'Continue', 'Cancel'
        );
        if (proceed !== 'Continue') {
          this.logger.appendLine(`[BatchOrganizer] User cancelled operation with ${files.length} files`);
          return;
        }
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

    this.logger.appendLine(`[BatchOrganizer] Searching workspace: ${include}`);

    // Find all files (VS Code respects files.exclude by default)
    const allFiles = await workspace.findFiles(include, null);

    // Manually filter files using exclude patterns
    // IMPORTANT: Get excludePatterns per file based on its workspace folder
    // (multi-root workspaces can have different settings per root)
    const files = allFiles.filter(fileUri => !this.isFileExcludedInWorkspace(fileUri));

    this.logger.appendLine(`[BatchOrganizer] Found ${files.length} files (${allFiles.length - files.length} excluded)`);

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
    // Normalize to forward slashes for glob matching (Windows uses backslashes)
    const relativePath = folderUri.fsPath
      .substring(workspaceFolder.uri.fsPath.length + 1)
      .replace(/\\/g, '/');
    // Handle case where folder IS the workspace root (relative path is empty)
    const includeGlob = relativePath
      ? `${relativePath}/**/*.{ts,tsx,js,jsx}`
      : '**/*.{ts,tsx,js,jsx}';
    const excludePatterns = this.getExcludePatterns(workspaceFolder.uri);

    this.logger.appendLine(`[BatchOrganizer] Searching folder: ${includeGlob}`);
    this.logger.appendLine(`[BatchOrganizer] Excluding: ${excludePatterns.join(', ')}`);

    // Use RelativePattern to scope findFiles to the specific workspace folder
    // (plain string patterns search across ALL workspace roots in multi-root workspaces)
    const include = new RelativePattern(workspaceFolder, includeGlob);
    const allFiles = await workspace.findFiles(include, null);

    // Manually filter files using exclude patterns
    const files = allFiles.filter(fileUri => !this.isFileExcluded(fileUri, excludePatterns));

    this.logger.appendLine(`[BatchOrganizer] Found ${files.length} files in folder (${allFiles.length - files.length} excluded)`);

    return files;
  }

  /**
   * Get all exclude patterns (defaults + user-configured).
   * Returns an array of glob patterns.
   */
  private getExcludePatterns(resource?: Uri): string[] {
    const defaults = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.git/**',
      '**/coverage/**',
    ];

    // Add user-configured patterns (if resource is available)
    const userPatterns = resource ? this.config.excludePatterns(resource) : [];
    return [...defaults, ...userPatterns];
  }

  /**
   * Check if a file should be excluded in a multi-root workspace.
   * Gets excludePatterns from the file's specific workspace folder.
   * Use this for workspace-wide operations (organizeWorkspace).
   */
  private isFileExcludedInWorkspace(fileUri: Uri): boolean {
    const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) {
      // File not in workspace - don't exclude
      return false;
    }

    // Get excludePatterns for THIS file's workspace folder
    const excludePatterns = this.getExcludePatterns(workspaceFolder.uri);

    // Convert file URI to path relative to workspace root
    // Normalize to forward slashes for glob matching (Windows uses backslashes)
    const relativePath = fileUri.fsPath
      .substring(workspaceFolder.uri.fsPath.length + 1)
      .replace(/\\/g, '/');

    // Check if file matches any exclude pattern
    for (const pattern of excludePatterns) {
      if (minimatch(relativePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a file should be excluded based on exclude patterns.
   * Matches file path relative to workspace root against glob patterns.
   * Use this for folder-specific operations (organizeFolder) where patterns are pre-fetched.
   */
  private isFileExcluded(fileUri: Uri, excludePatterns: string[]): boolean {
    const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) {
      // File not in workspace - don't exclude
      return false;
    }

    // Convert file URI to path relative to workspace root
    // Normalize to forward slashes for glob matching (Windows uses backslashes)
    const relativePath = fileUri.fsPath
      .substring(workspaceFolder.uri.fsPath.length + 1)
      .replace(/\\/g, '/');

    // Check if file matches any exclude pattern
    for (const pattern of excludePatterns) {
      if (minimatch(relativePath, pattern)) {
        return true;
      }
    }

    return false;
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
      const fileName = fileUri.path.split('/').pop() || fileUri.fsPath;

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

        // CRITICAL: Save all modified documents to disk!
        // workspace.applyEdit() only modifies in-memory documents, doesn't save!
        //
        // NOTE: We must explicitly open each document because workspace.textDocuments
        // has lazy loading behavior - it only contains documents that have been "activated".
        // See: https://github.com/microsoft/vscode/issues/33546
        // See: https://github.com/microsoft/vscode/issues/38665
        const saveFailed: string[] = [];
        let savedCount = 0;
        for (const [fileUri] of workspaceEdit.entries()) {
          try {
            // Explicitly open the document to ensure it's in memory
            const doc = await workspace.openTextDocument(fileUri);
            if (!doc.isUntitled && doc.isDirty) {
              await doc.save();
              savedCount++;
            }
          } catch (saveError) {
            saveFailed.push(fileUri.fsPath);
            errors++;
            this.logger.appendLine(`[BatchOrganizer] Failed to save ${fileUri.fsPath}: ${saveError}`);
          }
        }
        if (saveFailed.length > 0) {
          window.showWarningMessage(`Mini TypeScript Hero: Failed to save ${saveFailed.length} file(s). Check output for details.`);
        }
        this.logger.appendLine(`[BatchOrganizer] Saved ${savedCount} files to disk`);
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
