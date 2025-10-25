# Mini TypeScript Hero - Project Guide

## 📖 What Is This Project?

**Mini TypeScript Hero** is a VSCode extension that sorts and organizes TypeScript/JavaScript imports. It's a modernized extraction of the single most valuable feature from the deprecated TypeScript Hero extension.

**Original Author**: Christoph Bühler (no longer maintains TypeScript Hero)
**New Maintainer**: Angular.Schule (Johannes Hoppe)
**License**: MIT (with attribution to original author)
**Repository**: https://github.com/angular-schule/mini-typescript-hero

**Terminology**:
- **Old extension** = Original "TypeScript Hero" by Christoph Bühler (deprecated, uses typescript-parser)
  - Included as git submodule at `comparison-test-harness/old-typescript-hero/`
  - Used by comparison tests to verify backward compatibility
- **New extension** = This project "Mini TypeScript Hero" (modern, uses ts-morph)

---

## 🎯 Project Goal

Extract and modernize the "Sort and organize your imports" feature with:
- ✅ **100% backward compatibility** with TypeScript Hero settings
- ✅ **Modern 2025 tech stack** (ts-morph, esbuild, TypeScript 5.7)
- ✅ **No dependencies on deprecated libraries** (typescript-parser is 7 years old!)
- ✅ **Simplified architecture** (no InversifyJS DI container overkill)

---

## 🏗️ Architecture

### Old TypeScript Hero (Complex)
```
extension.ts
  └─> TypescriptHero (DI container orchestrator)
      └─> ImportOrganizer (Activatable)
          └─> ImportManagerProvider
              └─> ImportManager
                  ├─> TypescriptParser (deprecated)
                  ├─> TypescriptCodeGenerator
                  ├─> Configuration
                  ├─> Logger (winston)
                  └─> Import Groups
```

### Mini TypeScript Hero (Simplified)
```
extension.ts
  └─> ImportOrganizer
      ├─> Configuration (simple wrapper)
      ├─> Logger (OutputChannel)
      └─> ImportManager
          ├─> ts-morph (modern parser)
          └─> Import Groups
```

**Key Simplifications**:
- ❌ No InversifyJS (direct instantiation)
- ❌ No winston (native VSCode OutputChannel)
- ❌ No typescript-parser (modern ts-morph)
- ✅ 80% less code complexity

---

## 🧪 Testing Philosophy - CRITICAL!

### 🚨 THE GOLDEN RULE: USE REAL VSCODE APIS, NOT MOCKS!

**We learned this the hard way** over multiple sessions:

**What We Did Wrong**:
- Created MockTextDocument with fake URIs
- Wrote homegrown `applyEdits()` function with line-based text manipulation
- Spent HOURS debugging "bugs" that were actually bugs in OUR mock code
- These were **phantom bugs** - illusions created by wrong assumptions in mocks

**The Reality**:
- VSCode uses offset-based editing (piece tree data structure)
- Our line-based mocks were fundamentally wrong and created fake bugs
- Tests run IN REAL VSCODE - we have access to ALL real APIs!
- **Mock code assumptions were COMPLETELY WRONG**

**The Correct Approach**:
- ✅ Use `workspace.openTextDocument()` with REAL temp files in `os.tmpdir()`
- ✅ Use `workspace.applyEdit()` - VSCode's battle-tested implementation
- ✅ Clean up temp files in finally blocks
- ❌ NEVER write homegrown text edit logic
- ❌ NEVER use mocked TextDocument with fake URIs

---

### 🚨 MANDATORY TEST ASSERTION PATTERN - NO EXCEPTIONS!

**CRITICAL**: Every test MUST validate against explicit expected output. Comparing two results without validating correctness is WORTHLESS.

#### ❌ NEVER USE THIS PATTERN:

```typescript
// BAD - Both could return empty string and test passes!
// BAD - Both could have the SAME BUG and test passes!
const oldResult = await organizeImportsOld(input);
const newResult = await organizeImportsNew(input);
assert.equal(newResult, oldResult);  // ❌ WORTHLESS - doesn't validate correctness!
```

**Why This Is Worthless**:
- If both extensions return empty string → test passes (FALSE POSITIVE)
- If both extensions have the same bug → test passes (FALSE POSITIVE)
- Doesn't validate that the output is actually CORRECT
- Only validates that two potentially broken things match each other

#### ✅ ALWAYS USE THIS PATTERN:

**For Unit Tests (main extension):**
```typescript
// CORRECT - Validates against known-good expected output
const input = `...source code...`;

const expected = `...VERIFIED correct output...`;  // ✅ Get from REAL extension or manual verification

const result = await organizeImports(input, config);

assert.equal(result, expected, 'Must produce correct output');  // ✅ Validates correctness!
```

**For Comparison Tests (test harness):**
```typescript
// CORRECT - Validates BOTH extensions against known-good expected output
const input = `...source code...`;

const expected = `...VERIFIED from REAL old extension...`;  // ✅ Get from REAL old extension, NEVER guess!

const oldResult = await organizeImportsOld(input, config);
const newResult = await organizeImportsNew(input, config);

assert.equal(oldResult, expected, 'Old extension must produce correct output');  // ✅ Validates old is correct
assert.equal(newResult, expected, 'New extension must produce correct output');  // ✅ Validates new is correct
```

#### 📋 Mandatory Requirements:

1. **EVERY test** must have explicit `expected` output
2. **NEVER** compare two results without validating against expected
3. **Get expected from REAL extension behavior** - NEVER guess or assume
4. **Run old extension** to capture actual output, don't make assumptions
5. **Clear assertion messages** explaining what's being validated

**This is NON-NEGOTIABLE** - tests must validate correctness, not just equality!

---

## 📁 Project Structure

```
mini-typescript-hero/                     ← Project root
├── src/
│   ├── extension.ts                      ← Entry point, command registration
│   ├── imports/
│   │   ├── import-manager.ts             ← Core: organizes imports, ts-morph usage
│   │   ├── import-organizer.ts           ← Orchestrator, VSCode integration
│   │   └── import-grouping/              ← Group definitions (Plains, Modules, etc.)
│   ├── configuration/
│   │   ├── imports-config.ts             ← 13 config options wrapper
│   │   └── settings-migration.ts         ← Migrates old TypeScript Hero settings
│   └── test/                             ← General extension tests (215 tests)
│       ├── imports/import-manager.test.ts
│       ├── imports/blank-lines.test.ts
│       └── configuration/settings-migration.test.ts
│
├── comparison-test-harness/              ← Old vs new comparison tests
│   ├── old-extension/adapter.ts          ← Adapter for old TypeScript Hero
│   ├── new-extension/adapter.ts          ← Adapter for new Mini TypeScript Hero
│   ├── old-typescript-hero/              ← Git submodule (original extension)
│   └── test-cases/*.test.ts              ← 129 comparison tests
│
├── manual-test-cases/                    ← Manual testing scenarios
├── package.json                          ← Extension manifest, config schema
├── CLAUDE_TODO.md                        ← Current session context & tasks
├── CLAUDE.md                             ← This file (project overview)
└── README.md                             ← User-facing documentation
```

---

## 🔧 Two Test Environments

### 1. General Extension Tests (`src/test/`)

**Purpose**: Prove the new extension is 100% bug-free

**What They Test**:
- All import organization features
- Configuration options (13 settings)
- Edge cases (shebangs, directives, old TypeScript syntax)
- Settings migration from old TypeScript Hero
- **Both** shared functionality (old+new) AND new-only features

**Test Pattern** (Now Using REAL VSCode APIs):
```typescript
// Create REAL temp file and open with VSCode
const doc = await createTempDocument(content);  // ✅ Real file in os.tmpdir()

try {
  const manager = new ImportManager(doc, config);
  const edits = manager.organizeImports();

  // Apply edits using VSCode's REAL API
  await applyEditsToDocument(doc, edits);  // ✅ workspace.applyEdit()

  const result = doc.getText();
  assert.equal(result, expected, 'Must produce correct output');  // ✅ Validates against expected
} finally {
  await deleteTempDocument(doc);  // ✅ Cleanup
}
```

**Status**: ✅ **397/397 tests passing (100%)** - All tests use REAL VSCode APIs with explicit expected outputs

---

### 2. Test Harness Tests (`comparison-test-harness/`)

**Purpose**: Prove we understand the old extension's EXACT behavior in every detail

**What They Test**:
- Direct comparison: old extension output vs new extension output
- Validates backward compatibility
- Tests that new extension can replicate old behavior with correct settings
- ⚠️ **Note**: Both extensions process same input, configs may differ slightly (new extension has `legacyMode` flag)

**Test Pattern** (MANDATORY - Validates Both Against Expected):
```typescript
const input = `...source code...`;

// Expected output from REAL old extension (NEVER guessed!)
const expected = `...VERIFIED from old extension...`;

const oldResult = await organizeImportsOld(input, config);
const newResult = await organizeImportsNew(input, config);

// Both extensions must produce correct output
assert.equal(oldResult, expected, 'Old extension must produce correct output');
assert.equal(newResult, expected, 'New extension must produce correct output');
```

**Status**: ✅ **132/132 tests passing (100%)** - All tests use REAL VSCode APIs with verified expected outputs

---

## ✅ Testing Evolution - From Mocks to 100% Real VSCode APIs

**Major Milestones Achieved**:

**Session 18-20** - Real Files Implementation:
- ✅ Removed ALL MockTextDocument classes from both test harness adapters
- ✅ Removed ALL homegrown `applyEdits()` functions (line-based text manipulation)
- ✅ Implemented real temp file approach using `os.tmpdir()` + `workspace.openTextDocument()`
- ✅ Now using VSCode's real `workspace.applyEdit()` API
- ✅ Comparison test harness: 132/132 passing (100%)

**Session 19-20** - Main Extension Tests Refactored:
- ✅ Removed ~374 lines of MockTextDocument code from main extension tests
- ✅ Refactored ALL 397 tests to use real VSCode APIs
- ✅ Centralized test helpers in `src/test/test-helpers.ts`
- ✅ Main extension tests: 397/397 passing (100%)

**Session 24-26** - Mandatory Test Assertion Pattern:
- ✅ Added explicit `expected` output to ALL 132 comparison tests
- ✅ Fixed 26 tests that had incorrect guessed expected values
- ✅ All expected outputs verified from REAL old extension behavior
- ✅ Removed all `assert.equal(result1, result2)` patterns

**Session 27 (Oct 2025)** - Final Test Methodology Audit:
- ✅ Audited ALL 529 tests (132 comparison + 397 main extension)
- ✅ Found and fixed 1 remaining test using bad assertion pattern (Test 076)
- ✅ 100% compliance with mandatory test assertion pattern
- ✅ ALL tests now validate against explicit expected outputs

**Current Status**: ✅ **529/529 tests passing (100%)** - All tests use REAL VSCode APIs with verified expected outputs

---

## 📝 Configuration (15 Options)

All settings are under `miniTypescriptHero.imports.*`:

### Core Settings
1. `insertSpaceBeforeAndAfterImportBraces` (boolean) - `{ A }` vs `{A}`
2. `insertSemicolons` (boolean) - Add semicolons or not
3. `stringQuoteStyle` (single/double) - `'` vs `"`
4. `removeTrailingIndex` (boolean) - `./foo/index` → `./foo`
5. `multiLineWrapThreshold` (number) - Chars before wrapping to multiple lines
6. `multiLineTrailingComma` (boolean) - Add trailing comma in multiline imports

### Grouping & Sorting
7. `grouping` (array) - Group order: `['Plains', 'Modules', 'Workspace']`
8. `disableImportsSorting` (boolean) - Disable all sorting
9. `organizeSortsByFirstSpecifier` (boolean) - Sort by first specifier vs library name

### Removal & Merging
10. `disableImportRemovalOnOrganize` (boolean) - Keep unused imports
11. `ignoredFromRemoval` (string[]) - Libraries to never remove (default: `['react']`)
12. `mergeImportsFromSameModule` (boolean) - **NEW!** Merge duplicate imports

### Blank Lines
13. `blankLinesAfterImports` (one/two/preserve/legacy) - How many blank lines after imports

### Behavior & Compatibility
14. `organizeOnSave` (boolean) - Automatically organize imports when saving files
15. `legacyMode` (boolean) - **INTERNAL!** Replicate old TypeScript Hero bugs exactly (auto-set by migration)

---

## 🐛 Bug Status (Session 18 Update)

### 1. ignoredFromRemoval Skips Specifier Sorting
**Status**: ✅ ALREADY FIXED (lines 270-278)
- Code already sorts specifiers for imports in `ignoredFromRemoval` list
- React imports DO get alphabetized correctly
- Bug was fixed in earlier session

### 2. Legacy Mode Blank Line Formula
**Status**: ⚠️ **FORMULA WAS COMPLETELY WRONG!**
**Location**: `src/imports/import-manager.ts` lines 737-762

**What We Thought**:
- Single group: 3 blank lines
- Multiple groups: `imports + separators + 3` blank lines

**Reality (Session 18 Discovery)**:
- Old extension's behavior is **inconsistent** and varies by scenario
- Old extension actually **preserves existing blank lines** from source
- The 'legacy' formula doesn't match old extension at all
- Test results: 'legacy' mode = 4/125 passing (3%), 'preserve' mode = 93/125 passing (74%)

**Recommendation**: Consider removing or replacing 'legacy' mode implementation

---

## 🎓 Key Technical Decisions

### 1. Use ts-morph Instead of typescript-parser
**Why**: typescript-parser is deprecated (7 years old, no updates). ts-morph is actively maintained, modern, and has better TypeScript support.

### 2. Decouple Merging from Removal
**Old Behavior**: `disableImportRemovalOnOrganize: false` did BOTH removal AND merging
**New Behavior**: Separate `mergeImportsFromSameModule` setting
**Benefit**: More control, modern best practice (always merge imports)

### 3. Smart Settings Migration
**What**: Automatically migrates old TypeScript Hero settings to new extension
**How**: `src/configuration/settings-migration.ts` runs on activation
**Preserves**: 100% backward compatibility - users don't notice the change

### 4. Legacy Mode for Blank Lines
**Why**: Old extension has buggy blank line behavior, but users depend on it
**How**: `blankLinesAfterImports: 'legacy'` replicates exact old bugs
**For**: Migrated users get legacy mode automatically
**New Users**: Get modern 'one' blank line (ESLint/Google standard)

---

## 🚀 Phase Status

- ✅ **Phase 1-10**: Main extension complete (scaffold, port, test, migrate repo)
- ✅ **Phase 10.5**: Comparison test harness created (132 tests)
- ✅ **Phase 11**: Testing & Validation
  - ✅ Fixed test harness - all tests use REAL VSCode APIs
  - ✅ Fixed ignoredFromRemoval bug (already fixed in earlier session)
  - ✅ Updated all tests to use real files (no mocks)
  - ✅ All 529 tests passing (100%)
  - ✅ Mandatory test assertion pattern enforced
  - ✅ Test methodology audit complete
- 🎯 **Phase 12**: Ready for Publishing
  - ✅ Extension fully functional
  - ✅ All tests passing
  - ✅ Documentation complete
  - ⏭️ Next: Final verification and publish to VSCode Marketplace

---

## 💡 Key Insights from Development

### Session 18 Discovery: Old Extension's Blank Lines Are Inconsistent!
Through systematic testing, discovered the old extension's blank line behavior is **inconsistent** and varies by scenario. It actually **preserves existing blank lines** from source files, not following any predictable formula. The 'legacy' mode we implemented was completely wrong. 'preserve' mode gives 74% test pass rate.

### Session 17 Discovery: Stop Mocking VSCode!
Multiple sessions were wasted debugging phantom bugs in mock code. The lesson: **Use real VSCode APIs whenever possible!**

### Session 14 Discovery: Merging Was Coupled
Old extension's `disableImportRemovalOnOrganize` controlled BOTH removal and merging. New extension decouples these for better control.

### Session 12 Discovery: Comparison Tests Are Essential
Created 125 tests comparing old vs new. Found critical insights before release. Worth the time investment!

### Session 15 Discovery: Configuration Coverage Gaps
Only 77% of config options properly tested. Some options (`removeTrailingIndex`) had NO tests. Created action plan to add 16+ tests.

### October 2025 Discovery: Test Assertion Pattern Must Be Mandatory!
Comprehensive audit of all 529 tests revealed critical pattern: Comparing two results without validating against expected output is **WORTHLESS**. Found 1 test still using `assert.equal(result1, result2)` which can pass even if both are wrong (empty string, same bug, etc.). Established mandatory pattern: **EVERY test must validate against explicit expected output from REAL extension behavior**. No exceptions. This is now documented and enforced across entire codebase.

---

## 🎯 Development Commands

```bash
# Main extension tests
npm test

# Comparison test harness
cd comparison-test-harness
npm test

# Watch mode (during development)
npm run watch
npm run watch-tests

# Compile
npm run compile

# Package for distribution
vsce package
```

---

---

## ⚠️ IMPORTANT: Keep This Document Updated!

**INSTRUCTION TO CLAUDE**: Update this CLAUDE.md file whenever information becomes outdated. Any code changes, architectural decisions, bug fixes, or new discoveries that make this document stale MUST be reflected here immediately. This is the source of truth for understanding the project.

**Check & Update**:
- File paths and structure changes
- Configuration option changes
- Bug status changes
- Test status changes
- New discoveries or lessons learned
- Technical decisions

---

**Last Updated**: 2025-10-21 (Test Methodology Audit Complete)
**Current Branch**: `mini-typescript-hero-v4`
**Version**: 4.0.0-rc.0
**Status**: ✅ **529/529 tests passing (100%)** - All tests audited and verified following mandatory assertion pattern!


## How to create an audit file

Of our own code
and of the old typescript hero

```
gitingest -e "*node_modules*,*vscode-test*,*.js,*logo*,*old-typescript*,*package*,CLAUDE*,*logo*,.claude,*.DS_Store*,digest.txt,*out*" ./
cd comparison-test-harness/old-typescript-hero && gitingest -e "*node_modules*,*vscode-test*,*.DS_Store*,digest.txt" ./ && cd ../..
{
  echo "*** MINI TYPESCRIPT HERO FOLDER CONTENT ***"
  echo ""
  cat digest.txt
  echo ""
  echo ""
  echo "*** OLD TYPESCRIPT HERO FOLDER CONTENT ***"
  echo ""
  cat comparison-test-harness/old-typescript-hero/digest.txt
} > digest-combined.txt && mv digest-combined.txt digest.txt
```
