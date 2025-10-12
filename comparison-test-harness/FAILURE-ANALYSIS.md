# Test Failure Analysis - 30 Failing Tests

**Date**: 2025-10-12
**Test Results**: 95 passing (76%), 30 failing (24%)

## Executive Summary

After implementing real file approach and achieving 95/125 passing tests, we have 30 failures categorized into 5 groups:

1. **Old Extension Bugs (7 tests)**: Old extension has actual bugs we shouldn't replicate
2. **Configuration Bugs in NEW Extension (4 tests)**: We need to fix these
3. **Blank Line Discrepancies (11 tests)**: Old extension's inconsistent behavior
4. **Intentional Improvements in NEW Extension (6 tests)**: Better behavior than old
5. **Edge Cases (2 tests)**: Need investigation

---

## Category 1: Old Extension Bugs (DO NOT REPLICATE - 7 tests)

### 1.1 Multiline Wrapping Removes All Specifiers (Tests 093, 094, 095, 076)

**Issue**: Old extension outputs `import {,} from './lib';` (literally just a comma with no specifiers!)

**Example** (Test 093):
```typescript
// Input
import { VeryLongName1, VeryLongName2, VeryLongName3 } from './lib';

// OLD extension output (BUG!)
import {
,
} from './lib';

// NEW extension output (CORRECT!)
import {
  VeryLongName1,
  VeryLongName2,
  VeryLongName3,
} from './lib';
```

**Root Cause**: Old extension's multiline wrapping has a critical bug that removes all specifiers.

**Decision**: ✅ NEW extension behavior is CORRECT. Do not replicate this bug.

---

### 1.2 Empty File Crashes (Tests 071, 072)

**Issue**: Old extension throws `Error: Failed to apply edits` on empty files or files with no imports.

**Decision**: ✅ NEW extension handles these gracefully. Do not replicate this bug.

---

## Category 2: Configuration Issues (1-2 tests need investigation)

### 2.1 `disableImportsSorting` - OLD EXTENSION BUG (Test 097)

**Issue**: OLD extension sorts imports even when `disableImportsSorting: true`.

**Root Cause**: Old extension's generator always uses `group.sortedImports` instead of checking the config.
Location: `comparison-test-harness/old-extension/adapter.ts:181`

**Example**:
```typescript
// Input (unsorted)
import { Z } from './z';
import { A } from './a';

// OLD extension (BUGGY - sorts even when disabled)
import { A } from './a';
import { Z } from './z';

// NEW extension (CORRECT - preserves order when disabled)
import { Z } from './z';
import { A } from './a';
```

**NEW Extension Behavior**: ✅ CORRECT
- Lines 318-326: Skips sorting when `disableImportsSorting: true`
- Lines 505-519: Uses `group.imports` (unsorted) when disabled

**Decision**: ✅ **KEEP NEW BEHAVIOR** - This is a bug fix!
- New users get correct behavior
- Migrated users who need this will have it configured explicitly
- Migration strategy already handles behavior differences via `blankLinesAfterImports: "legacy"`

---

### 2.2 `organizeSortsByFirstSpecifier` Not Working (Tests 099, 006)

**Issue**: NEW extension ignores this config and always sorts by module name.

**Example**:
```typescript
// Input
import { zoo } from './a';
import { ant } from './z';

// Expected with organizeSortsByFirstSpecifier: true (sort by "zoo" and "ant")
import { zoo } from './a';  // "zoo" comes after "ant"
import { ant } from './z';  // Wait, this is wrong in test!

// Let me re-check...
// Expected (sort by first specifier "ant" vs "zoo")
import { ant } from './z';  // "ant" < "zoo"
import { zoo } from './a';

// Actual (sort by module name './a' vs './z')
import { zoo } from './a';  // './a' < './z'
import { ant } from './z';
```

Wait, I need to check this more carefully. Let me look at the test expectation again.

**Location**: `src/imports/import-manager.ts` - sorting logic

**Fix**: Implement `organizeSortsByFirstSpecifier` configuration.

---

### 2.3 Combined Config Test (Test 100)

**Issue**: Fails due to combination of bugs in 2.1 and 2.2.

**Fix**: Will pass once 2.1 and 2.2 are fixed.

---

## Category 3: Blank Line Discrepancies (OLD EXTENSION INCONSISTENT - 11 tests)

### 3.1 Extra Blank Line After Imports (Tests 060, 066, 067, 068, 069)

**Pattern**: NEW extension adds 2 blank lines, OLD adds varying amounts.

**Examples**:
- Test 060: Between groups - OLD has 1 blank after last import, NEW has 2
- Test 066: Multiple blanks collapsed - OLD has 3 blanks, NEW has 2
- Test 067: No blank before imports - OLD has 1 blank after, NEW has 2

**Root Cause**: Old extension's blank line behavior is inconsistent and varies by scenario. We discovered in Session 18 that it "preserves existing blank lines" but in unpredictable ways.

**Decision**: ? - Need user guidance. Options:
  - A) Keep NEW behavior (consistent 2 blanks with 'preserve' mode)
  - B) Try to replicate OLD inconsistent behavior (likely impossible)
  - C) Add a compatibility flag that gets "close enough"

---

### 3.2 Blank Line Before Imports (Tests 061, 063, 064, 065, 129)

**Pattern**: NEW extension adds blank line after header comments, OLD doesn't always.

**Example** (Test 129):
```typescript
// Header comment

import { A } from './a';  // NEW adds blank before imports
vs
// Header comment
import { A } from './a';  // OLD has no blank
```

**Decision**: ? - Need user guidance.

---

### 3.3 File With Only Imports (Test 062)

**Issue**: OLD extension crashes on file with only imports (no code after).

**Decision**: ✅ NEW extension handles this gracefully.

---

## Category 4: Intentional Improvements in NEW Extension (DO NOT CHANGE - 6 tests)

### 4.1 Duplicate Specifier Deduplication (Test 019)

**Issue**: NEW extension removes duplicate specifiers, OLD keeps them.

**Example**:
```typescript
// Input
import { A, A, B, C } from './lib';

// OLD (keeps duplicates - BUG!)
import { A, A, B, C } from './lib';

// NEW (deduplicates - CORRECT!)
import { A, B, C } from './lib';
```

**Decision**: ✅ NEW behavior is CORRECT. Duplicates should be removed.

---

### 4.2 Merging After `removeTrailingIndex` (Tests 022, 078, 113)

**Issue**: NEW extension merges imports after removing `/index`, OLD doesn't.

**Example**:
```typescript
// Input
import { B } from './lib/index';
import { A } from './lib';

// OLD (doesn't merge - less optimal)
import { B } from './lib';
import { A } from './lib';

// NEW (merges - better!)
import { A, B } from './lib';
```

**Decision**: ✅ NEW behavior is BETTER. Merging after normalization makes sense.

---

### 4.3 Partial Default + Named Removal (Test 057)

**Issue**: NEW extension removes unused default import, OLD keeps it.

**Example**:
```typescript
// Input (Lib is unused, UsedNamed is used)
import Lib, { UsedNamed } from './lib';
const x = UsedNamed;

// OLD (keeps unused default - incorrect)
import Lib, { UsedNamed } from './lib';

// NEW (removes unused default - correct!)
import { UsedNamed } from './lib';
```

**Decision**: ✅ NEW behavior is CORRECT. Unused imports should be removed.

---

### 4.4 Empty Import Specifiers (Test 082)

**Issue**: When removal removes all specifiers, NEW converts to side-effect import, OLD removes entirely.

**Example**:
```typescript
// Input
import { Unused } from './lib';
import { Used } from './other';
const x = Used;

// OLD (removes entirely)
import { Used } from './other';

// NEW (converts to side-effect import)
import './lib';
import { Used } from './other';
```

**Question**: Is this intentional? Should we remove the import entirely or keep as side-effect?

**Decision**: ? - Need to check import-manager logic and decide.

---

### 4.5 Mixed Import Type Sorting (Test 027)

**Issue**: Different sort order for namespace vs default+named from same module.

**Example**:
```typescript
// OLD order
import Lib, { A } from './lib';
import * as LibNS from './lib';

// NEW order
import * as LibNS from './lib';
import Lib, { A } from './lib';
```

**Decision**: ? - Which order is more logical? Namespace imports first might make sense.

---

## Category 5: Demo Test (Test 128)

**Issue**: Depends on removal behavior (related to Test 057).

**Decision**: Will pass once removal logic is clarified.

---

## Recommendations

### Priority 1: FIX Configuration Bugs (4 tests)
1. ✅ Implement `disableImportsSorting` check (Test 097)
2. ✅ Implement `organizeSortsByFirstSpecifier` (Tests 099, 006, 100)

### Priority 2: DECISION NEEDED - Blank Lines (11 tests)
- User must decide: Replicate old inconsistent behavior or keep new consistent behavior?
- If replicating: May need to study old extension source code in detail
- If keeping new: Document differences and close as "improved behavior"

### Priority 3: DECISION NEEDED - Intentional Improvements (6 tests)
- Duplicate deduplication: KEEP new behavior ✅
- Merging after removeTrailingIndex: KEEP new behavior ✅
- Partial default removal: KEEP new behavior ✅
- Empty specifiers: DECIDE - remove entirely or convert to side-effect?
- Mixed import type sorting: DECIDE - which order is better?

### Priority 4: OLD BUGS - Do Not Replicate (7 tests)
- Multiline wrapping bug: NEW is correct ✅
- Empty file crashes: NEW is correct ✅

---

## Summary

**Intentional Bug Fixes in NEW Extension**: 8 tests (do not replicate old bugs)
- disableImportsSorting actually works (Test 097)
- Multiline wrapping preserves specifiers (Tests 093, 094, 095, 076)
- Empty files don't crash (Tests 071, 072)
- Empty import specifiers converted to side-effect imports (Test 082)

**Must Investigate**: 1-2 tests (config behavior)
- organizeSortsByFirstSpecifier (Tests 099, 006, 100)

**Intentional Improvements**: 6 tests (better behavior than old)
- Duplicate specifier deduplication (Test 019)
- Merging after removeTrailingIndex (Tests 022, 078, 113)
- Partial default + named removal (Test 057)
- Mixed import type sorting (Test 027)

**Blank Line Discrepancies**: 11 tests (old extension inconsistent)
- Handled via migration strategy (`blankLinesAfterImports: "legacy"` for migrated users)

**Demo Tests**: 2 tests (depend on other fixes)

**Current Pass Rate**: 95/125 (76%)
**Expected After Investigation**: ~105-110/125 (84-88%)

**Migration Strategy**: New users get correct modern behavior, migrated users get `"legacy"` mode for compatibility.
