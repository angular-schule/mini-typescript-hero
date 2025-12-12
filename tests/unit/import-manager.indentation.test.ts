import * as assert from 'assert';
import { ImportsConfig } from '../../src/configuration/imports-config';
import { ImportManager } from '../../src/imports/import-manager';
import { createTempDocument, deleteTempDocument } from './test-helpers';

/**
 * ImportManager - Indentation Tests
 *
 * These tests verify that our indentation implementation:
 * 1. Legacy mode: Matches old TypeScript Hero (always spaces, 4-space default)
 * 2. Modern mode: Enhanced UX (supports tabs, 2-space default)
 * 3. useOnlyExtensionSettings: Provides full control
 */

suite('ImportManager - Indentation - Legacy Mode', () => {

  test('INDENT-L1: Default 4 spaces in legacy mode', async () => {
    const content = `import { VeryLongComponentName, AnotherLongName, ThirdName, FourthName, FifthName } from 'library';

const x = VeryLongComponentName;
const y = AnotherLongName;
const z = ThirdName;
const a = FourthName;
const b = FifthName;
`;

    const expected = `import {
    AnotherLongName,
    FifthName,
    FourthName,
    ThirdName,
    VeryLongComponentName,
} from 'library';

const x = VeryLongComponentName;
const y = AnotherLongName;
const z = ThirdName;
const a = FourthName;
const b = FifthName;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return true; }
        public multiLineWrapThreshold() { return 50; }
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      // Apply edits
      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must use 4-space indentation by default');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-L2: Always spaces in legacy mode (never tabs)', async () => {
    const content = `import { ComponentA, ComponentB, ComponentC, ComponentD, ComponentE } from 'react';

const x = ComponentA;
const y = ComponentB;
const z = ComponentC;
const a = ComponentD;
const b = ComponentE;
`;

    const expected = `import {
    ComponentA,
    ComponentB,
    ComponentC,
    ComponentD,
    ComponentE,
} from 'react';

const x = ComponentA;
const y = ComponentB;
const z = ComponentC;
const a = ComponentD;
const b = ComponentE;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return true; }
        public multiLineWrapThreshold() { return 50; }
        public indentation() { return '    '; } // 4 spaces (legacy default)
        // This should be IGNORED in legacy mode:
        public insertSpaces() { return false; }
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();

      // Legacy mode ALWAYS uses spaces, never tabs
      assert.ok(!result.includes('\t'), 'Legacy mode must never use tabs');
      assert.strictEqual(result, expected, 'Legacy mode must use spaces even when insertSpaces=false');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-L3: Respects editor.tabSize = 8 in legacy mode', async () => {
    const content = `import { A, B, C, D, E } from 'lib';

const x = A + B + C + D + E;
`;

    const expected = `import {
        A,
        B,
        C,
        D,
        E,
} from 'lib';

const x = A + B + C + D + E;
`;

    const doc = await createTempDocument(content);

    try {
      // Note: In real usage, this would read from VS Code settings
      // For this test, we mock the config to return 8
      const config = new (class extends ImportsConfig {
        public legacyMode() { return true; }
        public multiLineWrapThreshold() { return 10; } // Force multiline
        public indentation() { return '        '; } // 8 spaces
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must respect editor.tabSize=8');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-L4: Falls back to 4 when editor.tabSize undefined', async () => {
    const content = `import { LongNameA, LongNameB, LongNameC, LongNameD } from 'library';

const x = LongNameA + LongNameB + LongNameC + LongNameD;
`;

    const expected = `import {
    LongNameA,
    LongNameB,
    LongNameC,
    LongNameD,
} from 'library';

const x = LongNameA + LongNameB + LongNameC + LongNameD;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return true; }
        public multiLineWrapThreshold() { return 40; } // Force multiline
        // Default indentation when editor.tabSize is not configured
        public indentation() { return '    '; } // 4 spaces (legacy default)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Legacy mode must default to 4 spaces');
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('ImportManager - Indentation - Modern Mode', () => {

  test('INDENT-M1: Default 2 spaces in modern mode', async () => {
    const content = `import { VeryLongComponentName, AnotherLongName, ThirdName, FourthName, FifthName } from 'library';

const x = VeryLongComponentName;
const y = AnotherLongName;
const z = ThirdName;
const a = FourthName;
const b = FifthName;
`;

    const expected = `import {
  AnotherLongName,
  FifthName,
  FourthName,
  ThirdName,
  VeryLongComponentName,
} from 'library';

const x = VeryLongComponentName;
const y = AnotherLongName;
const z = ThirdName;
const a = FourthName;
const b = FifthName;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 50; }
        public indentation() { return '  '; } // 2 spaces (modern default)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Modern mode must use 2-space indentation by default');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-M2: Uses tabs when editor.insertSpaces = false', async () => {
    const content = `import { ComponentA, ComponentB, ComponentC, ComponentD, ComponentE } from 'react';

const x = ComponentA;
const y = ComponentB;
const z = ComponentC;
const a = ComponentD;
const b = ComponentE;
`;

    const expected = `import {
\tComponentA,
\tComponentB,
\tComponentC,
\tComponentD,
\tComponentE,
} from 'react';

const x = ComponentA;
const y = ComponentB;
const z = ComponentC;
const a = ComponentD;
const b = ComponentE;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 50; }
        public indentation() { return '\t'; } // Tabs!
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.ok(result.includes('\t'), 'Modern mode must support tabs');
      assert.strictEqual(result, expected, 'Modern mode must use tabs when insertSpaces=false');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-M3: Respects editor.tabSize = 3', async () => {
    const content = `import { NameA, NameB, NameC, NameD } from 'lib';

const x = NameA + NameB + NameC + NameD;
`;

    const expected = `import {
   NameA,
   NameB,
   NameC,
   NameD,
} from 'lib';

const x = NameA + NameB + NameC + NameD;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 10; } // Force multiline
        public indentation() { return '   '; } // 3 spaces
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Modern mode must respect tabSize=3');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-M4: Respects editor.tabSize = 8', async () => {
    const content = `import { A, B, C, D, E } from 'lib';

const x = A + B + C + D + E;
`;

    const expected = `import {
        A,
        B,
        C,
        D,
        E,
} from 'lib';

const x = A + B + C + D + E;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 10; } // Force multiline
        public indentation() { return '        '; } // 8 spaces
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Modern mode must respect tabSize=8');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-M5: Extension config overrides editor.tabSize', async () => {
    const content = `import { VeryLongName, AnotherLong, ThirdLong, FourthLong } from 'lib';

const x = VeryLongName;
const y = AnotherLong;
const z = ThirdLong;
const a = FourthLong;
`;

    const expected = `import {
     AnotherLong,
     FourthLong,
     ThirdLong,
     VeryLongName,
} from 'lib';

const x = VeryLongName;
const y = AnotherLong;
const z = ThirdLong;
const a = FourthLong;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 50; }
        public indentation() { return '     '; } // 5 spaces (extension config)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Extension config must override editor.tabSize');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-M6: Extension config insertSpaces = false uses tabs', async () => {
    const content = `import { A, B, C, D } from 'lib';

const x = A + B + C + D;
`;

    const expected = `import {
\tA,
\tB,
\tC,
\tD,
} from 'lib';

const x = A + B + C + D;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 10; } // Force multiline
        public indentation() { return '\t'; } // Tabs from extension config
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.ok(result.includes('\t'), 'Must use tabs');
      assert.strictEqual(result, expected, 'Extension insertSpaces=false must use tabs');
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('ImportManager - Indentation - useOnlyExtensionSettings', () => {

  test('INDENT-U1: Ignores editor.tabSize when useOnlyExtensionSettings = true', async () => {
    const content = `import { LongNameA, LongNameB, LongNameC, LongNameD } from 'library';

const x = LongNameA + LongNameB + LongNameC + LongNameD;
`;

    const expected = `import {
  LongNameA,
  LongNameB,
  LongNameC,
  LongNameD,
} from 'library';

const x = LongNameA + LongNameB + LongNameC + LongNameD;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public useOnlyExtensionSettings() { return true; }
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 40; } // Force multiline
        public indentation() { return '  '; } // 2 spaces (extension only)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'useOnlyExtensionSettings must ignore VS Code settings');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-U2: Ignores editor.insertSpaces when useOnlyExtensionSettings = true', async () => {
    const content = `import { ComponentA, ComponentB, ComponentC } from 'lib';

const x = ComponentA + ComponentB + ComponentC;
`;

    const expected = `import {
\tComponentA,
\tComponentB,
\tComponentC,
} from 'lib';

const x = ComponentA + ComponentB + ComponentC;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public useOnlyExtensionSettings() { return true; }
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 30; } // Force multiline (lower threshold)
        public indentation() { return '\t'; } // Tabs (extension only)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.ok(result.includes('\t'), 'Must use tabs from extension config');
      assert.strictEqual(result, expected, 'useOnlyExtensionSettings must ignore editor.insertSpaces');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-U3: Works in legacy mode too', async () => {
    const content = `import { LongNameA, LongNameB, LongNameC, LongNameD } from 'library';

const x = LongNameA + LongNameB + LongNameC + LongNameD;
`;

    const expected = `import {
  LongNameA,
  LongNameB,
  LongNameC,
  LongNameD,
} from 'library';

const x = LongNameA + LongNameB + LongNameC + LongNameD;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public useOnlyExtensionSettings() { return true; }
        public legacyMode() { return true; } // Legacy mode
        public multiLineWrapThreshold() { return 40; } // Force multiline
        public indentation() { return '  '; } // 2 spaces (NOT 4, because useOnlyExtensionSettings overrides)
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'useOnlyExtensionSettings must override legacy mode defaults');
    } finally {
      await deleteTempDocument(doc);
    }
  });
});

suite('ImportManager - Indentation - Edge Cases', () => {

  test('INDENT-E1: Single-line import unchanged', async () => {
    const content = `import { A, B } from 'lib';

const x = A + B;
`;

    const expected = `import { A, B } from 'lib';

const x = A + B;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new ImportsConfig();
      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Single-line import must stay single-line');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-E2: Comments preserve indentation', async () => {
    const content = `import {
  A, // comment
  B
} from 'lib';

const x = A + B;
`;

    const expected = `import {
  A, // comment
  B,
} from 'lib';

const x = A + B;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public indentation() { return '  '; } // 2 spaces
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Comments must preserve indentation');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-E3: Very large tabSize (16) works', async () => {
    const content = `import { A, B, C } from 'lib';

const x = A + B + C;
`;

    const expected = `import {
                A,
                B,
                C,
} from 'lib';

const x = A + B + C;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 10; } // Force multiline
        public indentation() { return '                '; } // 16 spaces
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Must handle very large tabSize');
    } finally {
      await deleteTempDocument(doc);
    }
  });

  test('INDENT-E4: tabSize = 1 works', async () => {
    const content = `import { A, B, C } from 'lib';

const x = A + B + C;
`;

    const expected = `import {
 A,
 B,
 C,
} from 'lib';

const x = A + B + C;
`;

    const doc = await createTempDocument(content);

    try {
      const config = new (class extends ImportsConfig {
        public legacyMode() { return false; }
        public multiLineWrapThreshold() { return 10; } // Force multiline
        public indentation() { return ' '; } // 1 space
      })();

      const manager = new ImportManager(doc, config);
      const edits = await manager.organizeImports();

      const edit = new (await import('vscode')).WorkspaceEdit();
      edit.set(doc.uri, edits);
      await (await import('vscode')).workspace.applyEdit(edit);

      const result = doc.getText();
      assert.strictEqual(result, expected, 'Must handle tabSize=1');
    } finally {
      await deleteTempDocument(doc);
    }
  });
});
