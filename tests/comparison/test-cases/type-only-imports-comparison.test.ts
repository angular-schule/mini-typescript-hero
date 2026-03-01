/**
 * Type-Only Import Handling - Legacy vs Modern Mode (NEW EXTENSION ONLY)
 *
 * NOTE: Despite being in the comparison test directory, this file does NOT run the
 * old TypeScript Hero extension. It only tests the new extension's behavior in both
 * legacy and modern modes. The old extension cannot be tested here because its
 * typescript-parser predates TypeScript 3.8 and cannot parse `import type` syntax.
 *
 * For VERIFIED old extension behavior with `import type`, see:
 * - tests/comparison/test-cases/06-edge-cases.test.ts (test 086)
 * - tests/comparison/test-cases/11-true-compatibility.test.ts (TC7a, TC7b)
 *
 * This test demonstrates the key difference in type-only import handling between:
 * - Legacy mode (legacyMode: true): Strips `import type` keywords, allows merging with value imports
 * - Modern mode (legacyMode: false): Preserves `import type` keywords, keeps type/value imports separate
 */

import * as assert from 'assert';
import { organizeImportsNew } from '../new-extension/adapter';

suite('Type-Only Import Handling: Legacy vs Modern (new extension only)', () => {

  test('LEGACY MODE: Strips import type keywords', async () => {
    // SCENARIO: import type statement
    // LEGACY BEHAVIOR: Strips the 'type' keyword (pre-TS 3.8 behavior)
    const input = `import type { User } from './types';

const user: User = { name: 'Test' };
`;

    // Expected: Legacy mode strips 'import type' → becomes regular import
    const expected = `import { User } from './types';

const user: User = { name: 'Test' };
`;

    const config = {
      legacyMode: true,  // ✅ Strips 'import type'
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Legacy mode strips import type keyword');
  });

  test('MODERN MODE: Preserves import type keywords', async () => {
    // SCENARIO: import type statement
    // MODERN BEHAVIOR: Preserves the 'type' keyword (TS 3.8+ semantics)
    const input = `import type { User } from './types';

const user: User = { name: 'Test' };
`;

    // Expected: Modern mode preserves 'import type'
    const expected = `import type { User } from './types';

const user: User = { name: 'Test' };
`;

    const config = {
      legacyMode: false,  // ✅ Preserves 'import type'
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Modern mode preserves import type keyword');
  });

  test('LEGACY MODE: Allows merging type-only with value imports', async () => {
    // SCENARIO: Separate type-only and value imports from same module
    // LEGACY BEHAVIOR: Merges them together (strips 'type' keyword first, then merges)
    const input = `import type { User } from './types';
import { createUser } from './types';

const user: User = createUser('Test');
`;

    // Expected: Legacy mode merges into single regular import (specifiers sorted alphabetically)
    const expected = `import { createUser, User } from './types';

const user: User = createUser('Test');
`;

    const config = {
      legacyMode: true,  // ✅ Strips 'type' and allows merging
      mergeImportsFromSameModule: true,
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Legacy mode merges type-only with value imports');
  });

  test('MODERN MODE: Keeps type-only and value imports separate', async () => {
    // SCENARIO: Separate type-only and value imports from same module
    // MODERN BEHAVIOR: Keeps them separate (TS 3.8+ semantics - type/value isolation)
    const input = `import type { User } from './types';
import { createUser } from './types';

const user: User = createUser('Test');
`;

    // Expected: Modern mode keeps them separate
    const expected = `import type { User } from './types';
import { createUser } from './types';

const user: User = createUser('Test');
`;

    const config = {
      legacyMode: false,  // ✅ Preserves separation
      mergeImportsFromSameModule: true,  // Even with merge enabled!
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Modern mode keeps type-only and value imports separate');
  });

  test('LEGACY MODE: Specifier-level type modifiers also stripped', async () => {
    // SCENARIO: import with type modifier on individual specifiers
    // LEGACY BEHAVIOR: Strips specifier-level 'type' modifiers
    const input = `import { type User, createUser } from './types';

const user: User = createUser('Test');
`;

    // Expected: Legacy mode strips specifier-level 'type' (specifiers sorted alphabetically)
    const expected = `import { createUser, User } from './types';

const user: User = createUser('Test');
`;

    const config = {
      legacyMode: true,  // ✅ Strips specifier-level 'type'
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Legacy mode strips specifier-level type modifiers');
  });

  test('MODERN MODE: Specifier-level type modifiers preserved', async () => {
    // SCENARIO: import with type modifier on individual specifiers
    // MODERN BEHAVIOR: Preserves specifier-level 'type' modifiers
    const input = `import { type User, createUser } from './types';

const user: User = createUser('Test');
`;

    // Expected: Modern mode preserves specifier-level 'type' (specifiers sorted alphabetically)
    const expected = `import { createUser, type User } from './types';

const user: User = createUser('Test');
`;

    const config = {
      legacyMode: false,  // ✅ Preserves specifier-level 'type'
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Modern mode preserves specifier-level type modifiers');
  });

  test('MODERN MODE: Multiple type-only imports from same module DO merge', async () => {
    // SCENARIO: Multiple type-only imports from same module
    // MODERN BEHAVIOR: Type-only imports CAN merge with other type-only imports
    const input = `import type { User } from './types';
import type { Product } from './types';

const user: User = { name: 'Test' };
const product: Product = { name: 'Item' };
`;

    // Expected: Modern mode merges type-only with type-only
    const expected = `import type { Product, User } from './types';

const user: User = { name: 'Test' };
const product: Product = { name: 'Item' };
`;

    const config = {
      legacyMode: false,  // ✅ Modern mode
      mergeImportsFromSameModule: true,  // Merges type-only with type-only
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Modern mode merges type-only imports together');
  });

  test('LEGACY MODE: Complex - multiple type imports become single value import', async () => {
    // SCENARIO: Multiple type-only imports from same module
    // LEGACY BEHAVIOR: Strips all 'type' keywords and merges into regular import
    const input = `import type { User } from './types';
import type { Product } from './types';

const user: User = { name: 'Test' };
const product: Product = { name: 'Item' };
`;

    // Expected: Legacy mode strips 'type' and merges into single regular import
    const expected = `import { Product, User } from './types';

const user: User = { name: 'Test' };
const product: Product = { name: 'Item' };
`;

    const config = {
      legacyMode: true,  // ✅ Strips all 'type' keywords
      mergeImportsFromSameModule: true,
      disableImportRemovalOnOrganize: true,
      blankLinesAfterImports: 'one' as const
    };

    const result = await organizeImportsNew(input, config);

    assert.strictEqual(result, expected, 'Legacy mode strips type and merges all imports');
  });
});
