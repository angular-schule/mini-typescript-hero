/**
 * Performance & Scale Tests
 *
 * Purpose: Verify the extension handles large files efficiently:
 * - Files with 200+ imports
 * - Deterministic output
 * - Reasonable execution time
 * - No memory leaks or timeouts
 */

import * as assert from 'assert';
import { ImportManager } from '../../src/imports/import-manager';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';
import { ImportsConfig } from '../../src/configuration';

suite('Performance & Large File Handling', () => {
  test('Handles 200 imports correctly and deterministically', async function () {
    // Increase timeout for large file processing
    this.timeout(10000);

    // Generate a large file with 200 imports across different groups
    const imports: string[] = [];

    // 100 external module imports
    for (let i = 0; i < 100; i++) {
      imports.push(`import { Module${i}A, Module${i}B } from '@company/module-${i}';`);
    }

    // 100 workspace imports
    for (let i = 0; i < 100; i++) {
      imports.push(`import { File${i}A, File${i}B } from './utils/file-${i}';`);
    }

    // Shuffle to make it realistic (imports not pre-sorted)
    const shuffled = [...imports].sort(() => Math.random() - 0.5);

    // Add usage for all imports (prevent removal)
    const usage: string[] = [];
    for (let i = 0; i < 100; i++) {
      usage.push(`const m${i}a = Module${i}A; const m${i}b = Module${i}B;`);
    }
    for (let i = 0; i < 100; i++) {
      usage.push(`const f${i}a = File${i}A; const f${i}b = File${i}B;`);
    }

    const input = shuffled.join('\n') + '\n\n' + usage.join('\n') + '\n';

    const doc = await createTempDocument(input, 'ts');

    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);

      const edits = await manager.organizeImports();

      // Apply edits
      const result = await applyEditsToDocument(doc, edits);

      // Verify correctness: all imports should be present
      assert.ok(result.includes('Module0A'), 'Should have first module import');
      assert.ok(result.includes('Module99B'), 'Should have last module import');
      assert.ok(result.includes('File0A'), 'Should have first file import');
      assert.ok(result.includes('File99B'), 'Should have last file import');

      // Verify grouping: modules before workspace
      const firstModuleIdx = result.indexOf('@company/module-');
      const firstWorkspaceIdx = result.indexOf('./utils/file-');
      assert.ok(firstModuleIdx < firstWorkspaceIdx, 'Modules should come before workspace imports');

      // Count imports to ensure none were lost
      const importCount = (result.match(/^import /gm) || []).length;
      assert.strictEqual(importCount, 200, 'Should have exactly 200 imports');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Deterministic output with large file (idempotent)', async function () {
    this.timeout(10000);

    // Generate a moderately large file
    const imports: string[] = [];
    for (let i = 0; i < 50; i++) {
      imports.push(`import { Item${i} } from './items/item-${i}';`);
    }

    const shuffled = [...imports].sort(() => Math.random() - 0.5);
    const usage = imports.map((_, i) => `const item${i} = Item${i};`).join('\n');
    const input = shuffled.join('\n') + '\n\n' + usage + '\n';

    const doc = await createTempDocument(input, 'ts');

    try {
      const config = new ImportsConfig();

      // Run organize twice
      const manager1 = new ImportManager(doc, config);
      const edits1 = await manager1.organizeImports();
      const result1 = await applyEditsToDocument(doc, edits1);

      // Run organize again on the already-organized output
      const manager2 = new ImportManager(doc, config);
      const edits2 = await manager2.organizeImports();
      const result2 = await applyEditsToDocument(doc, edits2);

      // Should be idempotent - second run produces same output
      assert.strictEqual(result1, result2, 'Output should be deterministic and idempotent');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Handles deeply nested path structures', async () => {
    const input = `import { A } from './a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/file-a';
import { B } from './a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/q/file-b';
import { C } from './a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/r/file-c';

const a = A;
const b = B;
const c = C;
`;

    const doc = await createTempDocument(input, 'ts');

    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      // Should not crash with deeply nested paths
      const result = await applyEditsToDocument(doc, edits);

      assert.ok(result.includes('file-a'), 'Should handle deep path A');
      assert.ok(result.includes('file-b'), 'Should handle deep path B');
      assert.ok(result.includes('file-c'), 'Should handle deep path C');

      // Verify sorting
      const idxA = result.indexOf('file-a');
      const idxB = result.indexOf('file-b');
      const idxC = result.indexOf('file-c');
      assert.ok(idxA < idxB && idxB < idxC, 'Should be sorted correctly despite deep nesting');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('Handles many specifiers in single import', async () => {
    // Generate import with 100 specifiers
    const specifiers: string[] = [];
    for (let i = 0; i < 100; i++) {
      specifiers.push(`Item${i}`);
    }

    const input = `import { ${specifiers.join(', ')} } from './items';

${specifiers.map((s, i) => `const item${i} = ${s};`).join('\n')}
`;

    const doc = await createTempDocument(input, 'ts');

    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const result = await applyEditsToDocument(doc, edits);

      // Should handle multiline wrapping for many specifiers
      assert.ok(result.includes('Item0'), 'Should have first specifier');
      assert.ok(result.includes('Item99'), 'Should have last specifier');

      // Specifiers should be sorted
      const item0Idx = result.indexOf('Item0');
      const item99Idx = result.indexOf('Item99');
      assert.ok(item0Idx < item99Idx, 'Specifiers should be sorted');
    } finally {
      await deleteTempDocument(doc);
    }
  });
});
