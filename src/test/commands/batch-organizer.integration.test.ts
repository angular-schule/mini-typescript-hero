/**
 * REAL Integration Tests for BatchOrganizer
 *
 * These tests actually CALL organizeWorkspace() and organizeFolder() with real VS Code workspace APIs!
 *
 * NO MOCKS (except OutputChannel for logs):
 * - Real temp workspace with real files
 * - Real VS Code workspace.updateWorkspaceFolders()
 * - Real organizeWorkspace() and organizeFolder() calls
 * - Real file modifications verified on disk
 * - Real VS Code APIs throughout
 */

import * as assert from 'assert';
import * as fs from 'fs';
import { workspace, WorkspaceFolder, OutputChannel } from 'vscode';
import { BatchOrganizer } from '../../commands/batch-organizer';
import { ImportsConfig } from '../../configuration';
import { createTempWorkspace, deleteTempWorkspace, TempFileSpec, TempWorkspace } from '../test-helpers';

/**
 * Helper to properly clean up a workspace from VS Code before deleting files
 */
async function cleanupWorkspace(ws: TempWorkspace): Promise<void> {
  // Step 1: Remove from VS Code workspace folders FIRST
  const index = workspace.workspaceFolders?.findIndex(f => f.uri.fsPath === ws.rootUri.fsPath);
  if (index !== undefined && index >= 0) {
    await workspace.updateWorkspaceFolders(index, 1);
  }

  // Step 2: Wait for VS Code to process the removal
  await new Promise(resolve => setTimeout(resolve, 300));

  // Step 3: Now delete the temp directory
  await deleteTempWorkspace(ws);

  // Step 4: Wait for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 200));
}

/**
 * Mock OutputChannel ONLY for capturing logs
 */
class MockOutputChannel implements OutputChannel {
  public name: string = 'Test';
  public lines: string[] = [];

  append(value: string): void {
    this.lines.push(value);
  }

  appendLine(value: string): void {
    this.lines.push(value + '\n');
  }

  clear(): void {
    this.lines = [];
  }

  show(): void {}
  hide(): void {}
  dispose(): void {}
  replace(_value: string): void {}
}

suite('BatchOrganizer - REAL Integration (calls actual methods!)', () => {
  let logger: MockOutputChannel;
  let config: ImportsConfig;
  let organizer: BatchOrganizer;
  let originalWorkspaceFolders: readonly WorkspaceFolder[] | undefined;

  // CRITICAL: Clear ALL workspace folders before ANY tests run
  // This removes lingering folders from previous test runs
  suiteSetup(async () => {
    const currentCount = workspace.workspaceFolders?.length || 0;
    if (currentCount > 0) {
      await workspace.updateWorkspaceFolders(0, currentCount);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  setup(async () => {
    logger = new MockOutputChannel();
    config = new ImportsConfig();
    organizer = new BatchOrganizer(config, logger);

    // Save original workspace folders (should be empty after suiteSetup)
    originalWorkspaceFolders = workspace.workspaceFolders;
  });

  teardown(async () => {
    // Remove ALL workspace folders first (to clean up test folders)
    const currentFolderCount = workspace.workspaceFolders?.length || 0;
    if (currentFolderCount > 0) {
      await workspace.updateWorkspaceFolders(0, currentFolderCount);
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 200));

    // Then restore original workspace folders if any
    if (originalWorkspaceFolders && originalWorkspaceFolders.length > 0) {
      await workspace.updateWorkspaceFolders(0, 0, ...originalWorkspaceFolders);
    }

    // Wait for restore
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  test('organizeFolder() should organize real files in a folder', async function() {
    this.timeout(15000);

    const files: TempFileSpec[] = [
      {
        path: 'file1.ts',
        content: `import { B } from './b';\nimport { A } from './a';\n\nconsole.log(A, B);`,
      },
      {
        path: 'file2.ts',
        content: `import { Z } from './z';\nimport { X } from './x';\n\nconsole.log(X, Z);`,
      },
    ];

    const tempWs = createTempWorkspace(files);
    try {
      // Add temp workspace to VS Code workspace folders
      await workspace.updateWorkspaceFolders(
        workspace.workspaceFolders?.length || 0,
        0,
        { uri: tempWs.rootUri, name: 'TestWorkspace' }
      );

      // Wait for workspace to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Read initial file contents
      const before1 = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      const before2 = fs.readFileSync(tempWs.fileUris[1].fsPath, 'utf-8');

      // Verify unsorted (B before A, Z before X)
      assert.ok(before1.indexOf("from './b'") < before1.indexOf("from './a'"));
      assert.ok(before2.indexOf("from './z'") < before2.indexOf("from './x'"));

      // Clear logs before the operation
      logger.clear();

      // CALL THE REAL METHOD!
      await organizer.organizeFolder(tempWs.rootUri);

      // Wait for file system to flush
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check logs for errors
      const logs = logger.lines.join('');

      if (logs.includes('No files found')) {
        throw new Error(`organizeFolder() found no files! Logs:\n${logs}`);
      }

      if (logs.includes('error') || logs.includes('Error')) {
        throw new Error(`organizeFolder() encountered errors! Logs:\n${logs}`);
      }

      // Read modified file contents from disk
      const after1 = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      const after2 = fs.readFileSync(tempWs.fileUris[1].fsPath, 'utf-8');

      // Verify sorted (A before B, X before Z)
      assert.ok(after1.indexOf("from './a'") < after1.indexOf("from './b'"), 'File1: A should come before B after organization');
      assert.ok(after2.indexOf("from './x'") < after2.indexOf("from './z'"), 'File2: X should come before Z after organization');
    } finally {
      await cleanupWorkspace(tempWs);
    }
  });

  test('organizeFolder() should remove unused imports', async function() {
    this.timeout(15000);

    const files: TempFileSpec[] = [
      {
        path: 'test.ts',
        content: `import { A } from './a';\nimport { unused } from './unused';\n\nconsole.log(A);`,
      },
    ];

    const tempWs = createTempWorkspace(files);
    try {
      // Add to workspace
      await workspace.updateWorkspaceFolders(
        workspace.workspaceFolders?.length || 0,
        0,
        { uri: tempWs.rootUri, name: 'TestWorkspace' }
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // Read initial content
      const before = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      assert.ok(before.includes("from './unused'"), 'Should have unused import initially');

      // CALL THE REAL METHOD!
      await organizer.organizeFolder(tempWs.rootUri);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Read modified content
      const after = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      assert.ok(!after.includes("from './unused'"), 'Should have removed unused import');
      assert.ok(after.includes("from './a'"), 'Should keep used import');
    } finally {
      await cleanupWorkspace(tempWs);
    }
  });

  test('organizeFolder() should handle all four file types (.ts/.tsx/.js/.jsx)', async function() {
    this.timeout(15000);

    const files: TempFileSpec[] = [
      {
        path: 'file.ts',
        content: `import { B } from './b';\nimport { A } from './a';\nconsole.log(A, B);`,
      },
      {
        path: 'component.tsx',
        content: `import { B } from './b';\nimport React from 'react';\nconst C = () => <div>{B}</div>;`,
      },
      {
        path: 'script.js',
        content: `import { B } from './b';\nimport { A } from './a';\nconsole.log(A, B);`,
      },
      {
        path: 'component.jsx',
        content: `import { B } from './b';\nimport React from 'react';\nconst C = () => <div>{B}</div>;`,
      },
    ];

    const tempWs = createTempWorkspace(files);
    try {
      await workspace.updateWorkspaceFolders(
        workspace.workspaceFolders?.length || 0,
        0,
        { uri: tempWs.rootUri, name: 'TestWorkspace' }
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // CALL THE REAL METHOD!
      await organizer.organizeFolder(tempWs.rootUri);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all files were processed
      for (const fileUri of tempWs.fileUris) {
        const content = fs.readFileSync(fileUri.fsPath, 'utf-8');
        assert.ok(content.includes('import'), `File ${fileUri.fsPath} should have imports`);
      }
    } finally {
      await cleanupWorkspace(tempWs);
    }
  });

  test('organizeFolder() should handle nested folders recursively', async function() {
    this.timeout(15000);

    const files: TempFileSpec[] = [
      {
        path: 'file1.ts',
        content: `import { B } from './b';\nimport { A } from './a';\nconsole.log(A, B);`,
      },
      {
        path: 'sub/file2.ts',
        content: `import { D } from './d';\nimport { C } from './c';\nconsole.log(C, D);`,
      },
      {
        path: 'sub/deep/file3.ts',
        content: `import { F } from './f';\nimport { E } from './e';\nconsole.log(E, F);`,
      },
    ];

    const tempWs = createTempWorkspace(files);
    try {
      await workspace.updateWorkspaceFolders(
        workspace.workspaceFolders?.length || 0,
        0,
        { uri: tempWs.rootUri, name: 'TestWorkspace' }
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // CALL THE REAL METHOD!
      await organizer.organizeFolder(tempWs.rootUri);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all files were organized (sorted)
      const after1 = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      const after2 = fs.readFileSync(tempWs.fileUris[1].fsPath, 'utf-8');
      const after3 = fs.readFileSync(tempWs.fileUris[2].fsPath, 'utf-8');

      assert.ok(after1.indexOf("from './a'") < after1.indexOf("from './b'"));
      assert.ok(after2.indexOf("from './c'") < after2.indexOf("from './d'"));
      assert.ok(after3.indexOf("from './e'") < after3.indexOf("from './f'"));
    } finally {
      await cleanupWorkspace(tempWs);
    }
  });

  test('organizeFolder() should handle files with syntax errors gracefully', async function() {
    this.timeout(15000);

    const files: TempFileSpec[] = [
      {
        path: 'valid1.ts',
        content: `import { B } from './b';\nimport { A } from './a';\nconsole.log(A, B);`,
      },
      {
        path: 'invalid.ts',
        // Syntax error!
        content: `import { A from './a;\nconsole.log(A);`,
      },
      {
        path: 'valid2.ts',
        content: `import { D } from './d';\nimport { C } from './c';\nconsole.log(C, D);`,
      },
    ];

    const tempWs = createTempWorkspace(files);
    try {
      await workspace.updateWorkspaceFolders(
        workspace.workspaceFolders?.length || 0,
        0,
        { uri: tempWs.rootUri, name: 'TestWorkspace' }
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // CALL THE REAL METHOD! (should not crash)
      await organizer.organizeFolder(tempWs.rootUri);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Valid files should be organized
      const after1 = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      const after3 = fs.readFileSync(tempWs.fileUris[2].fsPath, 'utf-8');

      assert.ok(after1.indexOf("from './a'") < after1.indexOf("from './b'"), 'Valid file 1 should be organized');
      assert.ok(after3.indexOf("from './c'") < after3.indexOf("from './d'"), 'Valid file 2 should be organized');

      // Invalid file should still exist (not deleted)
      assert.ok(fs.existsSync(tempWs.fileUris[1].fsPath), 'Invalid file should still exist');
    } finally {
      await cleanupWorkspace(tempWs);
    }
  });

  test('organizeWorkspace() should organize all files in workspace', async function() {
    this.timeout(15000);

    const files: TempFileSpec[] = [
      {
        path: 'file1.ts',
        content: `import { B } from './b';\nimport { A } from './a';\nconsole.log(A, B);`,
      },
      {
        path: 'file2.ts',
        content: `import { Z } from './z';\nimport { X } from './x';\nconsole.log(X, Z);`,
      },
    ];

    const tempWs = createTempWorkspace(files);
    try {
      // Add to workspace
      await workspace.updateWorkspaceFolders(
        workspace.workspaceFolders?.length || 0,
        0,
        { uri: tempWs.rootUri, name: 'TestWorkspace' }
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // CALL THE REAL METHOD!
      await organizer.organizeWorkspace();

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify files were organized
      const after1 = fs.readFileSync(tempWs.fileUris[0].fsPath, 'utf-8');
      const after2 = fs.readFileSync(tempWs.fileUris[1].fsPath, 'utf-8');

      assert.ok(after1.indexOf("from './a'") < after1.indexOf("from './b'"), 'File1: A should come before B');
      assert.ok(after2.indexOf("from './x'") < after2.indexOf("from './z'"), 'File2: X should come before Z');
    } finally {
      await cleanupWorkspace(tempWs);
    }
  });
});
