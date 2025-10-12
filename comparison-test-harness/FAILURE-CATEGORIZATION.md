# Test Failure Categorization - Path to 125/125

**Current Status**: 105/125 passing (84%)
**Goal**: 125/125 passing (100%) with `legacyMode: true`

---

## Category A: Blank Line After Header Comments (5 tests) - MUST FIX

**Tests**: 059, 061, 070, 128, 129

**TypeScript Hero Behavior**:
```typescript
// Header comment
import { A } from './lib';


const x = A;
```
- NO blank line between header comment and imports
- TWO blank lines after imports

**Our Current Behavior**:
```typescript
// Header comment

import { A } from './lib';

const x = A;
```
- ONE blank line between header comment and imports
- ONE blank line after imports

**Root Cause**: Our blank line logic adds blank BEFORE imports when header present

**Fix Needed**: In `legacyMode`, remove blank line before imports when header comment exists

---

## Category B: No Merging in Legacy Mode (4 tests) - MUST FIX

**Tests**: 078, 113, 022, 019

**TypeScript Hero Behavior**:
```typescript
import { B } from './lib';
import { A } from './lib';
// Stays as two separate imports - NO merging
```

Test 019 - Even keeps duplicates:
```typescript
import { A, A, B, C } from './lib';
// Duplicate 'A' preserved!
```

**Our Current Behavior**:
```typescript
import { A, B } from './lib';
// Always merges
```

**Root Cause**: `mergeImportsFromSameModule` default is `true`, not controlled by `legacyMode`

**Fix Needed**: When `legacyMode: true`, set `mergeImportsFromSameModule: false` internally

---

## Category C: Specifier Sorting with disableImportRemovalOnOrganize (1 test) - MUST FIX

**Test**: 100

**TypeScript Hero Behavior**:
```typescript
// With disableImportRemovalOnOrganize: true
import { zoo, ant } from "./a"  // Preserves original order!
```

**Our Current Behavior**:
```typescript
import { ant, zoo } from "./a"  // Still sorts specifiers
```

**Root Cause**: `disableImportRemovalOnOrganize` in old extension disabled BOTH removal AND specifier sorting

**Fix Needed**: When `legacyMode: true` AND `disableImportRemovalOnOrganize: true`, preserve specifier order

---

## Category D: Default Import Removal (1 test) - INVESTIGATE

**Test**: 057

**TypeScript Hero Behavior**:
```typescript
import Lib, { UsedNamed } from './lib';
// Keeps unused default 'Lib'
```

**Our Current Behavior**:
```typescript
import { UsedNamed } from './lib';
// Removes unused default
```

**Analysis**: This might be correct behavior - removing unused is GOOD. But for 100% compatibility, we need to match.

**Fix Needed**: When `legacyMode: true`, preserve unused default imports

---

## Category E: Import Type Sorting Order (1 test) - INVESTIGATE

**Test**: 027

**TypeScript Hero Behavior**:
```typescript
import Lib, { A } from './lib';     // Default+named first
import * as LibNS from './lib';     // Namespace second
```

**Our Current Behavior**:
```typescript
import * as LibNS from './lib';     // Namespace first
import Lib, { A } from './lib';     // Default+named second
```

**Analysis**: Different sorting order for mixed import types from same module

**Fix Needed**: When `legacyMode: true`, sort default+named BEFORE namespace

---

## Category F: Empty Import Handling (1 test) - INVESTIGATE

**Test**: 082

**TypeScript Hero Behavior**:
```typescript
// When all specifiers removed
import { Used } from './other';
// Removes entire import - NO side-effect import created
```

**Our Current Behavior**:
```typescript
import './lib';  // Converts to side-effect import

import { Used } from './other';
```

**Analysis**: We're being more conservative (keeping the import). Old extension removes it entirely.

**Fix Needed**: When `legacyMode: true`, remove imports that have all specifiers removed

---

## Category G: Comment Preservation (1 test) - INVESTIGATE

**Test**: 083

**TypeScript Hero Behavior**:
```typescript
import { A } from './a';
import { B } from './b';

// Important comment
const x = A;
```

**Our Current Behavior**:
```typescript
import { A } from './a';
import { B } from './b';

const x = A;  // Comment removed!
```

**Analysis**: Comments between imports and code are being lost

**Possible Cause**: ts-morph limitation? Need to investigate
**Fix Needed**: Preserve comments that appear after imports

---

## Category H: Multiline Wrapping BUG in Old Extension (4 tests) - SKIP

**Tests**: 093, 094, 095, 076

**TypeScript Hero Output**:
```typescript
import {
,
} from './lib';
```

**Analysis**: This is a BUG in the old extension - it outputs empty specifier lists!

**Our Behavior**: Correct - includes actual specifiers

**Decision**: DO NOT replicate this bug. These 4 test failures are acceptable.

**Action**: Update these 4 tests to expect CORRECT behavior (our output)

---

## Category I: Adapter Errors (2 tests) - FIX ADAPTER

**Tests**: 071, 072

**Error**: `Failed to apply edits` in old extension adapter

**Analysis**: Edge case with empty files or files with no imports

**Fix Needed**: Handle edge cases in `comparison-test-harness/old-extension/adapter.ts`

---

## Implementation Priority

### MUST FIX (will get us to ~118/125) = 94%
1. ✅ Category A: Blank lines after header (5 tests)
2. ✅ Category B: No merging in legacy mode (4 tests)
3. ✅ Category C: Specifier sorting with disableImportRemovalOnOrganize (1 test)

### SHOULD FIX (will get us to ~121/125) = 97%
4. ⚠️ Category D: Default import removal (1 test)
5. ⚠️ Category E: Import type sorting (1 test)
6. ⚠️ Category F: Empty import handling (1 test)

### INVESTIGATE
7. ❓ Category G: Comment preservation (1 test) - may be ts-morph limitation
8. ❓ Category I: Adapter errors (2 tests) - adapter edge cases

### ACCEPTABLE DIFFERENCES (Modern behavior better than old)
9. ✅ Category H: Multiline wrapping bug (4 tests) - OLD EXTENSION HAD BUG

---

## legacyMode Expansion Plan

Current `legacyMode` controls:
- ✅ Within-group sorting
- ✅ Blank lines mode ('preserve')

Need to add:
- ❌ Merging behavior (disable when legacy)
- ❌ Blank line before imports (remove when header + legacy)
- ❌ Specifier sorting when disableImportRemovalOnOrganize (preserve order when legacy)
- ❌ Default import removal (keep when legacy)
- ❌ Import type sort order (default+named before namespace when legacy)
- ❌ Empty import handling (remove entirely when legacy)

---

**Next Steps**: Implement legacyMode expansions for Categories A, B, C first.
Expected result: 105 → 118 passing (+13 tests) = 94% pass rate
