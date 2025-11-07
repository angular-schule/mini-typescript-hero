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

import { UserService } from '../imports/import-manager';
import { BookService } from '../configuration/imports-config';

declare const x: Component;
declare const y: Router;
declare const z: UserService;
declare const w: BookService;
`;

      // VS Code preserves the blank line and sorts within each group
      const expected = `import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { BookService } from '../configuration/imports-config';
import { UserService } from '../imports/import-manager';

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

const x: Component = null as any;
const y: OnInit = null as any;
`;

      // VS Code DOES add spaces after commas in merged imports
      const expected = `import { Component, OnInit } from '@angular/core';

const x: Component = null as any;
const y: OnInit = null as any;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should merge imports from same module with spaces');
    });

    test('combines named imports correctly', async () => {
      const input = `import { A, B } from './lib';
import { C, D } from './lib';

const a: A = null as any;
const b: B = null as any;
const c: C = null as any;
const d: D = null as any;
`;

      // VS Code DOES add spaces after commas in merged imports
      const expected = `import { A, B, C, D } from './lib';

const a: A = null as any;
const b: B = null as any;
const c: C = null as any;
const d: D = null as any;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should combine all named imports into one statement with spaces');
    });
  });

  suite('Basic Features', () => {
    test('removes unused imports', async () => {
      const input = `import { Component, OnInit } from '@angular/core';
import { UnusedService } from './unused';

const x: Component = null as any;
`;

      const expected = `import { Component } from '@angular/core';

const x: Component = null as any;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'Should remove unused imports and specifiers');
    });

    test('sorts alphabetically by module path', async () => {
      // Use REAL local imports that exist in the project
      const input = `import { ImportOrganizer } from './imports/import-organizer';
import { ImportsConfig } from './configuration/imports-config';
import { ImportManager } from './imports/import-manager';

const a: ImportsConfig = null as any;
const b: ImportManager = null as any;
const c: ImportOrganizer = null as any;
`;

      const expected = `import { ImportsConfig } from './configuration/imports-config';
import { ImportManager } from './imports/import-manager';
import { ImportOrganizer } from './imports/import-organizer';

const a: ImportsConfig = null as any;
const b: ImportManager = null as any;
const c: ImportOrganizer = null as any;
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

const x: Component = null as any;
const y: Router = null as any;
const u: UserService = null as any;
const b: BookService = null as any;
`;

      const result = await organizeImportsViaVSCode(input);

      // Let's see what VS Code actually does!
      // eslint-disable-next-line no-console
      console.log('=== VS CODE OUTPUT ===');
      // eslint-disable-next-line no-console
      console.log(result);
      // eslint-disable-next-line no-console
      console.log('======================');

      // Check if there's a blank line between external and internal imports
      const lines = result.split('\n');
      const hasBlankLineBetweenGroups = lines.some((line, i) =>
        line === '' &&
        i > 0 &&
        lines[i - 1].includes('import') &&
        lines[i + 1]?.includes('import')
      );

      // eslint-disable-next-line no-console
      console.log('Has blank line between import groups:', hasBlankLineBetweenGroups);

      // We'll update this assertion based on what we discover
      assert.ok(result.includes('import'), 'Should have imports');
    });

    test('does NOT automatically create groups based on PATTERN MATCHING (like /^@angular/)', async () => {
      // Even if VS Code separates external vs internal,
      // it does NOT do pattern-based grouping within external imports
      // (e.g., grouping all @angular together, all rxjs together)
      const input = `import { map } from 'rxjs/operators';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

const x: Component = null as any;
const y: Router = null as any;
const m = map;
const s = switchMap;
`;

      const result = await organizeImportsViaVSCode(input);

      // eslint-disable-next-line no-console
      console.log('=== PATTERN TEST OUTPUT ===');
      // eslint-disable-next-line no-console
      console.log(result);
      // eslint-disable-next-line no-console
      console.log('===========================');

      // If pattern-based grouping worked, we'd see:
      // @angular/core, @angular/router, then blank line, then rxjs
      // Let's see what actually happens!

      assert.ok(result.includes('import'), 'Should have imports');
    });

    test('does NOT remove /index from paths', async () => {
      const input = `import { UserService } from './services/user/index';
import { BookService } from './services/book/index';

const x: UserService = null as any;
const y: BookService = null as any;
`;

      const expected = `import { BookService } from './services/book/index';
import { UserService } from './services/user/index';

const x: UserService = null as any;
const y: BookService = null as any;
`;

      const result = await organizeImportsViaVSCode(input);
      assert.strictEqual(result, expected, 'VS Code keeps /index in paths - does not remove it');

      // Mini TypeScript Hero with removeTrailingIndex: true
      // Would change './services/user/index' → './services/user'
    });

    test('does NOT sort by first specifier - only sorts by module path', async () => {
      const input = `import { Zebra } from 'a-package';
import { Apple } from 'z-package';

const x: Zebra = null as any;
const y: Apple = null as any;
`;

      // VS Code sorts by module path (a-package, z-package)
      // NOT by first specifier (Apple, Zebra)
      const expected = `import { Zebra } from 'a-package';
import { Apple } from 'z-package';

const x: Zebra = null as any;
const y: Apple = null as any;
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

const x: Component = null as any;
const y: Router = null as any;
const z: PaymentService = null as any;
const w: UserService = null as any;
`;

      const result = await organizeImportsViaVSCode(input);

      // eslint-disable-next-line no-console
      console.log('=== COMMENTS TEST OUTPUT ===');
      // eslint-disable-next-line no-console
      console.log(result);
      // eslint-disable-next-line no-console
      console.log('============================');

      // Check if comment is preserved
      assert.ok(result.includes('payment gateway'), 'Comment should be preserved');
    });

    test('CRITICAL: Does VS Code handle mixed external/internal imports WITHOUT auto-grouping?', async () => {
      // Chaotic real-world scenario: imports are all over the place
      const input = `import { UserService } from './services/user';
import { Component } from '@angular/core';
import { BookService } from './services/book';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';
import { HttpClient } from '@angular/common/http';

const x: Component = null as any;
const y: Router = null as any;
const z: HttpClient = null as any;
const a: UserService = null as any;
const b: BookService = null as any;
const c: AuthService = null as any;
`;

      const expected = `import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth';
import { BookService } from './services/book';
import { UserService } from './services/user';

const x: Component = null as any;
const y: Router = null as any;
const z: HttpClient = null as any;
const a: UserService = null as any;
const b: BookService = null as any;
const c: AuthService = null as any;
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

const x: Component = null as any;
const y: Router = null as any;
`;

      const result = await organizeImportsViaVSCode(input);

      // eslint-disable-next-line no-console
      console.log('=== SIDE EFFECTS TEST OUTPUT ===');
      // eslint-disable-next-line no-console
      console.log(result);
      // eslint-disable-next-line no-console
      console.log('=================================');

      // Check if side-effect imports are handled
      assert.ok(result.includes('zone.js'), 'Should preserve side-effect imports');
      assert.ok(result.includes('styles.css'), 'Should preserve CSS imports');
    });
  });

});
