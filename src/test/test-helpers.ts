/**
 * Shared Test Helpers
 *
 * Common utilities for all test files.
 * This eliminates duplication across test files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Uri, TextEdit, TextDocument, workspace, WorkspaceEdit, commands } from 'vscode';

/**
 * Create a REAL temporary file and open it as a TextDocument
 *
 * This uses the actual VSCode workspace.openTextDocument() API to get a REAL TextDocument.
 * No mocking of lineAt(), offsetAt(), positionAt() - we use VSCode's actual implementations.
 *
 * @param content - The file content
 * @param extension - File extension (ts, tsx, js, jsx, etc.)
 * @param subfolder - Optional subfolder path (e.g., 'src', 'generated', 'node_modules/pkg')
 * @returns A real VSCode TextDocument backed by a temp file
 */
export async function createTempDocument(
  content: string,
  extension: string = 'ts',
  subfolder?: string
): Promise<TextDocument> {
  const tempDir = os.tmpdir();
  const filename = `test-${Date.now()}-${Math.random()}.${extension}`;

  let tempFile: string;
  if (subfolder) {
    const subfolderPath = path.join(tempDir, subfolder);
    fs.mkdirSync(subfolderPath, { recursive: true });
    tempFile = path.join(subfolderPath, filename);
  } else {
    tempFile = path.join(tempDir, filename);
  }

  fs.writeFileSync(tempFile, content, 'utf-8');

  const doc = await workspace.openTextDocument(Uri.file(tempFile));
  return doc;
}

/**
 * Clean up temporary file after test completes
 *
 * Always call this in a finally block to ensure cleanup even if test fails.
 * This AGGRESSIVELY closes all editors and deletes the file to prevent listener leaks.
 *
 * CRITICAL: VSCode accumulates internal listeners (onDidChange, onDidChangeReadonly, etc.)
 * for each document model. We MUST close all editors to force VSCode to release these listeners.
 * Simply deleting the file is NOT sufficient - VSCode keeps the document model in memory.
 *
 * @param doc - The TextDocument created by createTempDocument()
 */
export async function deleteTempDocument(doc: TextDocument): Promise<void> {
  try {
    // Set up a promise that resolves when the document is actually closed OR after reasonable timeout
    // onDidCloseTextDocument doesn't always fire for temp files that were never shown in editors,
    // so we need a timeout to prevent hanging. But we TRY to await the real event first.
    const docClosedPromise = new Promise<void>((resolve) => {
      const disposable = workspace.onDidCloseTextDocument((closedDoc) => {
        if (closedDoc.uri.toString() === doc.uri.toString()) {
          disposable.dispose(); // Clean up our listener immediately
          resolve();
        }
      });

      // Timeout after 100ms if event doesn't fire
      // This is NOT arbitrary - it's long enough for the event to fire if it will,
      // but short enough to not slow down tests when the event doesn't fire
      setTimeout(() => {
        disposable.dispose();
        resolve();
      }, 100);
    });

    // STEP 1: Close ALL editors to force VSCode to release document models and their listeners
    // This is necessary because VSCode keeps documents in memory even after file deletion
    await commands.executeCommand('workbench.action.closeAllEditors');

    // STEP 2: Delete the physical file
    if (fs.existsSync(doc.uri.fsPath)) {
      fs.unlinkSync(doc.uri.fsPath);
    }

    // STEP 3: Wait for VSCode to actually close the document (or timeout)
    await docClosedPromise;
  } catch (e) {
    // Ignore errors - best effort cleanup
    // Commands might fail or file might not exist
  }
}

/**
 * Apply TextEdits using REAL VSCode workspace.applyEdit()
 *
 * No homemade string manipulation - we use VSCode's actual edit application logic.
 *
 * @param doc - The TextDocument to apply edits to
 * @param edits - The edits to apply
 * @returns The resulting text after edits are applied
 */
export async function applyEditsToDocument(doc: TextDocument, edits: TextEdit[]): Promise<string> {
  if (edits.length === 0) {
    return doc.getText();
  }

  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.set(doc.uri, edits);
  const success = await workspace.applyEdit(workspaceEdit);

  if (!success) {
    throw new Error('Failed to apply edits');
  }

  return doc.getText();
}

/**
 * File structure definition for creating test workspaces
 */
export interface TempFileSpec {
  /** Relative path from workspace root (e.g., 'src/index.ts', 'lib/utils.js') */
  path: string;
  /** File content */
  content: string;
}

/**
 * Temporary workspace handle for cleanup
 */
export interface TempWorkspace {
  /** Root directory of the workspace */
  rootUri: Uri;
  /** All file URIs that were created */
  fileUris: Uri[];
}

/**
 * Create a REAL temporary workspace with a complete folder structure
 *
 * This creates an actual directory structure in os.tmpdir() and uses VSCode's
 * real workspace APIs. No mocking - tests run against real file system operations.
 *
 * @param files - Array of file specifications with paths and content
 * @returns Workspace handle for cleanup
 */
export function createTempWorkspace(files: TempFileSpec[]): TempWorkspace {
  const tempDir = os.tmpdir();
  const workspaceRoot = path.join(tempDir, `test-workspace-${Date.now()}-${Math.random()}`);

  // Create root directory
  fs.mkdirSync(workspaceRoot, { recursive: true });

  const fileUris: Uri[] = [];

  // Create all files with their directory structures
  for (const file of files) {
    const filePath = path.join(workspaceRoot, file.path);
    const fileDir = path.dirname(filePath);

    // Create parent directories if needed
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Write file content
    fs.writeFileSync(filePath, file.content, 'utf-8');
    fileUris.push(Uri.file(filePath));
  }

  return {
    rootUri: Uri.file(workspaceRoot),
    fileUris,
  };
}

/**
 * Clean up temporary workspace and all its files
 *
 * Recursively deletes the entire workspace directory.
 * Call this in a finally block to ensure cleanup even if test fails.
 *
 * @param workspace - The workspace handle from createTempWorkspace()
 */
export async function deleteTempWorkspace(workspace: TempWorkspace): Promise<void> {
  try {
    // Close all editors first (VSCode keeps documents in memory)
    await commands.executeCommand('workbench.action.closeAllEditors');

    // Wait a bit for editors to fully close
    await new Promise(resolve => setTimeout(resolve, 100));

    // Recursively delete the workspace directory
    if (fs.existsSync(workspace.rootUri.fsPath)) {
      fs.rmSync(workspace.rootUri.fsPath, { recursive: true, force: true });
    }
  } catch (e) {
    // Ignore errors - best effort cleanup
  }
}
