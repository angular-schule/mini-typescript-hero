/**
 * Unit Tests for Import Utilities
 *
 * Tests utility functions used for sorting and organizing imports.
 * Ported from original TypeScript Hero to ensure compatibility.
 */

import * as assert from 'assert';
import {
  ImportGroupKeyword,
  KeywordImportGroup,
  RegexImportGroup
} from '../imports/import-grouping';
import { importGroupSortForPrecedence, importSortByFirstSpecifier } from '../imports/import-utilities';
import { NamedImport, NamespaceImport, StringImport } from '../imports/import-types';

suite('Import Utilities Tests', () => {
  suite('importGroupSortForPrecedence', () => {
    test('should prioritize regex groups, leaving original order untouched besides that', () => {
      const initialList = [
        new KeywordImportGroup(ImportGroupKeyword.Modules),
        new KeywordImportGroup(ImportGroupKeyword.Plains),
        new RegexImportGroup('/cool-library/'),
        new RegexImportGroup('/cooler-library/'),
        new KeywordImportGroup(ImportGroupKeyword.Workspace),
      ];

      const result = importGroupSortForPrecedence(initialList);

      // Expected: regex groups first, then keyword groups in original order
      assert.strictEqual(result[0], initialList[2], 'First regex group should be first');
      assert.strictEqual(result[1], initialList[3], 'Second regex group should be second');
      assert.strictEqual(result[2], initialList[0], 'First keyword group should be third');
      assert.strictEqual(result[3], initialList[1], 'Second keyword group should be fourth');
      assert.strictEqual(result[4], initialList[4], 'Third keyword group should be fifth');
    });

    test('should handle list with no regex groups', () => {
      const initialList = [
        new KeywordImportGroup(ImportGroupKeyword.Modules),
        new KeywordImportGroup(ImportGroupKeyword.Plains),
        new KeywordImportGroup(ImportGroupKeyword.Workspace),
      ];

      const result = importGroupSortForPrecedence(initialList);

      // Order should remain unchanged
      assert.deepStrictEqual(result, initialList);
    });

    test('should handle list with only regex groups', () => {
      const initialList = [
        new RegexImportGroup('/lib-a/'),
        new RegexImportGroup('/lib-b/'),
        new RegexImportGroup('/lib-c/'),
      ];

      const result = importGroupSortForPrecedence(initialList);

      // Order should remain unchanged
      assert.deepStrictEqual(result, initialList);
    });

    test('should handle empty list', () => {
      const result = importGroupSortForPrecedence([]);
      assert.deepStrictEqual(result, []);
    });
  });

  suite('importSortByFirstSpecifier', () => {
    test('should sort by first specifier (named import)', () => {
      const imp1 = new NamedImport('lib', [{ specifier: 'Zebra' }]);
      const imp2 = new NamedImport('lib', [{ specifier: 'Apple' }]);

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should sort by alias when present (named import)', () => {
      const imp1 = new NamedImport('lib', [{ specifier: 'Foo', alias: 'Zebra' }]);
      const imp2 = new NamedImport('lib', [{ specifier: 'Bar', alias: 'Apple' }]);

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should sort namespace imports by alias', () => {
      const imp1 = new NamespaceImport('lib', 'Zebra');
      const imp2 = new NamespaceImport('lib', 'Apple');

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should sort string imports by library basename', () => {
      const imp1 = new StringImport('path/to/zebra');
      const imp2 = new StringImport('path/to/apple');

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should fall back to library name when no specifiers', () => {
      const imp1 = new NamedImport('zebra-lib', []);
      const imp2 = new NamedImport('apple-lib', []);

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should sort by default alias when present', () => {
      const imp1 = new NamedImport('lib', [], 'Zebra');
      const imp2 = new NamedImport('lib', [], 'Apple');

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should be case-insensitive (locale-aware)', () => {
      const imp1 = new NamedImport('lib', [{ specifier: 'zebra' }]);
      const imp2 = new NamedImport('lib', [{ specifier: 'Apple' }]);

      // Should sort 'Apple' before 'zebra' (case-insensitive)
      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2), 1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1), -1);
    });

    test('should handle descending order', () => {
      const imp1 = new NamedImport('lib', [{ specifier: 'Zebra' }]);
      const imp2 = new NamedImport('lib', [{ specifier: 'Apple' }]);

      assert.strictEqual(importSortByFirstSpecifier(imp1, imp2, 'desc'), -1);
      assert.strictEqual(importSortByFirstSpecifier(imp2, imp1, 'desc'), 1);
    });
  });
});
