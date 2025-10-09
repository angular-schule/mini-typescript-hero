import * as assert from 'assert';
import { EndOfLine, Uri } from 'vscode';

import { ImportsConfig } from '../../configuration';
import { ImportManager } from '../../imports/import-manager';

/**
 * Comprehensive tests for blank line handling.
 *
 * Tests are organized by:
 * - Mode: "one", "two", "preserve", "legacy"
 * - Scenario: header detection, leading blanks, blank lines before/after imports
 *
 * Test IDs correspond to the specification in README-how-we-handle-blank-lines.md
 */

// Mock implementations
class MockTextDocument {
  constructor(
    public readonly fileName: string,
    private readonly content: string,
    public readonly eol: EndOfLine = EndOfLine.LF,
  ) {}

  getText(): string {
    return this.content;
  }

  get uri(): Uri {
    return Uri.file(this.fileName);
  }

  get lineCount(): number {
    return this.content.split(/\r?\n/).length;
  }

  lineAt(line: number): { text: string; range: any; rangeIncludingLineBreak: any } {
    const lines = this.content.split(/\r?\n/);
    return {
      text: lines[line] || '',
      range: null as any,
      rangeIncludingLineBreak: null as any,
    };
  }

  positionAt(offset: number): any {
    const lines = this.content.split(/\r?\n/);
    let currentOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length;
      if (currentOffset + lineLength >= offset) {
        return { line: i, character: offset - currentOffset };
      }
      currentOffset += lineLength + 1; // +1 for newline character
    }

    // If offset is at or past the end, return last position
    return { line: lines.length - 1, character: lines[lines.length - 1].length };
  }
}

class MockOutputChannel {
  appendLine(_message: string): void {
    // No-op for tests
  }

  dispose(): void {
    // No-op
  }
}

class MockImportsConfig extends ImportsConfig {
  private overrides: Map<string, any> = new Map();

  override(key: string, value: any): void {
    this.overrides.set(key, value);
  }

  // Override specific methods for testing
  public blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' | 'legacy' {
    return this.overrides.get('blankLinesAfterImports') ?? 'one';
  }

  public insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return this.overrides.get('insertSpaceBeforeAndAfterImportBraces') ?? true;
  }

  public insertSemicolons(_resource: Uri): boolean {
    return this.overrides.get('insertSemicolons') ?? true;
  }

  public stringQuoteStyle(_resource: Uri): '"' | '\'' {
    return this.overrides.get('stringQuoteStyle') ?? '\'';
  }

  public multiLineWrapThreshold(_resource: Uri): number {
    return this.overrides.get('multiLineWrapThreshold') ?? 125;
  }

  public multiLineTrailingComma(_resource: Uri): boolean {
    return this.overrides.get('multiLineTrailingComma') ?? true;
  }

  public disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return this.overrides.get('disableImportRemovalOnOrganize') ?? false;
  }

  public mergeImportsFromSameModule(_resource: Uri): boolean {
    return this.overrides.get('mergeImportsFromSameModule') ?? true;
  }

  public disableImportsSorting(_resource: Uri): boolean {
    return this.overrides.get('disableImportsSorting') ?? false;
  }

  public organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return this.overrides.get('organizeSortsByFirstSpecifier') ?? false;
  }

  public ignoredFromRemoval(_resource: Uri): string[] {
    return this.overrides.get('ignoredFromRemoval') ?? [];
  }

  public removeTrailingIndex(_resource: Uri): boolean {
    return this.overrides.get('removeTrailingIndex') ?? true;
  }
}

/**
 * Helper to apply TextEdits to a document string.
 *
 * A TextEdit REPLACE operation replaces text from startLine to endLine.
 * The newText is inserted at startLine, and lines from startLine to endLine-1 are removed.
 */
function applyTextEdits(originalText: string, edits: any[]): string {
  if (edits.length === 0) {
    return originalText;
  }

  // For blank line tests, we typically have a single REPLACE edit
  const edit = edits[0];
  const lines = originalText.split(/\r?\n/);

  // Extract range - VSCode uses 0-based line numbers
  const startLine = edit.range.start.line;
  const endLine = edit.range.end.line;

  // Build result:
  // - Lines before startLine stay as-is
  // - Lines from startLine to endLine-1 are removed
  // - newText is inserted
  // - Lines from endLine onward stay as-is
  const before = lines.slice(0, startLine);
  const after = lines.slice(endLine);

  // Assemble the result
  let result = '';

  // Add lines before the edit
  if (before.length > 0) {
    result += before.join('\n') + '\n';
  }

  // Add the new text (which already includes its own line endings)
  result += edit.newText;

  // Add lines after the edit
  // Only add a connecting newline if newText doesn't end with one
  if (after.length > 0) {
    if (edit.newText && !edit.newText.endsWith('\n')) {
      result += '\n';
    }
    result += after.join('\n');
  }

  return result;
}

suite('Blank Lines - Mode "one" (default)', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true); // Don't remove unused imports for blank line tests
    logger = new MockOutputChannel();
  });

  test('TC-001: 0 blank lines after → 1 blank line after', () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-002: 1 blank line after → 1 blank line after (preserved)', () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-003: 2 blank lines after → 1 blank line after (normalized)', () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-004: 3 blank lines after → 1 blank line after (normalized)', () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-005: 5 blank lines after → 1 blank line after (normalized)', () => {
    const input = `import { A } from './a';\n\n\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Mode "two"', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'two');
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-010: 0 blank lines after → 2 blank lines after', () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-011: 1 blank line after → 2 blank lines after', () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-012: 2 blank lines after → 2 blank lines after (preserved)', () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-013: 3 blank lines after → 2 blank lines after (normalized)', () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Mode "preserve"', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'preserve');
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-020: 0 blank lines after → 0 blank lines after', () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-021: 1 blank line after → 1 blank line after', () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-022: 2 blank lines after → 2 blank lines after', () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-023: 3 blank lines after → 3 blank lines after', () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-024: 5 blank lines after → 5 blank lines after', () => {
    const input = `import { A } from './a';\n\n\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\n\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Mode "legacy"', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'legacy');
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-030: 0 before, 0 after → 1 after (formula: 0 + 1 + 0 = 1)', () => {
    const input = `import { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-031: 0 before, 1 after → 1 after (formula: 0 + 1 + 0 = 1)', () => {
    const input = `import { A } from './a';\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-032: 0 before, 2 after → 2 after (formula: 0 + 1 + 1 = 2)', () => {
    const input = `import { A } from './a';\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-033: 0 before, 3 after → 3 after (formula: 0 + 1 + 2 = 3)', () => {
    const input = `import { A } from './a';\n\n\n\nexport class Test {}`;
    const expected = `import { A } from './a';\n\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-034: 1 before, 0 after → 2 after (formula: 1 + 1 + 0 = 2)', () => {
    const input = `// Comment\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\n\nimport { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-035: 1 before, 1 after → 2 after (formula: 1 + 1 + 0 = 2)', () => {
    const input = `// Comment\n\nimport { A } from './a';\n\nexport class Test {}`;
    const expected = `// Comment\n\nimport { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-036: 1 before, 2 after → 3 after (formula: 1 + 1 + 1 = 3)', () => {
    const input = `// Comment\n\nimport { A } from './a';\n\n\nexport class Test {}`;
    const expected = `// Comment\n\nimport { A } from './a';\n\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-037: 2 before, 0 after → 3 after (formula: 2 + 1 + 0 = 3)', () => {
    const input = `// Comment\n\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\n\n\nimport { A } from './a';\n\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-038: 2 before, 1 after → 3 after (formula: 2 + 1 + 0 = 3)', () => {
    const input = `// Comment\n\n\nimport { A } from './a';\n\nexport class Test {}`;
    const expected = `// Comment\n\n\nimport { A } from './a';\n\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Header Detection', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-100: Leading blank lines removed (no header)', () => {
    const input = `\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `import { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-101: Leading blank lines before comment removed', () => {
    const input = `\n\n// Comment\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-110: Header with no blank lines preserved', () => {
    const input = `// Comment\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-111: Header with 1 blank line preserved', () => {
    const input = `// Comment\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-112: Header with 2 blank lines preserved', () => {
    const input = `// Comment\n\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Comment\n\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-113: Multiple header lines with blank preserved', () => {
    const input = `// Copyright 2025\n// Info\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Copyright 2025\n// Info\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-120: Shebang with no blank preserved', () => {
    const input = `#!/usr/bin/env node\nimport { A } from './a';\nexport class Test {}`;
    const expected = `#!/usr/bin/env node\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-121: Shebang with blank preserved', () => {
    const input = `#!/usr/bin/env node\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `#!/usr/bin/env node\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-130: use strict with no blank preserved', () => {
    const input = `'use strict';\nimport { A } from './a';\nexport class Test {}`;
    const expected = `'use strict';\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-131: use strict with blank preserved', () => {
    const input = `'use strict';\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `'use strict';\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-132: double-quoted use strict preserved', () => {
    const input = `"use strict";\nimport { A } from './a';\nexport class Test {}`;
    const expected = `"use strict";\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Import Group Separation', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-200: Modules only - no group separation', () => {
    const input = `import { A } from '@angular/core';\nimport { B } from 'rxjs';\nexport class Test {}`;
    const expected = `import { A } from '@angular/core';\nimport { B } from 'rxjs';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-201: Workspace only - no group separation', () => {
    const input = `import { A } from './a';\nimport { B } from './b';\nexport class Test {}`;
    const expected = `import { A } from './a';\nimport { B } from './b';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-202: Modules + Workspace - 1 blank between groups', () => {
    const input = `import { A } from '@angular/core';\nimport { B } from './b';\nexport class Test {}`;
    const expected = `import { A } from '@angular/core';\n\nimport { B } from './b';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-203: Plains + Modules + Workspace - 2 blanks total (1 between each)', () => {
    const input = `import './polyfills';\nimport { A } from '@angular/core';\nimport { B } from './b';\nexport class Test {}`;
    const expected = `import './polyfills';\n\nimport { A } from '@angular/core';\n\nimport { B } from './b';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Combined Scenarios', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-300: Mode "one" + Header with blanks', () => {
    config.override('blankLinesAfterImports', 'one');

    const input = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;
    const expected = `// Header\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-310: Mode "preserve" + Header', () => {
    config.override('blankLinesAfterImports', 'preserve');

    const input = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;
    const expected = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-320: Mode "legacy" + Header with 1 blank', () => {
    config.override('blankLinesAfterImports', 'legacy');

    const input = `// Header\n\nimport { A } from './a';\nexport class Test {}`;
    const expected = `// Header\n\nimport { A } from './a';\n\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});

suite('Blank Lines - Edge Cases', () => {
  let config: MockImportsConfig;
  let logger: MockOutputChannel;

  setup(() => {
    config = new MockImportsConfig();
    config.override('blankLinesAfterImports', 'one');
    config.override('disableImportRemovalOnOrganize', true);
    logger = new MockOutputChannel();
  });

  test('TC-400: File with only imports (no code after)', () => {
    const input = `import { A } from './a';`;
    const expected = `import { A } from './a';\n`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-401: File with no imports', () => {
    const input = `export class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();

    // No edits should be made
    assert.strictEqual(edits.length, 0);
  });

  test('TC-402: Empty file', () => {
    const input = ``;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();

    assert.strictEqual(edits.length, 0);
  });

  test('TC-403: Whitespace-only file becomes empty', () => {
    const input = `\n\n\n`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();

    // No imports means no edits
    assert.strictEqual(edits.length, 0);
  });

  test('TC-404: CRLF line endings preserved', () => {
    const input = `import { A } from './a';\r\nexport class Test {}`;
    const expected = `import { A } from './a';\r\n\r\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input, EndOfLine.CRLF);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });

  test('TC-405: Mixed import types handled correctly', () => {
    const input = `import './polyfills';\nimport * as React from 'react';\nimport { A } from './a';\nexport class Test {}`;
    const expected = `import './polyfills';\n\nimport * as React from 'react';\n\nimport { A } from './a';\n\nexport class Test {}`;

    const doc = new MockTextDocument('test.ts', input);
    const manager = new ImportManager(doc as any, config, logger as any);
    const edits = manager.organizeImports();
    const result = applyTextEdits(input, edits);

    assert.strictEqual(result, expected);
  });
});
