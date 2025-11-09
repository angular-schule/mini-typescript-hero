/**
 * SHARED BEHAVIOR TEST
 *
 * Documents shared behavior between TypeScript Hero and Mini TypeScript Hero.
 * These are NOT bugs or parser limitations - just features we haven't implemented.
 */

import { strict as assert } from 'assert';
import { organizeImportsOld } from '../old-extension/adapter';
import { organizeImportsNew } from '../new-extension/adapter';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHARED BEHAVIOR - COMMENT DELETION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BOTH extensions delete inline comments from import statements when organizing.
 * This is NOT a parser limitation - the parsers provide comment ranges if we ask.
 * We just haven't implemented the additional work to preserve them.
 *
 * THE PARSERS DO THEIR JOB:
 * - Both parsers create the AST (their job)
 * - Both provide access to comments via the underlying TypeScript compiler API
 * - node-typescript-parser: wraps TypeScript compiler (has access to ts.getLeadingCommentRanges)
 * - ts-morph: wraps TypeScript compiler (provides node.getLeadingCommentRanges())
 * - The parsers give us everything we need - we just have to ask for it
 *
 * WE HAVEN'T DONE THE WORK:
 * To preserve comments, we would need to:
 *   1. Extract comment ranges before organizing imports
 *   2. Associate each comment with its import specifier
 *   3. Track comments through reorganization (merging, sorting, removing imports)
 *   4. Re-insert comments at the correct positions in the new code
 *   5. Handle edge cases (what if imports merge? what if unused imports are removed?)
 *
 * WHY WE DIDN'T IMPLEMENT IT:
 * - Significant implementation complexity
 * - Edge cases are tricky (merged imports, removed imports, multiline)
 * - Low benefit (most people don't use inline import comments)
 * - Both extensions chose not to invest the effort
 *
 * REFERENCES:
 * - TypeScript issue #60431: https://github.com/microsoft/TypeScript/issues/60431
 *   "Organize imports" eats comments (affects ts-morph since it wraps TypeScript API)
 * - TypeScript issue #29028: https://github.com/microsoft/TypeScript/issues/29028
 *   "source.organizeImports" is reordering imports and comments
 * - ts-morph Comments docs: https://ts-morph.com/details/comments
 *   "Comments must be manually retrieved via getLeadingCommentRanges()"
 * - ts-morph wraps TypeScript Compiler API: https://github.com/dsherret/ts-morph
 *   "TypeScript Compiler API wrapper for static analysis and programmatic code changes"
 *
 * TEST METHODOLOGY:
 * These tests use the ACTUAL old extension code (git submodule at ../old-typescript-hero/)
 * with REAL VSCode APIs - NO MOCKS, NO SIMULATIONS.
 *
 * Each test:
 * 1. Creates a real .ts file in the filesystem
 * 2. Calls each extension's REAL ImportManager class
 * 3. Applies the REAL TextEdits returned
 * 4. Reads back the ACTUAL result from the file
 * 5. Compares OLD vs NEW behavior
 *
 * CONCLUSION:
 * ✓ The parsers do their job - they provide everything we need
 * ✓ We just haven't implemented comment preservation (our choice, not a limitation)
 * ✓ New extension maintains backward compatibility with old extension behavior
 * ═══════════════════════════════════════════════════════════════════════════
 */

suite('Shared Behavior - Comment Deletion', () => {
  test('Both extensions strip trailing line comments', async () => {
    const input = `import {
  Z, // comment after Z
  A,
  B // comment after B
} from 'lib';

const x = A + B + Z;
`;

    const expected = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    // Disable removal to focus on comment handling
    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, { disableImportRemovalOnOrganize: true });

    // ACTUAL BEHAVIOR: Both extensions STRIP trailing line comments
    // We didn't implement comment preservation (not a parser limitation)
    assert.strictEqual(oldResult, expected, 'Old extension strips trailing line comments');
    assert.strictEqual(newResult, expected, 'New extension also strips trailing line comments');
  });

  test('Both extensions strip leading block comments', async () => {
    const input = `import {
  Z,
  /* block comment */ A,
  B
} from 'lib';

const x = A + B + Z;
`;

    const expected = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    // Disable removal to focus on comment handling
    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, { disableImportRemovalOnOrganize: true });

    // ACTUAL BEHAVIOR: Both extensions STRIP leading block comments
    // We didn't implement comment preservation (not a parser limitation)
    assert.strictEqual(oldResult, expected, 'Old extension strips leading block comments');
    assert.strictEqual(newResult, expected, 'New extension also strips leading block comments');
  });
});
