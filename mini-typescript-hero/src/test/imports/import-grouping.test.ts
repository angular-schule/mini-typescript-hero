/**
 * Unit Tests for Import Grouping
 *
 * These tests verify the import grouping logic that organizes imports into categories:
 * - Plains: String-only imports (e.g., import 'zone.js')
 * - Modules: External package imports (e.g., import { Component } from '@angular/core')
 * - Workspace: Local file imports (e.g., import { MyClass } from './my-class')
 * - Regex: Custom regex-based groups (e.g., /angular/)
 * - Remain: Catch-all for ungrouped imports
 *
 * Ported from original TypeScript Hero tests to ensure compatibility.
 */

import * as assert from 'assert';
import {
  ImportGroupKeyword,
  KeywordImportGroup,
  RegexImportGroup,
  RemainImportGroup,
  ImportGroupSettingParser,
  ImportGroupOrder,
  ImportGroupIdentifierInvalidError
} from '../../imports/import-grouping';
import { StringImport, NamedImport } from '../../imports/import-types';

suite('Import Grouping Tests', () => {
  suite('KeywordImportGroup', () => {
    suite('Modules keyword', () => {
      let group: KeywordImportGroup;

      setup(() => {
        group = new KeywordImportGroup(ImportGroupKeyword.Modules);
      });

      test('should process module import', () => {
        const imp = new NamedImport('body-parser', [{ specifier: 'json' }]);
        assert.strictEqual(group.processImport(imp), true);
        assert.strictEqual(group.imports.length, 1);
      });

      test('should not process plain import', () => {
        const imp = new StringImport('zone.js');
        assert.strictEqual(group.processImport(imp), false);
        assert.strictEqual(group.imports.length, 0);
      });

      test('should not process workspace import', () => {
        const imp = new NamedImport('./local', [{ specifier: 'MyClass' }]);
        assert.strictEqual(group.processImport(imp), false);
        assert.strictEqual(group.imports.length, 0);
      });
    });

    suite('Plains keyword', () => {
      let group: KeywordImportGroup;

      setup(() => {
        group = new KeywordImportGroup(ImportGroupKeyword.Plains);
      });

      test('should process plain import', () => {
        const imp = new StringImport('zone.js');
        assert.strictEqual(group.processImport(imp), true);
        assert.strictEqual(group.imports.length, 1);
      });

      test('should not process module import', () => {
        const imp = new NamedImport('body-parser', [{ specifier: 'json' }]);
        assert.strictEqual(group.processImport(imp), false);
        assert.strictEqual(group.imports.length, 0);
      });

      test('should not process workspace import', () => {
        const imp = new NamedImport('./local', [{ specifier: 'MyClass' }]);
        assert.strictEqual(group.processImport(imp), false);
        assert.strictEqual(group.imports.length, 0);
      });
    });

    suite('Workspace keyword', () => {
      let group: KeywordImportGroup;

      setup(() => {
        group = new KeywordImportGroup(ImportGroupKeyword.Workspace);
      });

      test('should process workspace import', () => {
        const imp = new NamedImport('./local', [{ specifier: 'MyClass' }]);
        assert.strictEqual(group.processImport(imp), true);
        assert.strictEqual(group.imports.length, 1);
      });

      test('should not process module import', () => {
        const imp = new NamedImport('body-parser', [{ specifier: 'json' }]);
        assert.strictEqual(group.processImport(imp), false);
        assert.strictEqual(group.imports.length, 0);
      });

      test('should not process plain import', () => {
        const imp = new StringImport('zone.js');
        assert.strictEqual(group.processImport(imp), false);
        assert.strictEqual(group.imports.length, 0);
      });
    });

    test('should sort imports ascending by default', () => {
      const group = new KeywordImportGroup(ImportGroupKeyword.Modules);
      group.processImport(new NamedImport('zlib', [{ specifier: 'Z' }]));
      group.processImport(new NamedImport('axios', [{ specifier: 'A' }]));
      group.processImport(new NamedImport('mongodb', [{ specifier: 'M' }]));

      const sorted = group.sortedImports;
      assert.strictEqual(sorted[0].libraryName, 'axios');
      assert.strictEqual(sorted[1].libraryName, 'mongodb');
      assert.strictEqual(sorted[2].libraryName, 'zlib');
    });

    test('should sort imports descending when configured', () => {
      const group = new KeywordImportGroup(ImportGroupKeyword.Modules, ImportGroupOrder.Desc);
      group.processImport(new NamedImport('zlib', [{ specifier: 'Z' }]));
      group.processImport(new NamedImport('axios', [{ specifier: 'A' }]));
      group.processImport(new NamedImport('mongodb', [{ specifier: 'M' }]));

      const sorted = group.sortedImports;
      assert.strictEqual(sorted[0].libraryName, 'zlib');
      assert.strictEqual(sorted[1].libraryName, 'mongodb');
      assert.strictEqual(sorted[2].libraryName, 'axios');
    });
  });

  suite('RegexImportGroup', () => {
    test('should process matching import', () => {
      const group = new RegexImportGroup('/angular/');
      const imp = new NamedImport('@angular/core', [{ specifier: 'Component' }]);
      assert.strictEqual(group.processImport(imp), true);
      assert.strictEqual(group.imports.length, 1);
    });

    test('should not process non-matching import', () => {
      const group = new RegexImportGroup('/angular/');
      const imp = new NamedImport('react', [{ specifier: 'Component' }]);
      assert.strictEqual(group.processImport(imp), false);
      assert.strictEqual(group.imports.length, 0);
    });

    test('should work with regex "or" conditions', () => {
      const group = new RegexImportGroup('/angular|react/');
      const imp1 = new NamedImport('@angular/core', [{ specifier: 'Component' }]);
      const imp2 = new NamedImport('react', [{ specifier: 'Component' }]);
      const imp3 = new NamedImport('vue', [{ specifier: 'Component' }]);

      assert.strictEqual(group.processImport(imp1), true);
      assert.strictEqual(group.processImport(imp2), true);
      assert.strictEqual(group.processImport(imp3), false);
    });

    test('should work with regex containing "@"', () => {
      const group = new RegexImportGroup('/@angular/');
      const imp = new NamedImport('@angular/core', [{ specifier: 'Component' }]);
      assert.strictEqual(group.processImport(imp), true);
    });

    test('should work with slash-separated regex', () => {
      const group = new RegexImportGroup('/@angular/http/');
      const imp1 = new NamedImport('@angular/http', [{ specifier: 'HttpClient' }]);
      const imp2 = new NamedImport('@angular/core', [{ specifier: 'Component' }]);

      assert.strictEqual(group.processImport(imp1), true);
      assert.strictEqual(group.processImport(imp2), false);
    });

    test('should sort imports ascending by default', () => {
      const group = new RegexImportGroup('/lib/');
      group.processImport(new NamedImport('my-lib-z', [{ specifier: 'Z' }]));
      group.processImport(new NamedImport('my-lib-a', [{ specifier: 'A' }]));
      group.processImport(new NamedImport('my-lib-m', [{ specifier: 'M' }]));

      const sorted = group.sortedImports;
      assert.strictEqual(sorted[0].libraryName, 'my-lib-a');
      assert.strictEqual(sorted[1].libraryName, 'my-lib-m');
      assert.strictEqual(sorted[2].libraryName, 'my-lib-z');
    });

    test('should sort imports descending when configured', () => {
      const group = new RegexImportGroup('/lib/', ImportGroupOrder.Desc);
      group.processImport(new NamedImport('my-lib-z', [{ specifier: 'Z' }]));
      group.processImport(new NamedImport('my-lib-a', [{ specifier: 'A' }]));
      group.processImport(new NamedImport('my-lib-m', [{ specifier: 'M' }]));

      const sorted = group.sortedImports;
      assert.strictEqual(sorted[0].libraryName, 'my-lib-z');
      assert.strictEqual(sorted[1].libraryName, 'my-lib-m');
      assert.strictEqual(sorted[2].libraryName, 'my-lib-a');
    });
  });

  suite('RemainImportGroup', () => {
    test('should process all imports', () => {
      const group = new RemainImportGroup();
      const imp1 = new StringImport('zone.js');
      const imp2 = new NamedImport('@angular/core', [{ specifier: 'Component' }]);
      const imp3 = new NamedImport('./local', [{ specifier: 'MyClass' }]);

      assert.strictEqual(group.processImport(imp1), true);
      assert.strictEqual(group.processImport(imp2), true);
      assert.strictEqual(group.processImport(imp3), true);
      assert.strictEqual(group.imports.length, 3);
    });

    test('should sort imports ascending by default', () => {
      const group = new RemainImportGroup();
      group.processImport(new NamedImport('zlib', [{ specifier: 'Z' }]));
      group.processImport(new NamedImport('axios', [{ specifier: 'A' }]));
      group.processImport(new NamedImport('mongodb', [{ specifier: 'M' }]));

      const sorted = group.sortedImports;
      assert.strictEqual(sorted[0].libraryName, 'axios');
      assert.strictEqual(sorted[1].libraryName, 'mongodb');
      assert.strictEqual(sorted[2].libraryName, 'zlib');
    });

    test('should sort imports descending when configured', () => {
      const group = new RemainImportGroup(ImportGroupOrder.Desc);
      group.processImport(new NamedImport('zlib', [{ specifier: 'Z' }]));
      group.processImport(new NamedImport('axios', [{ specifier: 'A' }]));
      group.processImport(new NamedImport('mongodb', [{ specifier: 'M' }]));

      const sorted = group.sortedImports;
      assert.strictEqual(sorted[0].libraryName, 'zlib');
      assert.strictEqual(sorted[1].libraryName, 'mongodb');
      assert.strictEqual(sorted[2].libraryName, 'axios');
    });
  });

  suite('ImportGroupSettingParser', () => {
    test('should parse simple keyword', () => {
      const result = ImportGroupSettingParser.parseSetting('Workspace');
      assert.ok(result instanceof KeywordImportGroup);
      assert.strictEqual((result as KeywordImportGroup).keyword, ImportGroupKeyword.Workspace);
    });

    test('should parse simple regex', () => {
      const result = ImportGroupSettingParser.parseSetting('/foobar/');
      assert.ok(result instanceof RegexImportGroup);
    });

    test('should parse complex keyword pattern', () => {
      const result = ImportGroupSettingParser.parseSetting({
        identifier: 'Workspace',
        order: ImportGroupOrder.Desc
      });
      assert.ok(result instanceof KeywordImportGroup);
      assert.strictEqual((result as KeywordImportGroup).keyword, ImportGroupKeyword.Workspace);
      assert.strictEqual((result as KeywordImportGroup).order, ImportGroupOrder.Desc);
    });

    test('should parse complex regex pattern', () => {
      const result = ImportGroupSettingParser.parseSetting({
        identifier: '/foobar/',
        order: ImportGroupOrder.Desc
      });
      assert.ok(result instanceof RegexImportGroup);
      assert.strictEqual((result as RegexImportGroup).order, ImportGroupOrder.Desc);
    });

    test('should throw on invalid identifier', () => {
      assert.throws(
        () => ImportGroupSettingParser.parseSetting('whatever'),
        ImportGroupIdentifierInvalidError
      );
    });

    test('should parse regex with "or"', () => {
      const result = ImportGroupSettingParser.parseSetting('/angular|react/');
      assert.ok(result instanceof RegexImportGroup);
    });

    test('should parse regex with "@"', () => {
      const result = ImportGroupSettingParser.parseSetting('/@angular/');
      assert.ok(result instanceof RegexImportGroup);
    });

    test('should parse complex regex', () => {
      const result = ImportGroupSettingParser.parseSetting('/(@angular|react)/core/(.*)/');
      assert.ok(result instanceof RegexImportGroup);
    });
  });
});
