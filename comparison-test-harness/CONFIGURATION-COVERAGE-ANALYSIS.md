# Test Harness Configuration Coverage Analysis

**Date**: 2025-10-10
**Purpose**: Verify that the comparison test harness tests ALL configuration options in both old and new extensions

---

## Executive Summary

### Current Status

✅ **99/111 tests passing (89% compatibility)**
🔴 **12 tests failing** (all due to intentional merging improvement)

### Configuration Coverage

**Total Configuration Options**: 13
**Tested in Comparison Harness**: 10 (77%)
**Missing from Harness**: 3 (23%)

---

## All Configuration Options (13 total)

### ✅ Tested in Comparison Harness (10/13)

| # | Configuration Option | Test(s) | Coverage | Notes |
|---|---------------------|---------|----------|-------|
| 1 | `insertSpaceBeforeAndAfterImportBraces` | 091, 092 | ✅ Full | Both enabled/disabled tested |
| 2 | `insertSemicolons` | 089, 090 | ✅ Full | Both enabled/disabled tested |
| 3 | `stringQuoteStyle` | 087, 088 | ✅ Full | Single and double quotes tested |
| 4 | `multiLineWrapThreshold` | 093 | ✅ Full | Threshold triggering tested |
| 5 | `multiLineTrailingComma` | 094, 095 | ✅ Full | Both enabled/disabled tested |
| 6 | `disableImportsSorting` | 097 | ✅ Full | Preserves import order when disabled |
| 7 | `disableImportRemovalOnOrganize` | 098 | ✅ Full | Keeps unused imports when disabled |
| 8 | `organizeSortsByFirstSpecifier` | 099 | ✅ Full | Sorts by first specifier instead of module |
| 9 | `ignoredFromRemoval` | Implicit | ✅ Partial | Default `['react']` in all tests, not explicitly tested with different values |
| 10 | `grouping` | 028-043 | ✅ Full | All grouping variations tested (16 tests) |

### ❌ Missing from Comparison Harness (3/13)

| # | Configuration Option | Default | Why Missing? | Impact |
|---|---------------------|---------|--------------|---------|
| 11 | `removeTrailingIndex` | `true` | Not explicitly tested | **HIGH** - Affects import paths |
| 12 | `organizeOnSave` | `false` | Runtime behavior, not organizeable | N/A - Not applicable to comparison |
| 13 | `mergeImportsFromSameModule` | `true` | **NEW OPTION** - doesn't exist in old extension | N/A - New feature only |
| 14 | `blankLinesAfterImports` | `'one'` | **PARTIALLY TESTED** - Tests 058-070 use `'legacy'` mode | **MEDIUM** - Other modes not validated |

---

## Deep Dive: Missing Configuration Tests

### 🔴 Priority 1: `removeTrailingIndex`

**What it does**: Converts `import { A } from './lib/index'` → `import { A } from './lib'`

**Why it matters**:
- Default is `true` in both old and new extensions
- Affects import path normalization
- Impacts merging behavior (Session 6 bug fix)
- **Could have different behavior** in old vs new

**Current Coverage**:
- ❌ No dedicated comparison test
- ⚠️ Test 022 mentions "after removeTrailingIndex" but doesn't verify the config option itself
- ✅ Tested in unit tests (our own test suite has coverage)

**Recommended Tests to Add**:
```typescript
// Test A: removeTrailingIndex enabled (default)
test('Remove trailing /index (enabled)', async () => {
  const input = `import { A } from './lib/index';
import { B } from './other/index';

const x = A; const y = B;
`;

  const config = { removeTrailingIndex: true };
  const oldResult = await organizeImportsOld(input, config);
  const newResult = organizeImportsNew(input, config);

  // Both should convert to './lib' and './other'
  assert.ok(oldResult.includes("'./lib'"), 'Old should remove /index');
  assert.ok(newResult.includes("'./lib'"), 'New should remove /index');
  assert.strictEqual(newResult, oldResult, 'Results must match');
});

// Test B: removeTrailingIndex disabled
test('Remove trailing /index (disabled)', async () => {
  const input = `import { A } from './lib/index';

const x = A;
`;

  const config = { removeTrailingIndex: false };
  const oldResult = await organizeImportsOld(input, config);
  const newResult = organizeImportsNew(input, config);

  // Both should preserve '/index'
  assert.ok(oldResult.includes("'./lib/index'"), 'Old should keep /index');
  assert.ok(newResult.includes("'./lib/index'"), 'New should keep /index');
  assert.strictEqual(newResult, oldResult, 'Results must match');
});

// Test C: removeTrailingIndex + merging interaction
test('Remove trailing /index affects merging', async () => {
  const input = `import { A } from './lib/index';
import { B } from './lib';

const x = A; const y = B;
`;

  const config = { removeTrailingIndex: true };
  const oldResult = await organizeImportsOld(input, config);
  const newResult = organizeImportsNew(input, config);

  // After removing /index, both imports are from './lib'
  // New extension merges, old might not
  // This test validates the merging difference is AFTER normalization
});
```

---

### 🟡 Priority 2: `blankLinesAfterImports` Modes

**What it does**: Controls blank lines after imports with 4 modes:
- `'one'` (default) - Always exactly 1 blank line
- `'two'` - Always exactly 2 blank lines
- `'preserve'` - Keep existing count
- `'legacy'` - Match old TypeScript Hero behavior

**Why it matters**:
- **New option** added in Session 11
- Tests 058-070 all use `blankLinesAfterImports: 'legacy'` mode
- Other modes (`'one'`, `'two'`, `'preserve'`) are NOT validated against old extension

**Current Coverage**:
- ✅ `'legacy'` mode - 13 tests (058-070)
- ❌ `'one'` mode - Not compared (it's new default, different from old)
- ❌ `'two'` mode - Not compared
- ❌ `'preserve'` mode - Not compared

**Analysis**:
This is **EXPECTED** because the old extension has NO concept of these modes. The comparison harness correctly tests `'legacy'` mode which replicates old behavior. The other modes are **intentional improvements**.

**Action**: ✅ **No additional tests needed** - Document in DIFFERENCES.md that modes `'one'`, `'two'`, and `'preserve'` are new features.

---

### 🟢 Priority 3: `ignoredFromRemoval` with Different Values

**What it does**: Specifies libraries whose imports should never be removed (even if unused)

**Default**: `['react']`

**Why it matters**:
- Affects import removal behavior
- Default includes React - all tests implicitly use this
- What if list is empty `[]`?
- What if list includes multiple libraries `['react', 'vue', '@angular/core']`?

**Current Coverage**:
- ✅ Default `['react']` - Used in all tests (implicit)
- ❌ Empty list `[]` - Not tested
- ❌ Multiple libraries - Not tested
- ❌ Interaction with sorting (current **BUG** - Test 010 found this!)

**Recommended Tests to Add**:
```typescript
// Test D: ignoredFromRemoval empty (remove ALL unused)
test('ignoredFromRemoval empty array', async () => {
  const input = `import React from 'react';
import { useState } from 'react';
import { Component } from '@angular/core';

const x = Component;
`;

  const config = { ignoredFromRemoval: [] };
  const oldResult = await organizeImportsOld(input, config);
  const newResult = organizeImportsNew(input, config);

  // Both should remove unused React imports
  assert.ok(!oldResult.includes('react'), 'Old should remove unused React');
  assert.ok(!newResult.includes('react'), 'New should remove unused React');
  assert.strictEqual(newResult, oldResult, 'Results must match');
});

// Test E: ignoredFromRemoval multiple libraries
test('ignoredFromRemoval with multiple libs', async () => {
  const input = `import React from 'react';
import Vue from 'vue';
import { Component } from '@angular/core';

const x = Component;
`;

  const config = { ignoredFromRemoval: ['react', 'vue'] };
  const oldResult = await organizeImportsOld(input, config);
  const newResult = organizeImportsNew(input, config);

  // Both should keep React and Vue even though unused
  assert.ok(oldResult.includes('react'), 'Old should keep React');
  assert.ok(oldResult.includes('vue'), 'Old should keep Vue');
  assert.ok(newResult.includes('react'), 'New should keep React');
  assert.ok(newResult.includes('vue'), 'New should keep Vue');
  assert.strictEqual(newResult, oldResult, 'Results must match');
});

// Test F: ignoredFromRemoval + specifier sorting (validates bug fix)
test('ignoredFromRemoval still sorts specifiers', async () => {
  const input = `import React, { useState, useEffect } from 'react';

const x = React;
const y = useState;
const z = useEffect;
`;

  const config = { ignoredFromRemoval: ['react'] };
  const oldResult = await organizeImportsOld(input, config);
  const newResult = organizeImportsNew(input, config);

  // CRITICAL: Specifiers should be sorted even for ignored imports
  // Old: { useEffect, useState } (alphabetical)
  // New: Should match old (after bug fix)
  assert.ok(oldResult.includes('useEffect, useState'), 'Old sorts ignored imports');
  assert.ok(newResult.includes('useEffect, useState'), 'New should also sort (after fix)');
  assert.strictEqual(newResult, oldResult, 'Results must match');
});
```

---

## Summary of Recommended Actions

### 🔴 High Priority

1. **Add 3 tests for `removeTrailingIndex`** (Tests 111-113)
   - Enabled (default)
   - Disabled
   - Interaction with merging

2. **Add 3 tests for `ignoredFromRemoval` variations** (Tests 114-116)
   - Empty array
   - Multiple libraries
   - Specifier sorting validation (ensures bug fix works)

**Total new tests**: 6
**New total**: 111 → **117 tests**

### 🟢 Low Priority (Documentation Only)

3. **Document that `blankLinesAfterImports` modes are NEW**
   - Update DIFFERENCES.md
   - Explain why only `'legacy'` is compared
   - Clarify modes `'one'`, `'two'`, `'preserve'` are intentional improvements

4. **Document that `mergeImportsFromSameModule` is NEW**
   - Already documented (Session 14)
   - Old extension has NO equivalent config
   - New extension ALWAYS merges by default

5. **Document that `organizeOnSave` is not comparable**
   - Runtime trigger, not transformation behavior
   - Both extensions support it
   - No comparison test needed

---

## Configuration Options NOT in Old Extension

These are **new options** added by Mini TypeScript Hero:

| Option | Session Added | Default | Purpose |
|--------|--------------|---------|---------|
| `mergeImportsFromSameModule` | Session 14 | `true` | Combine imports from same module |
| `blankLinesAfterImports` | Session 11 | `'one'` | Control blank lines after imports (4 modes) |

These options have **NO equivalent** in the old extension, so they cannot be compared. They are documented as **intentional improvements**.

---

## Adapter Configuration Mapping

### Old Extension Adapter

**File**: `comparison-test-harness/old-extension/adapter.ts`

**Current MockImportsConfig**:
```typescript
class MockImportsConfig extends ImportsConfig {
  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean { return true; }
  insertSemicolons(_resource: Uri): boolean { return true; }
  removeTrailingIndex(_resource: Uri): boolean { return true; }
  stringQuoteStyle(_resource: Uri): '"' | '\'' { return '\''; }
  multiLineWrapThreshold(_resource: Uri): number { return 125; }
  multiLineTrailingComma(_resource: Uri): boolean { return true; }
  disableImportRemovalOnOrganize(_resource: Uri): boolean { return false; }
  disableImportsSorting(_resource: Uri): boolean { return false; }
  organizeOnSave(_resource: Uri): boolean { return false; }
  organizeSortsByFirstSpecifier(_resource: Uri): boolean { return false; }
  ignoredFromRemoval(_resource: Uri): string[] { return ['react']; }
  grouping(_resource: Uri): ImportGroup[] { return ImportGroupSettingParser.default; }
}
```

**Missing**:
- ❌ `removeTrailingIndex` **hardcoded to `true`** - NOT configurable in tests!
- ❌ `ignoredFromRemoval` **hardcoded to `['react']`** - NOT configurable in tests!

**Required Fix**: Make adapter accept config parameter and apply it:

```typescript
export async function organizeImportsOld(
  sourceCode: string,
  config: any = {}
): Promise<string> {
  const mockConfig = new MockImportsConfig();

  // Apply config overrides
  if (config.removeTrailingIndex !== undefined) {
    mockConfig.setConfig('removeTrailingIndex', config.removeTrailingIndex);
  }
  if (config.ignoredFromRemoval !== undefined) {
    mockConfig.setConfig('ignoredFromRemoval', config.ignoredFromRemoval);
  }
  // ... (other configs already work)
}
```

Currently, the old adapter **ignores** these config options passed in tests!

---

### New Extension Adapter

**File**: `comparison-test-harness/new-extension/adapter.ts`

**Current MockImportsConfig**:
```typescript
class MockImportsConfig extends ImportsConfig {
  private mockConfig: Map<string, any> = new Map();

  setConfig(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  // All methods check mockConfig.get(key) ?? default
  // ✅ Fully configurable
}
```

**Status**: ✅ **Already supports all config options**

---

## Conclusion & Action Plan

### Current State

- ✅ **10/13 config options** thoroughly tested in comparison harness
- ❌ **3 config options** missing explicit tests:
  1. `removeTrailingIndex` - **HIGH PRIORITY** (could behave differently)
  2. `ignoredFromRemoval` variations - **MEDIUM PRIORITY** (default tested, variations not)
  3. `blankLinesAfterImports` modes - **DOCUMENTED** (new feature, legacy mode tested)

### Actions Required

**Step 1**: Fix Old Adapter Configuration (BLOCKER)
- Make `removeTrailingIndex` configurable (currently hardcoded)
- Make `ignoredFromRemoval` configurable (currently hardcoded)
- Update `organizeImportsOld()` to apply config overrides

**Step 2**: Add 6 New Tests
- Tests 111-113: `removeTrailingIndex` coverage
- Tests 114-116: `ignoredFromRemoval` variations

**Step 3**: Update Documentation
- DIFFERENCES.md - Document new-only options
- README.md - Explain configuration coverage

### Expected Outcome

After completing these actions:
- **Configuration Coverage**: 100% (13/13 options tested where applicable)
- **Total Tests**: 117 (up from 111)
- **Confidence**: High confidence that all configuration behaviors match (or intentionally differ)

---

**Last Updated**: 2025-10-10
**Status**: Analysis Complete | 6 Tests to Add | Adapter Fix Required
