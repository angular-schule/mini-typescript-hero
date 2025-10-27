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
 * @returns A real VSCode TextDocument backed by a temp file
 */
export async function createTempDocument(content: string, extension: string = 'ts'): Promise<TextDocument> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random()}.${extension}`);
  fs.writeFileSync(tempFile, content, 'utf-8');

  const doc = await workspace.openTextDocument(Uri.file(tempFile));
  return doc;
}

/**
 * Clean up temporary file after test completes
 *
 * Always call this in a finally block to ensure cleanup even if test fails.
 * This properly closes the document in VSCode AND deletes the file to prevent listener leaks.
 *
 * @param doc - The TextDocument created by createTempDocument()
 */
export async function deleteTempDocument(doc: TextDocument): Promise<void> {
  try {
    // Close the document in VSCode to release listeners
    // Use workbench.action.closeAllEditors to close all open editors/documents
    // This is more reliable than trying to close individual documents
    await commands.executeCommand('workbench.action.closeAllEditors');

    // Delete the physical file
    fs.unlinkSync(doc.uri.fsPath);
  } catch (e) {
    // Ignore errors - best effort cleanup
    // Document might already be closed or file might not exist
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
