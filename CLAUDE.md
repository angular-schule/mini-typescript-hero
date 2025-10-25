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

All tests use REAL VSCode APIs with explicit expected outputs.

---

### 2. Test Harness Tests (`comparison-test-harness/`)

**Purpose**: Validate backward compatibility between old and new extension

**What They Test**:
- Direct comparison: old extension output vs new extension output
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

All tests use REAL VSCode APIs with verified expected outputs.

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

## 🔧 Technical Implementation Notes

### Type-Only Imports Support (TS 3.8+)

**Location**: `src/imports/import-types.ts`, `src/imports/import-manager.ts`

**Implementation**:
- Extended model with `isTypeOnly` flag for `NamedImport` and `SymbolSpecifier`
- Parses both import-level (`import type`) and specifier-level (`type A`) modifiers using ts-morph
- Preserves type-only syntax in output generation
- All places where `NamedImport` instances are created preserve the flag

**Behavior**:
- **Modern mode** (`legacyMode: false`): Preserves `import type` syntax, keeps type/value imports separate (semantic requirement)
- **Legacy mode** (`legacyMode: true`): Strips `import type` keywords (matches old extension behavior)

### Import Merging Behavior

**How Both Extensions Merge**:
- **Old extension**: Merges imports from same module when `disableImportRemovalOnOrganize: false` (default)
- **New extension**: Has separate `mergeImportsFromSameModule` setting for explicit control

**Merge Timing Difference**:
- **Old extension**: Merges BEFORE `removeTrailingIndex`
  - `./lib/index` and `./lib` are treated as DIFFERENT modules (don't merge)
- **New extension (legacy mode)**: Merges BEFORE `removeTrailingIndex` (matches old behavior)
- **New extension (modern mode)**: Applies `removeTrailingIndex` FIRST, then merges
  - Both `./lib/index` and `./lib` become `./lib`, so they DO merge

---

## 🎓 Key Technical Decisions

### 1. Use ts-morph Instead of typescript-parser
**Why**: typescript-parser is deprecated (7 years old, no updates). ts-morph is actively maintained, modern, and has better TypeScript support.

### 2. Decouple Merging from Removal
**Old Behavior**: `disableImportRemovalOnOrganize: false` did BOTH removal AND merging (coupled together)
**New Behavior**: Separate `mergeImportsFromSameModule` setting for explicit control
**Benefit**: Can merge imports without removing unused ones, or vice versa. More flexible than old coupled behavior.

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

## 💡 Important Development Lessons

### Use Real VSCode APIs, Not Mocks
Tests run in REAL VSCode environment. Using mocked TextDocument and homegrown `applyEdits()` created phantom bugs that wasted debugging time. Always use `workspace.openTextDocument()` and `workspace.applyEdit()`.

### Test Assertion Pattern Must Be Mandatory
Comparing two results without validating against expected output is worthless - both could be wrong and test still passes. Every test must validate against explicit expected output from REAL extension behavior.

### Validate Assumptions Against Real Code
Testing artifacts can mislead. Code inspection revealed old extension DOES merge imports (via `libraryAlreadyImported` check), contrary to what test results initially suggested. Always verify behavioral assumptions by reading actual implementation.

### Type-Only Imports Are Semantic, Not Cosmetic
TypeScript 3.8+ `import type` syntax affects runtime semantics and bundling. Converting `import type { T }` to `import { T }` can break type-only import isolation, affect tree-shaking, and change module loading. New extension preserves `import type` in modern mode for correct TypeScript 3.8+ semantics.

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
