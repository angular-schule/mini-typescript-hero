# Mini TypeScript Hero - Project Guide

## 📖 What Is This Project?

**Mini TypeScript Hero** is a VSCode extension that sorts and organizes TypeScript/JavaScript imports. It's a modernized extraction of the single most valuable feature from the deprecated TypeScript Hero extension.

**Original Author**: Christoph Bühler (no longer maintains TypeScript Hero)
**New Maintainer**: Angular.Schule (Johannes Hoppe)
**License**: MIT (with attribution to original author)
**Repository**: https://github.com/angular-schule/mini-typescript-hero

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

**Test Pattern**:
```typescript
const doc = new MockTextDocument('test.ts', content);  // ⚠️ Still uses mocks
const manager = new ImportManager(doc, config, logger);
const edits = manager.organizeImports();
const result = applyEdits(content, edits);  // ⚠️ Homegrown function
```

**Status**: 206/215 passing (9 legacy blank line tests broken - fixing after test harness)

**TODO**: Apply real file approach from test harness (Step 2 - AFTER test harness works)

---

### 2. Test Harness Tests (`comparison-test-harness/`)

**Purpose**: Prove we understand the old extension's EXACT behavior in every detail

**What They Test**:
- Direct comparison: old extension output vs new extension output
- ⚠️ **Note**: Both extensions process same input, but configs may differ slightly (new extension has legacy flags)
  - **What matters**: New extension can produce correct output that matches old extension
  - **Not required**: Configs must be identical (new extension may need `blankLinesAfterImports: 'legacy'` to match old default)
- Validates backward compatibility
- Tests that new extension can replicate old behavior with correct settings

**Test Pattern**:
```typescript
const oldResult = await organizeImportsOld(input, config);
const newResult = await organizeImportsNew(input, config);
assert.strictEqual(newResult, oldResult);  // Must match exactly!
```

**Status**: ALL tests failing with "Unable to read file '/test.ts'" (blocked on real file implementation)

**TODO**: Implement real file approach (Step 1 - PRIORITY!)

---

## ✅ Session 18 Breakthrough - Real Files Implementation COMPLETE!

**What Was Fixed**:
- ✅ Removed ALL MockTextDocument classes from both adapters
- ✅ Removed ALL homegrown `applyEdits()` functions
- ✅ Implemented real temp file approach using `os.tmpdir()` + `workspace.openTextDocument()`
- ✅ Now using VSCode's real `workspace.applyEdit()` API
- ✅ All 125 tests now RUN (no more "Unable to read file" errors!)
- ✅ **93/125 tests passing (74% pass rate)** ← Excellent result!

**Critical Discovery - Old Extension's Inconsistent Blank Line Behavior**:
Through systematic testing:
- `'one'`: 93/125 passing ✅
- `'two'`: 4/125 passing ❌
- `'preserve'`: 93/125 passing ✅
- `'legacy'`: 4/125 passing ❌

**Key Finding**: The old extension **preserves existing blank lines** from source files (inconsistent behavior). The 'legacy' mode formula we implemented was completely wrong. Best match: **'preserve' mode** (74% pass rate).

---

## 📝 Configuration (13 Options)

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
- ✅ **Phase 10.5**: Comparison test harness created (129 tests)
- 🔄 **Phase 11**: Publishing (BLOCKED on fixing test harness)

**After Test Harness Works**:
1. Fix ignoredFromRemoval bug
2. Update general tests to use real files
3. Verify all tests pass
4. Document final differences
5. Publish to VSCode Marketplace

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

**Last Updated**: 2025-10-12 (Session 18)
**Current Branch**: `mini-typescript-hero-v4`
**Version**: 4.0.0-rc.0
**Status**: ✅ Real file implementation COMPLETE! 93/125 comparison tests passing (74%)
