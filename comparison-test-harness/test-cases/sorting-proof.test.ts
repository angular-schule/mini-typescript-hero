/**
 * BEHAVIOR OBSERVATION TEST
 *
 * This test documents an OBSERVED BEHAVIOR in the old extension:
 * When using disableImportsSorting=true or organizeSortsByFirstSpecifier=true,
 * the old extension still sorts imports within groups by library name.
 *
 * NOTE: We have NOT verified whether this is:
 * - An unintended bug in the old extension
 * - Intentional design (configs only affect between-group sorting)
 * - A misunderstanding of the config's intended scope
 *
 * We replicate this behavior in legacyMode for backward compatibility.
 */

import * as assert from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Behavior Observation: Within-Group Sorting', () => {

  test('OBSERVATION 1: disableImportsSorting with within-group sorting', async () => {
    // SCENARIO: Two imports in same group (Workspace), reversed alphabetical order
    // CONFIG: disableImportsSorting = true (expected to preserve order)
    const input = `import { Zebra } from './zebra';
import { Apple } from './apple';

const z = Zebra;
const a = Apple;
`;

    // Expected: Old extension SORTS despite disableImportsSorting (legacy bug/behavior)
    const expected = `import { Apple } from './apple';
import { Zebra } from './zebra';

const z = Zebra;
const a = Apple;
`;

    const config = {
      disableImportsSorting: true,
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    // With legacyWithinGroupSorting: true, both extensions replicate old behavior
    assert.strictEqual(oldResult, expected, 'Old extension must produce observed behavior');
    assert.strictEqual(newResult, expected, 'New extension must replicate observed behavior');
  });

  test('OBSERVATION 2: organizeSortsByFirstSpecifier with within-group sorting', async () => {
    // SCENARIO: Two imports, library name order != first specifier order
    const input = `import { Zebra } from './aaa';
import { Apple } from './zzz';

const z = Zebra;
const a = Apple;
`;

    // Expected: Old extension sorts by LIBRARY NAME despite organizeSortsByFirstSpecifier
    const expected = `import { Zebra } from './aaa';
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

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    // With legacyWithinGroupSorting: true, both extensions replicate old behavior
    assert.strictEqual(oldResult, expected, 'Old extension must produce observed behavior');
    assert.strictEqual(newResult, expected, 'New extension must replicate observed behavior');
  });

  test('OBSERVATION 3: Multiple imports in same group with disableImportsSorting', async () => {
    // SCENARIO: Multiple imports in Workspace group
    const input = `import { Zoo } from './zoo';
import { Bar } from './bar';
import { Apple } from './apple';

const z = Zoo;
const b = Bar;
const a = Apple;
`;

    // Expected: Old extension SORTS despite disableImportsSorting
    const expected = `import { Apple } from './apple';
import { Bar } from './bar';
import { Zoo } from './zoo';

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

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    // With legacyWithinGroupSorting: true, both extensions replicate old behavior
    assert.strictEqual(oldResult, expected, 'Old extension must produce observed behavior');
    assert.strictEqual(newResult, expected, 'New extension must replicate observed behavior');
  });

  test('OBSERVATION 4: Specifier sorting independence', async () => {
    // SCENARIO: Test that specifier sorting (within braces) is independent from import sorting
    const input = `import { zoo, bar, apple } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    // Expected: Old extension sorts specifiers even with disableImportsSorting
    const expected = `import { apple, bar, zoo } from './stuff';

const z = zoo;
const b = bar;
const a = apple;
`;

    const config = {
      disableImportsSorting: true, // This should NOT affect specifier sorting!
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'preserve' as const
    };

    const oldResult = await organizeImportsOld(input, config);
    const newResult = await organizeImportsNew(input, config);

    // Both extensions replicate old behavior: specifiers sorted, imports sorted within group
    assert.strictEqual(oldResult, expected, 'Old extension must produce observed behavior');
    assert.strictEqual(newResult, expected, 'New extension must replicate observed behavior');
  });
});
