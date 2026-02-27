# Mini TypeScript Hero - Project Guide

## 📖 What Is This Project?

**Mini TypeScript Hero** is a VSCode extension that sorts and organizes TypeScript/JavaScript imports. It's a modernized extraction of the single most valuable feature from the deprecated TypeScript Hero extension.

**Original Author**: Christoph Bühler (no longer maintains TypeScript Hero)
**New Maintainer**: Angular.Schule (Johannes Hoppe)
**License**: MIT (with attribution to original author)
**Repository**: https://github.com/angular-schule/mini-typescript-hero

**Terminology**:
- **Old extension** = Original "TypeScript Hero" by Christoph Bühler (deprecated, uses typescript-parser)
  - Included as git submodule at `tests/comparison/old-typescript-hero/`
  - Used by comparison tests to verify backward compatibility
- **New extension** = This project "Mini TypeScript Hero" (modern, uses ts-morph)

---

## 🎯 Project Goal

Extract and modernize the "Sort and organize your imports" feature with:
- ✅ **Comprehensive backward compatibility** with TypeScript Hero settings
- ✅ **Modern tech stack** (ts-morph, esbuild, latest TypeScript)
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

**For Comparison Tests:**
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
│   ├── commands/
│   │   └── batch-organizer.ts            ← Workspace/folder batch operations
│   ├── imports/
│   │   ├── import-manager.ts             ← Core: organizes imports, ts-morph usage
│   │   ├── import-organizer.ts           ← Orchestrator, VSCode integration
│   │   ├── import-types.ts               ← Import model types (NamedImport, etc.)
│   │   ├── import-utilities.ts           ← Sorting and helper functions
│   │   └── import-grouping/              ← Group definitions (Plains, Modules, etc.)
│   └── configuration/
│       ├── imports-config.ts             ← Config options wrapper
│       ├── settings-migration.ts         ← Migrates old TypeScript Hero settings
│       └── conflict-detector.ts          ← Detects conflicts with Prettier/ESLint
│
├── tests/                                ← All test-related folders
│   ├── unit/                             ← Main extension tests (run with npm test)
│   │   ├── import-manager.test.ts        ← Core import manager tests (~100 tests)
│   │   ├── import-manager.*.test.ts      ← Additional: blank-lines, edge-cases, indentation, etc.
│   │   ├── import-grouping.test.ts       ← Grouping logic tests
│   │   ├── import-organizer.test.ts      ← Orchestrator/command tests
│   │   ├── import-utilities.test.ts      ← Sorting utility tests
│   │   ├── configuration/                ← Config-related tests
│   │   │   ├── settings-migration.test.ts  ← Migration tests
│   │   │   └── conflict-detector.test.ts   ← Conflict detection tests
│   │   ├── commands/
│   │   │   └── batch-organizer.integration.test.ts  ← Batch operation tests
│   │   ├── test-helpers.ts               ← Shared test utilities
│   │   ├── test-types.ts                 ← Test type definitions
│   │   └── *.test.ts                     ← Additional: manifest, perf, vscode defaults, etc.
│   ├── comparison/                       ← Old vs new comparison tests
│   │   ├── old-extension/adapter.ts      ← Adapter for old TypeScript Hero
│   │   ├── new-extension/adapter.ts      ← Adapter for new Mini TypeScript Hero
│   │   ├── old-typescript-hero/          ← Git submodule (original extension)
│   │   └── test-cases/*.test.ts          ← Comparison tests
│   ├── manual/                           ← Manual testing scenarios
│   └── workspaces/                       ← Pre-configured workspace for tests
│       └── single-root/                  ← VS Code opens this folder during tests
│
├── package.json                          ← Extension manifest, config schema
├── CLAUDE.md                             ← This file (project overview)
└── README.md                             ← User-facing documentation
```

---

## 🧪 Test Infrastructure - CRITICAL!

### Why Tests Need a Pre-Configured Workspace

**The Problem:** Tests that call `workspace.updateWorkspaceFolders()` cause VS Code to restart the extension host. In CI headless mode, this crashes tests with `{ name: 'Canceled' }` errors.

**The Solution:** Pre-configure a workspace folder that VS Code opens BEFORE tests run. Tests create temp files INSIDE this workspace instead of mutating the workspace structure.

### Configuration Files Explained

**.vscode-test.mjs** configures the test runner with TWO different directories:

```javascript
export default defineConfig({
    files: 'out/tests/unit/**/*.test.js',
    workspaceFolder: path.join(__dirname, 'tests/workspaces/single-root'),  // ← WORKSPACE
    launchArgs: ['--user-data-dir=/tmp/mths-user-data'],                    // ← USER DATA
    mocha: { timeout: 10000 }
});
```

| Setting | Path | Purpose |
|---------|------|---------|
| `workspaceFolder` | `tests/workspaces/single-root/` | **Workspace** - the "project folder" VS Code opens. Tests create temp files here. |
| `--user-data-dir` | `/tmp/mths-user-data` | **User data** - VS Code's internal storage (settings, extensions, caches). Isolated from your real VS Code installation. |

**Visual representation:**
```
VS Code Test Instance
├── Workspace: tests/workspaces/single-root/   ← Project folder (workspaceFolder)
│   └── mths-workspace-123456-abc/             ← Temp files created by tests
│       ├── file1.ts
│       └── file2.ts
│
└── User Data: /tmp/mths-user-data             ← VS Code internals (--user-data-dir)
    ├── User/settings.json
    ├── extensions/
    └── logs/
```

**Why `/tmp/mths-user-data`?**
- macOS has a 103-character limit for Unix socket paths
- Default VS Code user-data paths can exceed this limit, causing crashes
- Short path `/tmp/mths-user-data` avoids this issue

**Why `tests/workspaces/single-root/`?**
- Tests need a workspace to be open for `vscode.workspace.*` APIs
- Pre-opening avoids `workspace.updateWorkspaceFolders()` calls that crash CI
- Temp files are created INSIDE this folder and cleaned up after tests

### tsconfig.json Excludes

The `tests/workspaces` folder MUST be excluded from TypeScript compilation:

```json
{
  "exclude": [
    "node_modules",
    ".vscode-test",
    "tests/manual",
    "tests/comparison",
    "tests/workspaces"           // ← IMPORTANT: Exclude temp test files!
  ]
}
```

**Why?** Tests create `.ts` files in `tests/workspaces/`. If a test crashes without cleanup, these orphaned files would cause TypeScript compilation errors.

---

## 🔧 Two Test Environments

### 1. General Extension Tests (`tests/unit/`)

**Purpose**: Ensure the new extension has high reliability and catches all known bugs

**What They Test**:
- All import organization features
- Configuration options
- Edge cases (shebangs, directives, old TypeScript syntax)
- Settings migration from old TypeScript Hero
- **Both** shared functionality (old+new) AND new-only features

**Test Nature**: These are **integration tests** that run in a real VS Code environment with the full TS/JS language server. They use real file I/O, real VS Code APIs, and real TypeScript parsing. This makes them slower but ensures they test the extension as users experience it.

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

## 📦 Extension Activation

### Why We Keep `activationEvents` in package.json

The `activationEvents` array is **required and correct**:

```json
"activationEvents": [
  "onLanguage:typescript",
  "onLanguage:typescriptreact",
  "onLanguage:javascript",
  "onLanguage:javascriptreact"
],
```

**Common misconception:** VS Code 1.74+ made activation events "implicit"

**Reality:** Only **command** activation (`onCommand`) became implicit. Language-based activation (`onLanguage`) is different - it activates the extension when specific file types are opened.

**Why we need this:**
- Our extension must activate when TS/JS files are opened (not when commands are invoked)
- Without `onLanguage` activation events, the extension won't be ready when users open TypeScript/JavaScript files
- The `contributes.commands` entries only handle command registration, not language-based activation

**References:**
- VS Code 1.74 Release Notes: https://code.visualstudio.com/updates/v1_74
- StackOverflow: https://stackoverflow.com/a/75303487 (about `onCommand`, NOT `onLanguage`)

---

### 2. Comparison Tests (`tests/comparison/`)

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

## 📝 Configuration

All settings are under `miniTypescriptHero.imports.*`:

### Core Formatting
1. `insertSpaceBeforeAndAfterImportBraces` (boolean) - `{ A }` vs `{A}`
2. `insertSemicolons` (boolean) - Add semicolons or not
3. `stringQuoteStyle` (single/double) - `'` vs `"`
4. `removeTrailingIndex` (boolean) - `./foo/index` → `./foo`
5. `multiLineWrapThreshold` (number) - Chars before wrapping to multiple lines
6. `multiLineTrailingComma` (boolean) - Add trailing comma in multiline imports

### Indentation (used when `useOnlyExtensionSettings` is true)
7. `tabSize` (number) - Tab size for multiline imports (default: 2)
8. `insertSpaces` (boolean) - Use spaces instead of tabs (default: true)
9. `useOnlyExtensionSettings` (boolean) - Ignore VS Code settings, use only extension settings

### Grouping & Sorting
10. `grouping` (array) - Group order: `['Plains', 'Modules', 'Workspace']`
11. `disableImportsSorting` (boolean) - Disable all sorting
12. `organizeSortsByFirstSpecifier` (boolean) - Sort by first specifier vs library name

### Removal & Merging
13. `disableImportRemovalOnOrganize` (boolean) - Keep unused imports
14. `ignoredFromRemoval` (string[]) - Libraries to never remove (default: `['react']`)
15. `mergeImportsFromSameModule` (boolean) - Merge duplicate imports from same module

### File Exclusion
16. `excludePatterns` (string[]) - Glob patterns for files to exclude from import organization

### Blank Lines
17. `blankLinesAfterImports` (one/two/preserve) - How many blank lines after imports (Note: This setting has no effect when legacyMode is true — legacy mode always uses 'preserve' behavior with special handling for headers and leading blanks)

### Behavior & Compatibility
18. `organizeOnSave` (boolean) - Automatically organize imports when saving files
19. `legacyMode` (boolean) - Replicate old TypeScript Hero behavior exactly (auto-set to `true` for migrated users)

---

## 🎮 Commands

All commands are prefixed with `miniTypescriptHero`:

| Command | Title | Description |
|---------|-------|-------------|
| `imports.organize` | Organize imports (sort and remove unused) | Organize imports in current file (Ctrl+Alt+O / Cmd+Alt+O) |
| `imports.organizeWorkspace` | Organize imports in workspace | Organize imports in all TS/JS files in workspace |
| `imports.organizeFolder` | Organize imports in folder | Organize imports in all TS/JS files in selected folder (context menu) |
| `checkConflicts` | Check for configuration conflicts | Detect conflicts with other formatters (Prettier, ESLint) |
| `toggleLegacyMode` | Toggle legacy mode | Switch between legacy and modern formatting behavior |

---

## 🔧 Technical Implementation Notes

### 🌟 GOLDEN RULE: ts-morph Usually Supports Everything

**CRITICAL**: ts-morph is the leading TypeScript manipulation library. NEVER assume a feature is not available!

**Process**:
1. Check the API first with `Object.getOwnPropertyNames(Object.getPrototypeOf(obj))`
2. Search for methods related to your feature (e.g., `getAttributes()`, `getModifiers()`)
3. Test with real code to understand the API behavior
4. Only fall back to text manipulation if absolutely necessary

**Example**: Import attributes (`with { type: 'json' }`)
- ❌ Wrong assumption: "ts-morph doesn't support this, use regex"
- ✅ Correct approach: Check API → found `getAttributes()` → use proper API

**Why This Matters**:
- ts-morph handles edge cases (nested braces, comments, multi-line, etc.)
- Text manipulation is brittle and error-prone
- ts-morph APIs are well-tested and maintained

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
**Preserves**: Seamless migration - users don't notice the change, settings transfer automatically

### 4. Legacy Mode for Backward Compatibility
**Why**: Old extension has specific behaviors (blank lines, within-group sorting, merge timing bug) that users depend on
**How**: `legacyMode: true` replicates old formatting behaviors and merge timing quirks for output consistency (with documented exceptions for crashes and edge cases)
**For**: Migrated users get `legacyMode: true` automatically
**New Users**: Get `legacyMode: false` by default for modern best practices (1 blank line, correct sorting, proper merge timing)
**Note**: See README for specific behaviors replicated and exceptions. Both old and new extensions merge imports by default; legacy mode preserves the old merge-before-removeTrailingIndex timing that can create duplicates.

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

# Comparison tests
cd tests/comparison
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
cd tests/comparison/old-typescript-hero && gitingest -e "*node_modules*,*vscode-test*,*.DS_Store*,digest.txt" ./ && cd ../../..
{
  echo "*** MINI TYPESCRIPT HERO FOLDER CONTENT ***"
  echo ""
  cat digest.txt
  echo ""
  echo ""
  echo "*** OLD TYPESCRIPT HERO FOLDER CONTENT ***"
  echo ""
  cat tests/comparison/old-typescript-hero/digest.txt
} > digest-combined.txt && mv digest-combined.txt digest.txt
```
