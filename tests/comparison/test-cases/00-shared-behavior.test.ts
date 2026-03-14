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

suite('Planned Difference - Comment Preservation', () => {
  // PLANNED DIFFERENCE: Old extension stripped specifier comments because its parser
  // (typescript-parser) couldn't parse them. Our new extension CAN parse them via ts-morph,
  // so we PRESERVE them. This is intentional: the golden rule says never delete user content.

  test('Old extension strips trailing line comments, new extension preserves them', async () => {
    const input = `import {
  Z, // comment after Z
  A,
  B // comment after B
} from 'lib';

const x = A + B + Z;
`;

    const expectedOld = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    // New extension preserves comments (causes multiline wrapping, 2-space indent in legacy mode)
    const expectedNew = `import {
  A,
  B, // comment after B
  Z, // comment after Z
} from 'lib';

const x = A + B + Z;
`;

    // Disable removal to focus on comment handling
    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, { disableImportRemovalOnOrganize: true });

    assert.strictEqual(oldResult, expectedOld, 'Old extension strips trailing line comments (parser limitation)');
    assert.strictEqual(newResult, expectedNew, 'New extension preserves trailing line comments');
  });

  test('Old extension strips leading block comments, new extension preserves them', async () => {
    const input = `import {
  Z,
  /* block comment */ A,
  B
} from 'lib';

const x = A + B + Z;
`;

    const expectedOld = `import { A, B, Z } from 'lib';

const x = A + B + Z;
`;

    // New extension preserves comments (causes multiline wrapping, 2-space indent in legacy mode)
    const expectedNew = `import {
  /* block comment */ A,
  B,
  Z,
} from 'lib';

const x = A + B + Z;
`;

    // Disable removal to focus on comment handling
    const oldResult = await organizeImportsOld(input, { disableImportRemovalOnOrganize: true });
    const newResult = await organizeImportsNew(input, { disableImportRemovalOnOrganize: true });

    assert.strictEqual(oldResult, expectedOld, 'Old extension strips leading block comments (parser limitation)');
    assert.strictEqual(newResult, expectedNew, 'New extension preserves leading block comments');
  });
});
