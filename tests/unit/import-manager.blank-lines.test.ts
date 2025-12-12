import * as assert from 'assert';
import { EndOfLine, Uri } from 'vscode';

import { ImportsConfig } from '../../src/configuration';
import { ImportManager } from '../../src/imports/import-manager';
import { createTempDocument, deleteTempDocument, applyEditsToDocument } from './test-helpers';
import { ConfigOverrides, ConfigKey } from './test-types';

/**
 * Comprehensive tests for blank line handling.
 *
 * Tests are organized by:
 * - Mode: "one", "two", "preserve", "legacy"
 * - Scenario: header detection, leading blanks, blank lines before/after imports
 *
 * Test IDs correspond to the legacy blank line behavior documented in README.md (Legacy Mode section)
 */

// Mock config for testing
class MockImportsConfig extends ImportsConfig {
  private overrides: Map<ConfigKey, ConfigOverrides[ConfigKey]> = new Map();

  override<K extends ConfigKey>(key: K, value: ConfigOverrides[K]): void {
    this.overrides.set(key, value);
  }

  // Override specific methods for testing
  public blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' {
    return (this.overrides.get('blankLinesAfterImports') as 'one' | 'two' | 'preserve' | undefined) ?? 'one';
  }

  public insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return (this.overrides.get('insertSpaceBeforeAndAfterImportBraces') as boolean | undefined) ?? true;
  }

  public async insertSemicolons(_resource: Uri): Promise<boolean> {
    return Promise.resolve((this.overrides.get('insertSemicolons') as boolean | undefined) ?? true);
  }

  public async stringQuoteStyle(_resource: Uri): Promise<'"' | '\''> {
    return Promise.resolve((this.overrides.get('stringQuoteStyle') as '"' | '\'' | undefined) ?? `'`);
  }

  public multiLineWrapThreshold(_resource: Uri): number {
    return (this.overrides.get('multiLineWrapThreshold') as number | undefined) ?? 125;
  }

  public multiLineTrailingComma(_resource: Uri): boolean {
    return (this.overrides.get('multiLineTrailingComma') as boolean | undefined) ?? true;
  }

  public disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return (this.overrides.get('disableImportRemovalOnOrganize') as boolean | undefined) ?? false;
  }

  public mergeImportsFromSameModule(_resource: Uri): boolean {
    return (this.overrides.get('mergeImportsFromSameModule') as boolean | undefined) ?? true;
  }

  public disableImportsSorting(_resource: Uri): boolean {
    return (this.overrides.get('disableImportsSorting') as boolean | undefined) ?? false;
  }

  public organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return (this.overrides.get('organizeSortsByFirstSpecifier') as boolean | undefined) ?? false;
  }

  public ignoredFromRemoval(_resource: Uri): string[] {
    return (this.overrides.get('ignoredFromRemoval') as string[] | undefined) ?? [];
  }

  public removeTrailingIndex(_resource: Uri): boolean {
    return (this.overrides.get('removeTrailingIndex') as boolean | undefined) ?? true;
  }
}

suite('Blank Lines - Mode "one" (default)', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true); // Don't remove unused imports for blank line tests
  });

  test('TC-001: 0 blank lines after → 1 blank line after', async () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-002: 1 blank line after → 1 blank line after (preserved)', async () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-003: 2 blank lines after → 1 blank line after (normalized)', async () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-004: 3 blank lines after → 1 blank line after (normalized)', async () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-005: 5 blank lines after → 1 blank line after (normalized)', async () => {
    const input = `import { A } from './a';\n\n\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('Blank Lines - Mode "two"', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'two');
    config.override('disableImportRemovalOnOrganize', true);
  });

  test('TC-010: 0 blank lines after → 2 blank lines after', async () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-011: 1 blank line after → 2 blank lines after', async () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-012: 2 blank lines after → 2 blank lines after (preserved)', async () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-013: 3 blank lines after → 2 blank lines after (normalized)', async () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('Blank Lines - Mode "preserve"', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'preserve');
    config.override('disableImportRemovalOnOrganize', true);
  });

  test('TC-020: 0 blank lines after → 0 blank lines after', async () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-021: 1 blank line after → 1 blank line after', async () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-022: 2 blank lines after → 2 blank lines after', async () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-023: 3 blank lines after → 3 blank lines after', async () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-024: 5 blank lines after → 5 blank lines after', async () => {
    const input = `import { A } from './a';\n\n\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\n\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });
});


suite('Blank Lines - Header Detection', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true);
  });

  test('TC-100: Leading blank lines removed (no header)', async () => {
    const input = `\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-101: Leading blank lines before comment removed', async () => {
    const input = `\n\n// Comment\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-110: Header with no blank lines preserved', async () => {
    const input = `// Comment\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-111: Header with 1 blank line preserved', async () => {
    const input = `// Comment\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-112: Header with 2 blank lines preserved', async () => {
    const input = `// Comment\n\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\n\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-113: Multiple header lines with blank preserved', async () => {
    const input = `// Copyright 2025\n// Info\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Copyright 2025\n// Info\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-120: Shebang with no blank preserved', async () => {
    const input = `#!/usr/bin/env node\nimport { A } from './a';\nexport class Test {}`;
    const expected = `#!/usr/bin/env node\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-121: Shebang with blank preserved', async () => {
    const input = `#!/usr/bin/env node\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `#!/usr/bin/env node\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-130: use strict with no blank preserved', async () => {
    const input = `'use strict';\nimport { A } from './a';\nexport class Test {}`;
    const expected = `'use strict';\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-131: use strict with blank preserved', async () => {
    const input = `'use strict';\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `'use strict';\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-132: double-quoted use strict preserved', async () => {
    const input = `"use strict";\nimport { A } from './a';\nexport class Test {}`;
    const expected = `"use strict";\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('Blank Lines - Import Group Separation', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true);
  });

  test('TC-200: Modules only - no group separation', async () => {
    const input = `import { A } from '@angular/core';\nimport { B } from 'rxjs';\nexport class Test {}`;
    const expected = `import { A } from '@angular/core';\nimport { B } from 'rxjs';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-201: Workspace only - no group separation', async () => {
    const input = `import { A } from './a';\nimport { B } from './b';\nexport class Test {}`;
    const expected = `import { A } from './a';\nimport { B } from './b';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-202: Modules + Workspace - 1 blank between groups', async () => {
    const input = `import { A } from '@angular/core';\nimport { B } from './b';\nexport class Test {}`;
    const expected = `import { A } from '@angular/core';\n\nimport { B } from './b';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-203: Plains + Modules + Workspace - 2 blanks total (1 between each)', async () => {
    const input = `import './polyfills';\nimport { A } from '@angular/core';\nimport { B } from './b';\nexport class Test {}`;
    const expected = `import './polyfills';\n\nimport { A } from '@angular/core';\n\nimport { B } from './b';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('Blank Lines - Combined Scenarios', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('disableImportRemovalOnOrganize', true);
  });

  test('TC-300: Mode "one" + Header with blanks', async () => {
    config.override('blankLinesAfterImports', 'one');

    const input = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;
    const expected = `// Header\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-310: Mode "preserve" + Header', async () => {
    config.override('blankLinesAfterImports', 'preserve');

    const input = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;
    const expected = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

});

suite('Blank Lines - Edge Cases', () => {
  let config: MockImportsConfig;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true);
  });

  test('TC-400: File with only imports (no code after)', async () => {
    const input = `import { A } from './a';`;

    const doc = await createTempDocument(input);
    try {
      // Build expected based on document's actual EOL setting
      // VSCode detects EOL from file content or uses files.eol preference
      const eol = doc.eol === EndOfLine.CRLF ? '\r\n' : '\n';
      const expected = `import { A } from './a';${eol}`;

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-401: File with no imports', async () => {
    const input = `export class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      // No edits should be made
      assert.strictEqual(edits.length, 0);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-402: Empty file', async () => {
    const input = ``;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      assert.strictEqual(edits.length, 0);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-403: Whitespace-only file becomes empty', async () => {
    const input = `\n\n\n`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      // No imports means no edits
      assert.strictEqual(edits.length, 0);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-404: CRLF line endings preserved', async () => {
    const input = `import { A } from './a';\r\nexport class Test {}`;
    const expected = `import { A } from './a';\r\n\r\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('TC-405: Mixed import types handled correctly', async () => {
    const input = `import './polyfills';\nimport * as React from 'react';\nimport { A } from './a';\nexport class Test {}`;
    const expected = `import './polyfills';\n\nimport * as React from 'react';\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = await createTempDocument(input);
    try {
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();
      const result = await applyEditsToDocument(doc, edits);

      assert.strictEqual(result, expected);
    } finally {
      await deleteTempDocument(doc);
    }
  });
});
