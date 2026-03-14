/**
 * Settings Independence Matrix Tests
 *
 * Purpose: Systematically verify that settings are truly independent and don't
 * conflate with each other. This prevents bugs like "disableImportRemovalOnOrganize
 * also disables specifier sorting" (which we fixed).
 *
 * Strategy: Test key combinations of boolean settings and assert specific invariants
 * that must hold regardless of other settings.
 */

import * as assert from 'assert';
import { Uri } from 'vscode';
import { ImportManager } from '../../src/imports/import-manager';
import { ImportsConfig } from '../../src/configuration';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';

/**
 * Test config that overrides specific settings for matrix testing
 */
class TestConfig extends ImportsConfig {
  constructor(private overrides: Partial<{
    disableImportsSorting: boolean;
    disableImportRemovalOnOrganize: boolean;
    legacyMode: boolean;
    mergeImportsFromSameModule: boolean;
    organizeSortsByFirstSpecifier: boolean;
  }> = {}) {
    super();
  }

  public override disableImportsSorting(_resource: Uri): boolean {
    return this.overrides.disableImportsSorting ?? false;
  }

  public override disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return this.overrides.disableImportRemovalOnOrganize ?? false;
  }

  public override legacyMode(_resource: Uri): boolean {
    return this.overrides.legacyMode ?? false;
  }

  public override mergeImportsFromSameModule(_resource: Uri): boolean {
    return this.overrides.mergeImportsFromSameModule ?? true;
  }

  public override organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return this.overrides.organizeSortsByFirstSpecifier ?? false;
  }
}

suite('Settings Independence Matrix', () => {
  /**
   * INVARIANT 1: Specifier sorting ALWAYS happens (unless we add disableSpecifierSorting)
   * This must be true regardless of:
   * - disableImportsSorting
   * - disableImportRemovalOnOrganize
   * - organizeSortsByFirstSpecifier
   * - mergeImportsFromSameModule
   * - legacyMode
   */
  suite('Invariant: Specifier Sorting Always Active', () => {
    const testCases: Array<{
      name: string;
      disableImportsSorting?: boolean;
      disableImportRemovalOnOrganize?: boolean;
      legacyMode?: boolean;
    }> = [
      { name: 'all defaults' },
      { name: 'disableImportsSorting=true', disableImportsSorting: true },
      { name: 'disableImportRemovalOnOrganize=true', disableImportRemovalOnOrganize: true },
      { name: 'legacyMode=true', legacyMode: true },
      {
        name: 'all disabled',
        disableImportsSorting: true,
        disableImportRemovalOnOrganize: true,
        legacyMode: true,
      },
    ];

    testCases.forEach(({ name, disableImportsSorting, disableImportRemovalOnOrganize, legacyMode }) => {
      test(`Specifiers sorted: ${name}`, async () => {
        const input = `import { zoo, bar, apple } from './lib';

const a = apple;
const b = bar;
const z = zoo;
`;

        const doc = await createTempDocument(input, 'ts');

        try {
          // Override settings
          const config = new TestConfig({
            disableImportsSorting,
            disableImportRemovalOnOrganize,
            legacyMode,
          });

          const manager = new ImportManager(doc, config);
          const edits = await manager.organizeImports();
          const result = await applyEditsToDocument(doc, edits);

          // INVARIANT: Specifiers MUST be sorted alphabetically: apple, bar, zoo
          assert.ok(
            result.includes('apple, bar, zoo'),
            `Specifiers must be sorted alphabetically regardless of ${name}. Got: ${result}`
          );
        } finally {
          await deleteTempDocument(doc);
        }
      });
    });
  });

  /**
   * INVARIANT 2: Import sorting respects flags (except legacy mode silent ignores)
   */
  suite('Invariant: Import Sorting Respects disableImportsSorting', () => {
    test('Modern mode: disableImportsSorting=false → sorts imports', async () => {
      const input = `import { B } from './z-file';
import { A } from './a-file';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new TestConfig({
          disableImportsSorting: false,
          disableImportRemovalOnOrganize: true,
          legacyMode: false,
          mergeImportsFromSameModule: false,
        });

        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Imports should be sorted: a-file before z-file
        const aFileIndex = result.indexOf('./a-file');
        const zFileIndex = result.indexOf('./z-file');
        assert.ok(aFileIndex < zFileIndex, 'Imports should be sorted alphabetically');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Modern mode: disableImportsSorting=true → preserves order', async () => {
      const input = `import { B } from './z-file';
import { A } from './a-file';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new TestConfig({
          disableImportsSorting: true,
          disableImportRemovalOnOrganize: true,
          legacyMode: false,
          mergeImportsFromSameModule: false,
        });

        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Imports should preserve original order: z-file before a-file
        const aFileIndex = result.indexOf('./a-file');
        const zFileIndex = result.indexOf('./z-file');
        assert.ok(zFileIndex < aFileIndex, 'Import order should be preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Legacy mode: disableImportsSorting IGNORED → always sorts (documented bug replication)', async () => {
      const input = `import { B } from './z-file';
import { A } from './a-file';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new TestConfig({ disableImportsSorting: true, disableImportRemovalOnOrganize: true, legacyMode: true, mergeImportsFromSameModule: false });

        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Legacy mode IGNORES disableImportsSorting - always sorts
        const aFileIndex = result.indexOf('./a-file');
        const zFileIndex = result.indexOf('./z-file');
        assert.ok(aFileIndex < zFileIndex, 'Legacy mode sorts even when disableImportsSorting=true (documented behavior)');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  /**
   * INVARIANT 3: Removal doesn't affect sorting results (beyond removing unused nodes)
   */
  suite('Invariant: Removal Independent from Sorting', () => {
    test('Removal disabled, sorting enabled → same order as removal enabled', async () => {
      const input = `import { B } from './z-file';
import { A } from './a-file';
import { Unused } from './unused';

const a = A;
const b = B;
`;

      // First: with removal DISABLED
      const doc1 = await createTempDocument(input, 'ts');
      const config = new TestConfig({ disableImportsSorting: false, disableImportRemovalOnOrganize: true, legacyMode: false, mergeImportsFromSameModule: false });

      try {
        const manager1 = new ImportManager(doc1, config);
        const edits1 = await manager1.organizeImports();

        const result1 = await applyEditsToDocument(doc1, edits1);

        // Should have all three imports, sorted: a-file, unused, z-file
        assert.ok(result1.includes('./a-file'), 'Should have a-file');
        assert.ok(result1.includes('./unused'), 'Should have unused (removal disabled)');
        assert.ok(result1.includes('./z-file'), 'Should have z-file');

        const aIdx = result1.indexOf('./a-file');
        const uIdx = result1.indexOf('./unused');
        const zIdx = result1.indexOf('./z-file');
        assert.ok(aIdx < uIdx && uIdx < zIdx, 'Should be sorted alphabetically with unused included');
      } finally {
        await deleteTempDocument(doc1);
      }

      // Second: with removal ENABLED
      const doc2 = await createTempDocument(input, 'ts');
      const config2 = new TestConfig({
        disableImportsSorting: false,
        disableImportRemovalOnOrganize: false,  // Enabled
        legacyMode: false,
        mergeImportsFromSameModule: false
      });

      try {
        const manager2 = new ImportManager(doc2, config2);
        const edits2 = await manager2.organizeImports();

        const result2 = await applyEditsToDocument(doc2, edits2);

        // Should have only used imports, sorted: a-file, z-file
        assert.ok(result2.includes('./a-file'), 'Should have a-file');
        assert.ok(!result2.includes('./unused'), 'Should NOT have unused (removal enabled)');
        assert.ok(result2.includes('./z-file'), 'Should have z-file');

        const aIdx2 = result2.indexOf('./a-file');
        const zIdx2 = result2.indexOf('./z-file');
        assert.ok(aIdx2 < zIdx2, 'Used imports should be sorted alphabetically');
      } finally {
        await deleteTempDocument(doc2);
      }
    });
  });

  /**
   * INVARIANT 4: Merge timing depends only on (legacy, removeTrailingIndex, merge flag)
   * NOT on other unrelated settings
   */
  suite('Invariant: Merge Timing Independence', () => {
    test('Modern mode: removeTrailingIndex with merging disabled creates separate imports', async () => {
      const input = `import { A } from './lib/index';
import { B } from './lib';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new TestConfig({ disableImportsSorting: false, disableImportRemovalOnOrganize: true, legacyMode: false, mergeImportsFromSameModule: false });

        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Modern mode with merging disabled:
        // removeTrailingIndex: true → removes /index (always)
        // mergeImportsFromSameModule: false → doesn't merge (always)
        // Result: Two separate imports from './lib'
        const importCount = (result.match(/import/g) || []).length;
        assert.strictEqual(importCount, 2, 'Should have 2 separate imports when merging is disabled');
        assert.ok(result.includes('./lib'), 'Should have ./lib');
        assert.ok(!result.includes('./lib/index'), 'Should NOT have ./lib/index');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Legacy mode: removeTrailingIndex with merging disabled creates separate imports', async () => {
      const input = `import { A } from './lib/index';
import { B } from './lib';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new TestConfig({ disableImportsSorting: false, disableImportRemovalOnOrganize: true, legacyMode: true, mergeImportsFromSameModule: false });

        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Legacy mode with merging disabled.
        // removeTrailingIndex: true → removes /index (always)
        // mergeImportsFromSameModule: false → doesn't merge (always)
        // Result: Two separate imports from './lib'
        const importCount = (result.match(/import/g) || []).length;
        assert.strictEqual(importCount, 2, 'Should keep imports separate when merging is disabled');
        assert.ok(result.includes("from './lib'"), 'Should have imports from ./lib');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });
});
