/**
 * VS Code Organize Imports Behavior Documentation Tests
 *
 * PURPOSE:
 * ========
 * This test file documents EXACTLY what VS Code's built-in organizeImports command does.
 * We call VS Code's ACTUAL "editor.action.organizeImports" command to test real behavior.
 *
 * WHY THIS EXISTS:
 * ================
 * - Know your "competition": Understand what VS Code's built-in can/cannot do
 * - Evidence-based claims: No speculation, direct testing of VS Code command
 * - Documentation: Tests serve as living proof of our differentiators
 * - Accuracy: Prevents false claims in README and blog post
 *
 * WHAT WE'RE TESTING:
 * ===================
 * We're testing VS Code's actual "editor.action.organizeImports" command.
 * This is the REAL command users invoke with Shift+Alt+O.
 *
 * IMPLEMENTATION:
 * ===============
 * We create real temp files, open them in VS Code, execute the actual
 * "editor.action.organizeImports" command, and capture the result.
 *
 * KEY FINDINGS (from research):
 * =============================
 * - PR #48330 (TypeScript 4.7+): Group-aware organize imports
 * - Preserves blank lines between imports as group separators
 * - Sorts within each group independently
 * - Does NOT automatically create groups based on patterns
 */

import * as assert from 'assert';
import * as fs from 'fs';
import { commands, window } from 'vscode';
import { createTempDocument, deleteTempDocument } from './test-helpers';

suite('VS Code Organize Imports Behavior (Real VS Code Command)', () => {
  /**
   * Helper function to organize imports using VS Code's ACTUAL command
   * This executes "editor.action.organizeImports" - the real command!
   */
  async function organizeImportsViaVSCode(content: string): Promise<string> {
    // Create temp file using shared helper
    const doc = await createTempDocument(content, 'ts');

    try {
      // Show document in editor
      await window.showTextDocument(doc);

      // Save the document (VS Code organize imports requires a saved file)
      await doc.save();

      // Wait for TypeScript to analyze the file
      // CRITICAL: Without this delay, VS Code's organize imports does nothing!
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Execute VS Code's ACTUAL organize imports command
      await commands.executeCommand('editor.action.organizeImports');

      // CRITICAL: The command executes asynchronously even though we await it!
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save to capture changes
      await doc.save();

      // Read the file from disk to get the actual result
      return fs.readFileSync(doc.uri.fsPath, 'utf-8');
    } finally {
      // Cleanup using shared helper
      await deleteTempDocument(doc);
    }
  }

  suite('Group Preservation (TypeScript 4.7+ Feature)', () => {
    test('preserves blank lines between import groups', async () => {
      // Test with blank line between external (@angular) and internal (./services) imports
      const input = `import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { UserService } from './services';
import { BookService } from './config';

declare const x: Component;
declare const y: Router;
declare const z: UserService;
declare const w: BookService;
`;

      // VS Code preserves the blank line and sorts within each group
      // Alphabetically: 'c' < 's', so './config' comes before './services'
      const expected = `import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { BookService } from './config';
import { UserService } from './services';

declare const x: Component;
declare const y: Router;
declare const z: UserService;
declare const w: BookService;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should preserve blank lines and sort within groups');
    });

    test('sorts within each group independently', async () => {
      const input = `import { z } from 'z-package';
import { a } from 'a-package';

import { zebra } from './zebra';
import { apple } from './apple';

declare const a1: a;
declare const z1: z;
declare const ap: apple;
declare const ze: zebra;
`;

      const expected = `import { a } from 'a-package';
import { z } from 'z-package';

import { apple } from './apple';
import { zebra } from './zebra';

declare const a1: a;
declare const z1: z;
declare const ap: apple;
declare const ze: zebra;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should sort each group independently');
    });

    test('preserves comments between groups', async () => {
      const input = `// Framework imports
import { Component } from '@angular/core';

// Local imports
import { UserService } from './services/user';

declare const x: Component;
declare const y: UserService;
`;

      const expected = `// Framework imports
import { Component } from '@angular/core';

// Local imports
import { UserService } from './services/user';

declare const x: Component;
declare const y: UserService;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should preserve comments between groups');
    });
  });

  suite('Duplicate Import Merging', () => {
    test('merges multiple imports from same module', async () => {
      const input = `import { Component } from '@angular/core';
import { OnInit } from '@angular/core';

const x: Component = {};
const y: OnInit = {};
`;

      // VS Code DOES add spaces after commas in merged imports
      const expected = `import { Component, OnInit } from '@angular/core';

const x: Component = {};
const y: OnInit = {};
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should merge imports from same module with spaces');
    });

    test('combines named imports correctly', async () => {
      const input = `import { A, B } from './lib';
import { C, D } from './lib';

const a: A = {};
const b: B = {};
const c: C = {};
const d: D = {};
`;

      // VS Code DOES add spaces after commas in merged imports
      const expected = `import { A, B, C, D } from './lib';

const a: A = {};
const b: B = {};
const c: C = {};
const d: D = {};
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should combine all named imports into one statement with spaces');
    });
  });

  suite('Basic Features', () => {
    test('removes unused imports', async () => {
      const input = `import { Component, OnInit } from '@angular/core';
import { UnusedService } from './unused';

const x: Component = {};
`;

      const expected = `import { Component } from '@angular/core';

const x: Component = {};
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should remove unused imports and specifiers');
    });

    test('sorts alphabetically by module path', async () => {
      // Use REAL local imports that exist in the project
      const input = `import { ImportOrganizer } from './imports/import-organizer';
import { ImportsConfig } from './configuration/imports-config';
import { ImportManager } from './imports/import-manager';

const a: ImportsConfig = {};
const b: ImportManager = {};
const c: ImportOrganizer = {};
`;

      const expected = `import { ImportsConfig } from './configuration/imports-config';
import { ImportManager } from './imports/import-manager';
import { ImportOrganizer } from './imports/import-organizer';

const a: ImportsConfig = {};
const b: ImportManager = {};
const c: ImportOrganizer = {};
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should sort by module path alphabetically');
    });
  });

  suite('Limitations - What VS Code CANNOT Do (Our Differentiators)', () => {
    test('INVESTIGATION: Does VS Code automatically separate external vs internal imports?', async () => {
      // Test 1: Mix of external (node_modules) and internal (relative) imports
      // WITHOUT any blank lines initially
      const input = `import { UserService } from './services/user';
import { Component } from '@angular/core';
import { BookService } from './services/book';
import { Router } from '@angular/router';

const x: Component = {};
const y: Router = {};
const u: UserService = {};
const b: BookService = {};
`;

      const result = await organizeImportsViaVSCode(input);

      // Expected: VS Code sorts everything together alphabetically (no auto-grouping)
      const expected = `import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from './services/book';
import { UserService } from './services/user';

const x: Component = {};
const y: Router = {};
const u: UserService = {};
const b: BookService = {};
`;

      assert.strictEqual(result, expected, 'VS Code should sort all imports together without auto-grouping');

      // Verify no blank line exists between external and internal imports
      const lines = result.split('\n');
      const hasBlankLineBetweenGroups = lines.some((line, i) =>
        line === '' &&
        i > 0 &&
        lines[i - 1].includes('import') &&
        lines[i + 1]?.includes('import')
      );

      assert.strictEqual(
        hasBlankLineBetweenGroups,
        false,
        'Should have NO blank lines between imports (proves no automatic grouping)'
      );
    });

    test('does NOT automatically create groups based on PATTERN MATCHING (like /^@angular/)', async () => {
      // Even if VS Code separates external vs internal,
      // it does NOT do pattern-based grouping within external imports
      // (e.g., grouping all @angular together, all rxjs together)
      const input = `import { map } from 'rxjs/operators';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

const x: Component = {};
const y: Router = {};
const m = map;
const s = switchMap;
`;

      const result = await organizeImportsViaVSCode(input);

      // Expected: VS Code merges rxjs imports and sorts alphabetically
      // NO blank line separating Angular from RxJS (no pattern-based grouping)
      const expected = `import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

const x: Component = {};
const y: Router = {};
const m = map;
const s = switchMap;
`;

      assert.strictEqual(
        result,
        expected,
        'VS Code should merge rxjs imports but NOT create separate groups for @angular vs rxjs'
      );

      // Verify Angular and RxJS imports are NOT separated by blank line
      const importSection = result.split('\n\n')[0]; // Get everything before first blank line
      assert.ok(
        importSection.includes('@angular/core') && importSection.includes('rxjs/operators'),
        'Angular and RxJS imports should be in same group (no blank line between them)'
      );
    });

    test('does NOT remove /index from paths', async () => {
      const input = `import { UserService } from './services/user/index';
import { BookService } from './services/book/index';

const x: UserService = {};
const y: BookService = {};
`;

      const expected = `import { BookService } from './services/book/index';
import { UserService } from './services/user/index';

const x: UserService = {};
const y: BookService = {};
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'VS Code keeps /index in paths - does not remove it');

      // Mini TypeScript Hero with removeTrailingIndex: true
      // Would change './services/user/index' → './services/user'
    });

    test('does NOT sort by first specifier - only sorts by module path', async () => {
      const input = `import { Zebra } from 'a-package';
import { Apple } from 'z-package';

const x: Zebra = {};
const y: Apple = {};
`;

      // VS Code sorts by module path (a-package, z-package)
      // NOT by first specifier (Apple, Zebra)
      const expected = `import { Zebra } from 'a-package';
import { Apple } from 'z-package';

const x: Zebra = {};
const y: Apple = {};
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'VS Code sorts by module path, not first specifier');

      // Mini TypeScript Hero with organizeSortsByFirstSpecifier: true
      // Would sort by first specifier: Apple (from z-package) before Zebra (from a-package)
    });
  });

  suite('Edge Cases - Comments and Real-World Scenarios', () => {
    test('CRITICAL: Does VS Code preserve comments WITHIN import statements?', async () => {
      // Real-world scenario: Developers add comments to explain why certain imports exist
      const input = `import { Component } from '@angular/core';
import { Router } from '@angular/router';
// This import is required for the payment gateway integration
import { PaymentService } from './services/payment';
import { UserService } from './services/user';

const x: Component = {};
const y: Router = {};
const z: PaymentService = {};
const w: UserService = {};
`;

      const result = await organizeImportsViaVSCode(input);

      // Expected: Comment is preserved (important for documentation)
      const expected = `import { Component } from '@angular/core';
import { Router } from '@angular/router';
// This import is required for the payment gateway integration
import { PaymentService } from './services/payment';
import { UserService } from './services/user';

const x: Component = {};
const y: Router = {};
const z: PaymentService = {};
const w: UserService = {};
`;

      assert.strictEqual(result, expected, 'VS Code should preserve comment between imports');

      // Verify comment is preserved with exact text
      assert.ok(result.includes('payment gateway'), 'Comment text should be preserved exactly');

      // Note: Comment acts as group separator - PaymentService and UserService stay below comment
      const lines = result.split('\n');
      const commentIndex = lines.findIndex(l => l.includes('payment gateway'));
      const paymentIndex = lines.findIndex(l => l.includes('PaymentService'));
      assert.ok(
        commentIndex >= 0 && paymentIndex > commentIndex,
        'Comment should appear before PaymentService import (acts as group separator)'
      );
    });

    test('CRITICAL: Does VS Code handle mixed external/internal imports WITHOUT auto-grouping?', async () => {
      // Chaotic real-world scenario: imports are all over the place
      const input = `import { UserService } from './services/user';
import { Component } from '@angular/core';
import { BookService } from './services/book';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';
import { HttpClient } from '@angular/common/http';

const x: Component = {};
const y: Router = {};
const z: HttpClient = {};
const a: UserService = {};
const b: BookService = {};
const c: AuthService = {};
`;

      const expected = `import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';
import { BookService } from './services/book';
import { UserService } from './services/user';

const x: Component = {};
const y: Router = {};
const z: HttpClient = {};
const a: UserService = {};
const b: BookService = {};
const c: AuthService = {};
`;

      const result = await organizeImportsViaVSCode(input);

      // CRITICAL: VS Code should sort EVERYTHING alphabetically as ONE group
      // NO automatic separation between @angular and ./services
      assert.strictEqual(
        result,
        expected,
        'VS Code sorts ALL imports together alphabetically - no automatic grouping'
      );

      // Count newlines between import statements to prove no auto-grouping
      const firstImportLine = result.split('\n').findIndex(l => l.trim().startsWith('import'));
      const lastImportLine = result.split('\n').map((l, i) => ({ l, i })).filter(({ l }) => l.trim().startsWith('import')).pop()!.i;
      const linesInBetween = result.split('\n').slice(firstImportLine, lastImportLine + 1);
      const blankLinesBetweenImports = linesInBetween.filter(l => l.trim() === '').length;

      assert.strictEqual(
        blankLinesBetweenImports,
        0,
        'Should have ZERO blank lines between imports (all in one group)'
      );
    });

    test('EDGE CASE: Imports with side effects (plain imports) - does VS Code group them?', async () => {
      // Side-effect imports (e.g., polyfills, CSS)
      const input = `import { Component } from '@angular/core';
import 'zone.js';
import './styles.css';
import { Router } from '@angular/router';

const x: Component = {};
const y: Router = {};
`;

      const result = await organizeImportsViaVSCode(input);

      // Expected: Side-effect imports (string imports) sorted AFTER named imports
      const expected = `import { Component } from '@angular/core';
import { Router } from '@angular/router';
import 'zone.js';
import './styles.css';

const x: Component = {};
const y: Router = {};
`;

      assert.strictEqual(result, expected, 'VS Code should sort side-effect imports AFTER named imports');

      // Verify side-effect imports are preserved
      assert.ok(result.includes('zone.js'), 'Should preserve zone.js side-effect import');
      assert.ok(result.includes('styles.css'), 'Should preserve CSS side-effect import');

      // Verify side-effect imports come AFTER named imports
      const lines = result.split('\n');
      const namedImportLines = lines
        .map((l, i) => ({ line: l, index: i }))
        .filter(({ line }) => line.includes('import') && line.includes('from'));
      const lastNamedImportIndex = namedImportLines.length > 0 ? namedImportLines[namedImportLines.length - 1].index : -1;
      const firstSideEffectIndex = lines.findIndex(l => l.includes('zone.js'));

      assert.ok(
        firstSideEffectIndex > lastNamedImportIndex,
        'Side-effect imports should appear AFTER all named imports'
      );
    });
  });

});
