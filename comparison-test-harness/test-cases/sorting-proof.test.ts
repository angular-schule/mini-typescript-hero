/**
 * Within-Group Sorting Bug Replication
 *
 * This test documents a CONFIRMED BUG in the old TypeScript Hero extension:
 * The old extension ALWAYS sorts imports within groups by library name, completely
 * ignoring both disableImportsSorting and organizeSortsByFirstSpecifier settings.
 *
 * This is the "Level 2 sorting bug" mentioned in src/imports/import-manager.ts
 *
 * EVIDENCE:
 * - Config names imply behavior (disableImportsSorting should disable ALL sorting)
 * - Old extension code shows this is unintended behavior, not design choice
 * - New extension explicitly refers to this as a bug in code comments
 *
 * WHY WE REPLICATE THIS BUG:
 * We replicate this bug ONLY in legacyMode (legacyMode: true) for 100% backward
 * compatibility with users who migrated from TypeScript Hero. Their codebases
 * depend on the exact old output format.
 *
 * Modern mode (legacyMode: false) FIXES this bug and respects the config settings.
 *
 * TECHNICAL IMPLEMENTATION:
 * - legacyWithinGroupSorting is NOT user-configurable
 * - It's controlled entirely by the legacyMode flag
 * - See src/configuration/imports-config.ts:legacyWithinGroupSorting()
 */

import * as assert from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Within-Group Sorting Bug', () => {

  test('BUG 1: disableImportsSorting ignored - sorts within group anyway', async () => {
    // SCENARIO: Two imports in same group (Workspace), reversed alphabetical order
    // CONFIG: disableImportsSorting = true (should preserve order, but old extension IGNORES this)
    const input = `import { Zebra } from './zebra';
import { Apple } from './apple';

const z = Zebra;
const a = Apple;
`;

    // Expected: Old extension SORTS despite disableImportsSorting (BUG!)
    // New extension in legacy mode replicates this bug for backward compatibility
    const expected = `import { Apple } from './apple';
import { Zebra } from './zebra';

const z = Zebra;
const a = Apple;
`;

    const config = {
      legacyMode: true,  // ✅ EXPLICIT - replicates bug for backward compatibility
      disableImportsSorting: true,  // ❌ IGNORED in legacy mode (bug!)
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension sorts despite disableImportsSorting (bug)');
    assert.strictEqual(newResult, expected, 'New extension replicates bug in legacy mode');
  });

  test('BUG 2: organizeSortsByFirstSpecifier ignored - sorts by library name anyway', async () => {
    // SCENARIO: Two imports, library name order != first specifier order
    // CONFIG: organizeSortsByFirstSpecifier = true (should sort by first specifier, but old extension IGNORES this)
    const input = `import { Zebra } from './aaa';
import { Apple } from './zzz';

const z = Zebra;
const a = Apple;
`;

    // Expected: Old extension sorts by LIBRARY NAME despite organizeSortsByFirstSpecifier (BUG!)
    // Should sort by first specifier (Apple < Zebra), but sorts by library (./aaa < ./zzz)
    // New extension in legacy mode replicates this bug for backward compatibility
    const expected = `import { Zebra } from './aaa';
import { Apple } from './zzz';

const z = Zebra;
const a = Apple;
`;

    const config = {
      legacyMode: true,  // ✅ EXPLICIT - replicates bug for backward compatibility
      organizeSortsByFirstSpecifier: true,  // ❌ IGNORED in legacy mode (bug!)
      disableImportsSorting: false,
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension sorts by library despite organizeSortsByFirstSpecifier (bug)');
    assert.strictEqual(newResult, expected, 'New extension replicates bug in legacy mode');
  });

  test('BUG 3: Multiple imports - disableImportsSorting still sorts within group', async () => {
    // SCENARIO: Multiple imports in Workspace group
    // CONFIG: disableImportsSorting = true (should preserve order, but old extension IGNORES this)
    const input = `import { Zoo } from './zoo';
import { Bar } from './bar';
import { Apple } from './apple';

const z = Zoo;
const b = Bar;
const a = Apple;
`;

    // Expected: Old extension SORTS despite disableImportsSorting (BUG!)
    // New extension in legacy mode replicates this bug for backward compatibility
    const expected = `import { Apple } from './apple';
import { Bar } from './bar';
import { Zoo } from './zoo';

const z = Zoo;
const b = Bar;
const a = Apple;
`;

    const config = {
      legacyMode: true,  // ✅ EXPLICIT - replicates bug for backward compatibility
      disableImportsSorting: true,  // ❌ IGNORED in legacy mode (bug!)
      disableImportRemovalOnOrganize: true,
      grouping: ['Plains', 'Modules', 'Workspace'],
      blankLinesAfterImports: 'preserve' as const
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension sorts despite disableImportsSorting (bug)');
    assert.strictEqual(newResult, expected, 'New extension replicates bug in legacy mode');
  });

  test('BUG 4: disableImportsSorting does NOT affect specifier sorting (within braces)', async () => {
    // SCENARIO: Test that specifier sorting (within braces) is independent from import sorting
    // This is actually CORRECT behavior, not a bug - disableImportsSorting affects import ORDER, not specifier ORDER
    const input = `import { zoo, bar, apple } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    // Expected: Specifiers are ALWAYS sorted (this is correct - disableImportsSorting doesn't affect specifiers)
    // The bug is that imports are ALSO sorted despite disableImportsSorting
    const expected = `import { apple, bar, zoo } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    const config = {
      legacyMode: true,  // ✅ EXPLICIT - replicates bug for backward compatibility
      disableImportsSorting: true, // Affects import ORDER (ignored in legacy mode), NOT specifier sorting
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(oldResult, expected, 'Old extension sorts specifiers (correct) and imports (bug)');
    assert.strictEqual(newResult, expected, 'New extension replicates behavior in legacy mode');
  });
});

suite('Modern Mode - Fixes Sorting Bugs', () => {

  test('MODERN: disableImportsSorting WORKS - preserves original order', async () => {
    // SCENARIO: Same as BUG 1, but with legacyMode: false
    // CONFIG: disableImportsSorting = true (should preserve order)
    const input = `import { Zebra } from './zebra';
import { Apple } from './apple';

const z = Zebra;
const a = Apple;
`;

    // Expected: Modern mode RESPECTS disableImportsSorting (preserves order)
    const expected = `import { Zebra } from './zebra';
import { Apple } from './apple';

const z = Zebra;
const a = Apple;
`;

    const config = {
      legacyMode: false,  // ✅ Modern mode - FIXES bug!
      disableImportsSorting: true,  // ✅ RESPECTED in modern mode
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(newResult, expected, 'Modern mode respects disableImportsSorting');
  });

  test('MODERN: organizeSortsByFirstSpecifier WORKS - sorts by first specifier', async () => {
    // SCENARIO: Same as BUG 2, but with legacyMode: false
    // CONFIG: organizeSortsByFirstSpecifier = true (should sort by first specifier)
    const input = `import { Zebra } from './aaa';
import { Apple } from './zzz';

const z = Zebra;
const a = Apple;
`;

    // Expected: Modern mode sorts by FIRST SPECIFIER (Apple < Zebra), not library name
    const expected = `import { Apple } from './zzz';
import { Zebra } from './aaa';

const z = Zebra;
const a = Apple;
`;

    const config = {
      legacyMode: false,  // ✅ Modern mode - FIXES bug!
      organizeSortsByFirstSpecifier: true,  // ✅ RESPECTED in modern mode
      disableImportsSorting: false,
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(newResult, expected, 'Modern mode sorts by first specifier');
  });

  test('MODERN: Multiple imports with disableImportsSorting preserves order', async () => {
    // SCENARIO: Same as BUG 3, but with legacyMode: false
    // CONFIG: disableImportsSorting = true (should preserve order)
    const input = `import { Zoo } from './zoo';
import { Bar } from './bar';
import { Apple } from './apple';

const z = Zoo;
const b = Bar;
const a = Apple;
`;

    // Expected: Modern mode PRESERVES original order
    const expected = `import { Zoo } from './zoo';
import { Bar } from './bar';
import { Apple } from './apple';

const z = Zoo;
const b = Bar;
const a = Apple;
`;

    const config = {
      legacyMode: false,  // ✅ Modern mode - FIXES bug!
      disableImportsSorting: true,  // ✅ RESPECTED in modern mode
      disableImportRemovalOnOrganize: true,
      grouping: ['Plains', 'Modules', 'Workspace'],
      blankLinesAfterImports: 'one' as const
    };

    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(newResult, expected, 'Modern mode preserves order when disableImportsSorting is true');
  });

  test('MODERN: Specifier sorting still works independently from import sorting', async () => {
    // SCENARIO: Same as BUG 4, but demonstrating correct modern behavior
    // This is CORRECT in both modes - specifier sorting is independent
    const input = `import { zoo, bar, apple } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    // Expected: Specifiers are sorted (correct), imports order is preserved (disableImportsSorting: true)
    const expected = `import { apple, bar, zoo } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    const config = {
      legacyMode: false,  // ✅ Modern mode
      disableImportsSorting: true, // Affects import ORDER, NOT specifier sorting
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const newResult = await organizeImportsNew(input, config);

    assert.strictEqual(newResult, expected, 'Modern mode sorts specifiers correctly (independent from import sorting)');
  });
});
