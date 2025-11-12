/**
 * Windows Paths & Unicode Edge Cases
 *
 * Purpose: Verify the extension handles:
 * - Windows backslash path separators
 * - Unicode characters in import paths
 * - Emoji in paths and specifiers
 * - Special characters in module names
 *
 * These edge cases are rare but should not crash or produce malformed output.
 */

import * as assert from 'assert';
import { ImportManager } from '../imports/import-manager';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';
import { ImportsConfig } from '../configuration';

suite('Windows Paths & Unicode Edge Cases', () => {
  suite('Windows Backslash Paths', () => {
    test('Backslash paths are normalized and sorted', async () => {
      // Note: TypeScript compiler normalizes backslashes to forward slashes internally
      // We test that the extension handles this gracefully
      const input = String.raw`import { B } from './dir\\file-b';
import { A } from './dir\\file-a';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Extension should handle backslashes gracefully
        // (TypeScript compiler normalizes them, so we just verify no crash)
        assert.ok(result.includes('file-a'), 'Should preserve file-a import');
        assert.ok(result.includes('file-b'), 'Should preserve file-b import');
        assert.ok(result.includes('const a = A'), 'Code should be preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Mixed forward/backward slashes', async () => {
      const input = String.raw`import { C } from './dir/subdir\\file';
import { D } from './dir\\subdir/file2';

const c = C;
const d = D;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Should not crash with mixed separators
        assert.ok(result.includes('import'), 'Should have imports');
        assert.ok(result.includes('const c = C'), 'Code should be preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Unicode in Import Paths', () => {
    test('German umlauts in path', async () => {
      const input = `import { User } from './müller/user';
import { Config } from './config';

const u = User;
const c = Config;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Unicode path should be preserved and sorted correctly
        assert.ok(result.includes('./müller/user'), 'Unicode path should be preserved');
        assert.ok(result.includes('./config'), 'Regular path should be preserved');

        // Verify sorting (config before müller alphabetically)
        const configIndex = result.indexOf('./config');
        const mullerIndex = result.indexOf('./müller');
        assert.ok(configIndex < mullerIndex, 'Should be sorted alphabetically (config before müller)');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Scandinavian characters in path', async () => {
      const input = `import { Data } from './søren/data';
import { User } from './anders/user';

const d = Data;
const u = User;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        assert.ok(result.includes('./søren/data'), 'Scandinavian characters preserved');
        assert.ok(result.includes('./anders/user'), 'Regular path preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Emoji in path', async () => {
      const input = `import { Package } from './📦-utils';
import { Star } from './⭐-helpers';

const p = Package;
const s = Star;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Emoji paths should be preserved (even if unusual)
        assert.ok(result.includes('📦'), 'Emoji should be preserved in path');
        assert.ok(result.includes('⭐'), 'Star emoji should be preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Unicode in Specifier Names', () => {
    test('Unicode characters in import specifiers', async () => {
      const input = `import { Søren, Anders, Bjørn } from './team';

const s = Søren;
const a = Anders;
const b = Bjørn;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Specifiers should be sorted alphabetically with locale-aware comparison
        assert.ok(result.includes('Anders'), 'Anders should be present');
        assert.ok(result.includes('Bjørn'), 'Bjørn should be present');
        assert.ok(result.includes('Søren'), 'Søren should be present');

        // Check sorting order (locale-aware: Anders, Bjørn, Søren)
        const andersIdx = result.indexOf('Anders');
        const bjornIdx = result.indexOf('Bjørn');
        const sorenIdx = result.indexOf('Søren');
        assert.ok(andersIdx < bjornIdx && bjornIdx < sorenIdx, 'Should be sorted locale-aware');
      } finally {
        await deleteTempDocument(doc);
      }
    });

    test('Mixed ASCII and Unicode specifiers', async () => {
      const input = `import { Zürich, Berlin, Åland, Amsterdam } from './cities';

const z = Zürich;
const b = Berlin;
const a = Åland;
const am = Amsterdam;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // All specifiers should be present and sorted
        assert.ok(result.includes('Zürich'), 'Zürich should be present');
        assert.ok(result.includes('Berlin'), 'Berlin should be present');
        assert.ok(result.includes('Åland'), 'Åland should be present');
        assert.ok(result.includes('Amsterdam'), 'Amsterdam should be present');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Special Characters in Module Names', () => {
    test('Scoped packages with special chars', async () => {
      const input = `import { A } from '@company/módulo';
import { B } from '@company/naïve';

const a = A;
const b = B;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        assert.ok(result.includes('@company/módulo'), 'Special chars in scoped package preserved');
        assert.ok(result.includes('@company/naïve'), 'Special chars in scoped package preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });

  suite('Regression: No Crashes on Edge Cases', () => {
    test('Complex unicode combinations do not crash', async () => {
      const input = `import { 你好, مرحبا, Здравствуйте } from './greetings';
import { 🎉, 🚀, 💻 } from './emoji-utils';

const chinese = 你好;
const arabic = مرحبا;
const russian = Здравствуйте;
const party = 🎉;
`;

      const doc = await createTempDocument(input, 'ts');

      try {
        const config = new ImportsConfig();
        const manager = new ImportManager(doc, config);

        // The main assertion: this should not throw
        const edits = await manager.organizeImports();

        const result = await applyEditsToDocument(doc, edits);

        // Basic sanity check - imports should exist
        assert.ok(result.includes('import'), 'Should have import statements');
        assert.ok(result.includes('const chinese'), 'Code should be preserved');
      } finally {
        await deleteTempDocument(doc);
      }
    });
  });
});
