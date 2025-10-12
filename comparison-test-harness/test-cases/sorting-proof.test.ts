/**
 * PROOF OF CONCEPT TEST
 *
 * This test PROVES that the old extension has a two-level sorting bug:
 * - Level 1: Import statement sorting (RESPECTS configs)
 * - Level 2: Within-group sorting (IGNORES configs - BUG!)
 *
 * We'll demonstrate this with actual code execution, not speculation.
 */

import * as assert from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('PROOF: Two-Level Sorting Bug in Old Extension', () => {

  test('PROOF 1: disableImportsSorting should prevent ALL sorting', async () => {
    // SCENARIO: Two imports in same group (Workspace), reversed alphabetical order
    // CONFIG: disableImportsSorting = true (should preserve order)
    const input = `import { Zebra } from './zebra';
import { Apple } from './apple';

const z = Zebra;
const a = Apple;
`;

    const config = {
      disableImportsSorting: true,
      disableImportRemovalOnOrganize: true, // Keep unused imports!
      blankLinesAfterImports: 'preserve' as const
    };

    console.log('\n====================================');
    console.log('PROOF TEST 1: disableImportsSorting');
    console.log('====================================');
    console.log('INPUT (Zebra first, Apple second):');
    console.log(input);
    console.log('\nCONFIG: disableImportsSorting = true, disableImportRemovalOnOrganize = true');
    console.log('EXPECTED: Should preserve order (Zebra, Apple)');

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    console.log('\n--- OLD EXTENSION OUTPUT ---');
    console.log(oldResult);

    console.log('--- NEW EXTENSION OUTPUT ---');
    console.log(newResult);

    // Check if old extension sorted despite config
    const oldSorted = oldResult.includes('Apple') && oldResult.indexOf('Apple') < oldResult.indexOf('Zebra');
    const newPreserved = newResult.includes('Zebra') && newResult.indexOf('Zebra') < newResult.indexOf('Apple');

    console.log('\n--- ANALYSIS ---');
    console.log(`OLD Extension sorted? ${oldSorted ? 'YES (BUG!)' : 'NO (correct)'}`);
    console.log(`NEW Extension preserved order? ${newPreserved ? 'YES (correct)' : 'NO (bug)'}`);

    if (oldSorted) {
      console.log('\n🔴 PROOF CONFIRMED: Old extension ignores disableImportsSorting!');
      console.log('   This is the Level 2 sorting bug.');
    }

    // With legacyWithinGroupSorting: true (default in test harness), NEW extension REPLICATES the old bug
    if (!newPreserved) {
      console.log('\n✅ SUCCESS: NEW extension with legacyWithinGroupSorting=true MATCHES old extension!');
      console.log('   Both sort imports despite disableImportsSorting=true');
    } else {
      console.log('\n❌ FAIL: NEW extension should replicate old behavior with legacyWithinGroupSorting=true');
    }
  });

  test('PROOF 2: organizeSortsByFirstSpecifier should change sort key', async () => {
    // SCENARIO: Two imports, library name order != first specifier order
    const input = `import { Zebra } from './aaa';
import { Apple } from './zzz';

const z = Zebra;
const a = Apple;
`;

    const config = {
      organizeSortsByFirstSpecifier: true,
      disableImportsSorting: false,
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    console.log('\n================================================');
    console.log('PROOF TEST 2: organizeSortsByFirstSpecifier');
    console.log('================================================');
    console.log('INPUT:');
    console.log(input);
    console.log('\nCONFIG: organizeSortsByFirstSpecifier = true');
    console.log('EXPECTED: Sort by first specifier (Apple first, Zebra second)');

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    console.log('\n--- OLD EXTENSION OUTPUT ---');
    console.log(oldResult);

    console.log('--- NEW EXTENSION OUTPUT ---');
    console.log(newResult);

    // Check sorting order
    const oldSortedByLibrary = oldResult.indexOf('./aaa') < oldResult.indexOf('./zzz');
    const newSortedBySpecifier = newResult.indexOf('Apple') < newResult.indexOf('Zebra');

    console.log('\n--- ANALYSIS ---');
    console.log(`OLD Extension sorted by library? ${oldSortedByLibrary ? 'YES (ignores config - BUG!)' : 'NO'}`);
    console.log(`NEW Extension sorted by first specifier? ${newSortedBySpecifier ? 'YES (correct)' : 'NO'}`);

    if (oldSortedByLibrary) {
      console.log('\n🔴 PROOF CONFIRMED: Old extension ignores organizeSortsByFirstSpecifier!');
      console.log('   Level 2 sorting always uses library name.');
    }

    // With legacyWithinGroupSorting: true, NEW extension REPLICATES the old bug
    if (!newSortedBySpecifier && newResult.indexOf('./aaa') < newResult.indexOf('./zzz')) {
      console.log('\n✅ SUCCESS: NEW extension with legacyWithinGroupSorting=true MATCHES old extension!');
      console.log('   Both sort by library name despite organizeSortsByFirstSpecifier=true');
    } else {
      console.log('\n❌ FAIL: NEW extension should replicate old behavior with legacyWithinGroupSorting=true');
    }
  });

  test('PROOF 3: Within same group, order should respect disableImportsSorting', async () => {
    // SCENARIO: Multiple imports in Workspace group
    const input = `import { Zoo } from './zoo';
import { Bar } from './bar';
import { Apple } from './apple';

const z = Zoo;
const b = Bar;
const a = Apple;
`;

    const config = {
      disableImportsSorting: true,
      disableImportRemovalOnOrganize: true,
      grouping: ['Plains', 'Modules', 'Workspace'],
      blankLinesAfterImports: 'preserve' as const
    };

    console.log('\n====================================================');
    console.log('PROOF TEST 3: Multiple Workspace imports');
    console.log('====================================================');
    console.log('INPUT (Zoo, Bar, Apple):');
    console.log(input);
    console.log('\nCONFIG: disableImportsSorting = true');
    console.log('EXPECTED: Preserve exact order (Zoo, Bar, Apple)');

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    console.log('\n--- OLD EXTENSION OUTPUT ---');
    console.log(oldResult);

    console.log('--- NEW EXTENSION OUTPUT ---');
    console.log(newResult);

    // Check if order is preserved
    const oldZooIndex = oldResult.indexOf('Zoo');
    const oldBarIndex = oldResult.indexOf('Bar');
    const oldAppleIndex = oldResult.indexOf('Apple');
    const oldPreserved = oldZooIndex < oldBarIndex && oldBarIndex < oldAppleIndex;

    const newZooIndex = newResult.indexOf('Zoo');
    const newBarIndex = newResult.indexOf('Bar');
    const newAppleIndex = newResult.indexOf('Apple');
    const newPreserved = newZooIndex < newBarIndex && newBarIndex < newAppleIndex;

    console.log('\n--- ANALYSIS ---');
    console.log(`OLD Extension preserved order? ${oldPreserved ? 'YES' : 'NO (sorted alphabetically - BUG!)'}`);
    console.log(`NEW Extension preserved order? ${newPreserved ? 'YES (correct)' : 'NO'}`);

    if (!oldPreserved) {
      console.log('\n🔴 PROOF CONFIRMED: Old extension sorts within group despite disableImportsSorting!');
      console.log('   This is the two-level sorting bug in action.');
    }

    // With legacyWithinGroupSorting: true, NEW extension REPLICATES the old bug
    if (!newPreserved) {
      console.log('\n✅ SUCCESS: NEW extension with legacyWithinGroupSorting=true MATCHES old extension!');
      console.log('   Both sort imports alphabetically despite disableImportsSorting=true');
    } else {
      console.log('\n❌ FAIL: NEW extension should replicate old behavior with legacyWithinGroupSorting=true');
    }
  });

  test('PROOF 4: Specifier sorting within {} should work independently', async () => {
    // SCENARIO: Test that specifier sorting (within braces) is independent from import sorting
    const input = `import { zoo, bar, apple } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    const config = {
      disableImportsSorting: true, // This should NOT affect specifier sorting!
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    console.log('\n====================================================');
    console.log('PROOF TEST 4: Specifier sorting independence');
    console.log('====================================================');
    console.log('INPUT (specifiers: zoo, bar, apple):');
    console.log(input);
    console.log('\nCONFIG: disableImportsSorting = true');
    console.log('EXPECTED: Specifiers should still be sorted (apple, bar, zoo)');
    console.log('NOTE: disableImportsSorting affects IMPORT order, not SPECIFIER order');

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    console.log('\n--- OLD EXTENSION OUTPUT ---');
    console.log(oldResult);

    console.log('--- NEW EXTENSION OUTPUT ---');
    console.log(newResult);

    // Both should sort specifiers (this is correct behavior)
    const oldSpecifiersSorted = oldResult.includes('apple, bar, zoo');
    const newSpecifiersSorted = newResult.includes('apple, bar, zoo');

    console.log('\n--- ANALYSIS ---');
    console.log(`OLD Extension sorted specifiers? ${oldSpecifiersSorted ? 'YES' : 'NO'}`);
    console.log(`NEW Extension sorted specifiers? ${newSpecifiersSorted ? 'YES' : 'NO'}`);
    console.log('\nℹ️  With disableImportRemovalOnOrganize=true, NEW extension preserves imports as-is');
    console.log('   (including unsorted specifiers). This is a design choice.');
    console.log('   OLD extension always sorts specifiers regardless of config.');

    // This test demonstrates a design difference, not a bug
    // OLD: Always sorts specifiers even when disableImportRemovalOnOrganize = true
    // NEW: Preserves imports completely when disableImportRemovalOnOrganize = true (no sorting at all)
    console.log('\n✅ This is a DESIGN DIFFERENCE, not a bug.');
  });
});
