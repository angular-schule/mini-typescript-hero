# COMPREHENSIVE ROADMAP: Mini TypeScript Hero Evolution

Based on organize-imports-cli research, VS Code capabilities analysis, and current codebase audit.

---

## 🎯 STRATEGIC VISION

**Goal**: Make Mini TypeScript Hero the definitive import organization tool for TypeScript/JavaScript, covering ALL use cases:
1. ✅ **Per-file in VS Code** (DONE - current extension)
2. 🔄 **Workspace-wide in VS Code** (Phase 1 - high value)
3. 🔄 **CLI for single files** (Phase 2 - enables CI/CD)
4. 🔄 **CLI for workspace** (Phase 2 - complete solution)

---

## 📊 RESEARCH FINDINGS SUMMARY

### What We Learned from organize-imports-cli

**CRITICAL DISCOVERY**: CLI is 100% feasible without VS Code APIs!

- ✅ Uses **ts-morph standalone** (no VS Code dependency)
- ✅ Has own config file (`.editorconfig` + CLI args)
- ✅ Smart project detection (groups by `tsconfig.json`)
- ❌ BUT: Only basic sorting (no custom grouping/merging/formatting)

**Our Competitive Advantage**:
- We have **ImportManager** with custom logic already built
- Can **reuse 90% of code** between extension and CLI
- Just need adapters for ts-morph and config loading

### VS Code Built-in Gaps

- ❌ No workspace-wide "Organize Imports"
- ❌ No custom grouping (Plains/Modules/Workspace)
- ❌ No `/index` removal
- ❌ No import merging control
- ✅ Microsoft labeled this "extension-candidate" (they want us to build it!)

---

## 🗺️ PHASED IMPLEMENTATION PLAN

### PHASE 0: Polish Current Extension (IMMEDIATE - 2 hours)

**Goal**: Make existing extension shine before adding new features

**Tasks**:
1. Add "Configuration Cookbook" section to README
   - Angular/Nx preset
   - React/Next preset
   - Node/Library preset
   - Monorepo preset

2. Add "Using with Prettier and ESLint" section
   - Clear conflict resolution guidance
   - Link to existing conflict checker

3. Add "Debugging" section
   - How to use Output Channel
   - How to file good bug reports

**Success Criteria**:
- User can copy-paste working config for their stack
- User knows how to resolve Prettier/ESLint conflicts
- Bug reports include useful diagnostic info

**Checkpoint**: README is production-ready, no open questions

---

### PHASE 1: Workspace-Wide Organization (HIGH PRIORITY - 1 week)

**Goal**: Add workspace/folder-wide import organization to extension

#### 1.1 Architecture Design

**Key Decisions**:
- Reuse existing `ImportOrganizer` and `ImportManager` classes
- Use VS Code's `workspace.findFiles()` for file discovery
- Process files sequentially (not in parallel) to avoid race conditions
- Show progress notification with cancellation support

**Files to Create**:
```
src/commands/
├── organize-workspace.ts       ← New command
└── organize-folder.ts          ← New command (context menu)
```

**Files to Modify**:
```
src/extension.ts                ← Register new commands
package.json                    ← Add commands + context menu
```

#### 1.2 Implementation Tasks

**Task 1.2.1: Add workspace command** (2 hours)
- Command: `miniTypescriptHero.imports.organizeWorkspace`
- Uses `workspace.findFiles('**/*.{ts,tsx,js,jsx}', '**/node_modules/**')`
- Processes each file with existing `ImportOrganizer`
- Shows progress: "Organizing imports: 143/287 files..."

**Task 1.2.2: Add folder context menu** (2 hours)
- Command: `miniTypescriptHero.imports.organizeFolder`
- Triggered from Explorer context menu (right-click folder)
- Same logic as workspace but scoped to folder
- Recursive subdirectory processing

**Task 1.2.3: Error handling & UX** (2 hours)
- Handle dirty files (prompt to save or skip)
- Continue on error (log failures, don't stop)
- Cancellation support (via progress token)
- Summary notification: "Organized 143 files, 12 skipped, 2 errors"

**Task 1.2.4: Testing** (4 hours)
- Create test workspace with multiple files
- Test error scenarios (read-only files, syntax errors)
- Test cancellation mid-operation
- Test with large workspace (1000+ files)

#### 1.3 Success Criteria

**Functional**:
- ✅ User can right-click folder → "Organize Imports in Folder"
- ✅ User can run command → "Organize Imports in Workspace"
- ✅ Progress shown with file count
- ✅ Errors logged but don't stop processing
- ✅ User can cancel operation
- ✅ Summary shown at end

**Performance**:
- ✅ Processes 100 files in <10 seconds
- ✅ Processes 1000 files in <2 minutes
- ✅ Memory usage stable (no leaks)

**UX**:
- ✅ Clear progress indication
- ✅ Errors clearly communicated
- ✅ Undo works (via VS Code's built-in undo)

#### 1.4 Checkpoint

**Before moving to Phase 2**:
- All tests passing (including new workspace tests)
- Manual testing on real projects (Angular, React, Node)
- Performance acceptable on large workspace
- Documentation updated (README + CHANGELOG)
- No open bugs in workspace feature

---

### PHASE 2: CLI Implementation (NEXT PRIORITY - 1-2 weeks)

**Goal**: Standalone CLI that works without VS Code, uses same config format

#### 2.1 Architecture Refactoring

**Problem**: Current code tightly coupled to VS Code APIs

**Solution**: Extract core logic into shared package

**New Structure**:
```
packages/
├── core/                       ← NEW: Shared logic (no VS Code deps)
│   ├── src/
│   │   ├── import-manager.ts   ← Move from extension
│   │   ├── import-grouping/    ← Move from extension
│   │   ├── import-types.ts     ← Move from extension
│   │   └── config-types.ts     ← NEW: Config interface
│   └── package.json
│
├── extension/                  ← RENAMED: Current extension code
│   ├── src/
│   │   ├── extension.ts
│   │   ├── configuration/
│   │   │   └── imports-config.ts  ← Implements config-types
│   │   ├── imports/
│   │   │   └── import-organizer.ts
│   │   └── commands/
│   └── package.json
│
└── cli/                        ← NEW: CLI tool
    ├── bin/
    │   └── cli.ts              ← Entry point
    ├── src/
    │   ├── cli-organizer.ts    ← Uses @core
    │   ├── config-loader.ts    ← Loads mini-typescript-hero.json
    │   └── file-processor.ts   ← ts-morph integration
    └── package.json
```

#### 2.2 Core Package Extraction

**Task 2.2.1: Create @mini-typescript-hero/core** (4 hours)
- Move `ImportManager` to core (already VS Code-independent!)
- Move import grouping logic to core
- Move import types to core
- Define `IImportsConfig` interface (no VS Code types)
- All tests still passing

**Task 2.2.2: Update extension to use @core** (2 hours)
- Extension depends on `@mini-typescript-hero/core`
- `ImportsConfig` implements `IImportsConfig`
- All tests still passing
- No functional changes

#### 2.3 CLI Implementation

**Task 2.3.1: CLI scaffolding** (2 hours)
- Create `packages/cli/` with commander setup
- Basic file processing with ts-morph
- Test with single file

**Task 2.3.2: Config loader** (3 hours)
- Load `mini-typescript-hero.json` from project root
- Fallback to `.editorconfig` for basic formatting
- CLI flag overrides
- Validate config against schema

**Task 2.3.3: Project detection** (3 hours)
- Smart `tsconfig.json` detection (like organize-imports-cli)
- Group files by project
- Ad-hoc projects for standalone files

**Task 2.3.4: File processing** (4 hours)
- Use ts-morph `Project` class
- Call `ImportManager` for each file
- Apply edits to ts-morph `SourceFile`
- Save modified files

**Task 2.3.5: CLI features** (3 hours)
- `--check` mode for CI (exit 1 if changes needed)
- `--config` flag for custom config path
- Progress output (terminal-friendly)
- Error handling and reporting

#### 2.4 Config File Design

**File**: `mini-typescript-hero.json` (or `.mini-typescript-hero.json`)

```json
{
  "$schema": "https://unpkg.com/mini-typescript-hero/schema.json",
  "imports": {
    "insertSpaceBeforeAndAfterImportBraces": true,
    "insertSemicolons": true,
    "stringQuoteStyle": "single",
    "removeTrailingIndex": true,
    "multiLineWrapThreshold": 120,
    "multiLineTrailingComma": true,
    "grouping": [
      "Plains",
      "/^@angular\\//",
      "Modules",
      "Workspace"
    ],
    "disableImportsSorting": false,
    "organizeSortsByFirstSpecifier": false,
    "disableImportRemovalOnOrganize": false,
    "ignoredFromRemoval": ["react"],
    "mergeImportsFromSameModule": true,
    "blankLinesAfterImports": "one",
    "legacyMode": false
  }
}
```

**Alternative**: Support in `package.json`:

```json
{
  "miniTypescriptHero": {
    "imports": { ... }
  }
}
```

#### 2.5 Success Criteria

**Functional**:
- ✅ CLI can organize single file
- ✅ CLI can organize entire project (via tsconfig.json)
- ✅ CLI respects mini-typescript-hero.json config
- ✅ CLI exits with code 1 in check mode if changes needed
- ✅ CLI works on Windows, macOS, Linux

**Config**:
- ✅ Config file has JSON schema for editor autocomplete
- ✅ Config validated with helpful error messages
- ✅ All extension settings supported in config file

**Integration**:
- ✅ Works as pre-commit hook (via husky)
- ✅ Works in CI/CD (exit codes correct)
- ✅ Can be installed globally: `npm install -g mini-typescript-hero`

#### 2.6 Checkpoint

**Before release**:
- CLI tests passing (integration tests with real files)
- Cross-platform tested (Windows + macOS + Linux)
- Documentation complete (CLI usage in README)
- Config schema published
- NPM package published (@mini-typescript-hero/cli)

---

### PHASE 3: Advanced CLI Features (FUTURE - as needed)

**Task 3.1: Watch mode**
```bash
mini-typescript-hero --watch src/**/*.ts
```

**Task 3.2: Git integration**
```bash
mini-typescript-hero --staged  # Only process staged files
```

**Task 3.3: Diff preview**
```bash
mini-typescript-hero --dry-run --show-diff src/**/*.ts
```

**Task 3.4: Config migration**
```bash
mini-typescript-hero --migrate-config  # VS Code settings → mini-typescript-hero.json
```

---

## 📋 TESTING STRATEGY

### Phase 1 Tests (Workspace-Wide)

**Integration Tests** (new suite: `workspace-operations.test.ts`):
```typescript
suite('Workspace Operations', () => {
  test('Organize workspace with multiple files', async () => {
    const workspace = await createTestWorkspace([
      'file1.ts',
      'file2.ts',
      'folder/file3.ts'
    ]);

    await organizeWorkspace();

    // Verify all files organized
    for (const file of workspace.files) {
      const content = await readFile(file);
      assert.strictEqual(content, expectedContent[file]);
    }
  });

  test('Handle errors gracefully', async () => {
    // Create workspace with syntax error
    const workspace = await createTestWorkspace([
      'valid.ts',
      'invalid.ts',  // Syntax error
      'valid2.ts'
    ]);

    await organizeWorkspace();

    // Verify valid files processed, invalid skipped
    assert.equal(result.processed, 2);
    assert.equal(result.errors, 1);
  });
});
```

### Phase 2 Tests (CLI)

**Integration Tests** (new package: `packages/cli/test/`):
```typescript
describe('CLI', () => {
  it('organizes single file', () => {
    execSync('mini-typescript-hero test-file.ts');

    const result = fs.readFileSync('test-file.ts', 'utf-8');
    expect(result).toMatchSnapshot();
  });

  it('check mode exits with code 1 if changes needed', () => {
    expect(() => {
      execSync('mini-typescript-hero --check unorganized.ts');
    }).toThrow(/exit code 1/);
  });
});
```

---

## 🎯 SUCCESS METRICS

### Phase 1 (Workspace-Wide)

**User Impact**:
- Users can organize entire workspace in one click
- Time saved: ~10-60 minutes for large refactoring
- No need for second extension (Folder source actions)

**Technical**:
- Processes 1000 files in <2 minutes
- Memory usage <500MB for large workspace
- Zero crashes on real-world projects

**Market**:
- Unique feature vs competitors
- Stronger value proposition in README/marketplace

### Phase 2 (CLI)

**User Impact**:
- Can enforce import style in CI/CD
- Pre-commit hooks work without VS Code
- Teams can use in any editor (vim, emacs, etc.)

**Technical**:
- CLI processes 1000 files in <10 seconds
- Zero VS Code dependencies
- Works on Windows/macOS/Linux

**Market**:
- Competes with organize-imports-cli (78k downloads/week)
- Superior features (custom grouping, merging, formatting)
- Complete solution (extension + CLI)

---

## 🔍 AUDIT CRITERIA

### Phase 1 Audit Checklist

**Before considering complete**:
- [x] All existing tests still passing
- [x] Basic workspace/folder integration tests added
- [x] Documentation updated (README, CONFIGURATION.md)
- [x] Test single-file excludePatterns warning (team collaboration feature)
- [x] Test workspace excludePatterns (built-in + user patterns)
- [x] Test no workspace folder error handling
- [x] Test empty workspace info message
- [x] Test workspace syntax-error robustness
- [x] Test symlink edge case (VS Code bug #44964)
- [x] Test cancellation behavior
- [x] Fix + test multi-root workspace excludePatterns
- [x] Refactor settings migration (remove assert.ok(true) placeholder)
- [x] Refactor conflict detection (extract + test real logic)
- [ ] Manual testing on 3 real projects (Angular, React, Node)
- [ ] Performance tested on workspace with 1000+ files
- [ ] No memory leaks detected
- [ ] Works on Windows, macOS, Linux (CI validates)

### Phase 2 Audit Checklist

**Before considering complete**:
- [ ] Core package has zero VS Code dependencies (verify package.json)
- [ ] All 384 extension tests still passing
- [ ] CLI tests added (>20 integration tests)
- [ ] CLI works without VS Code installed (test on clean VM)
- [ ] Config schema validated and published
- [ ] CLI tested on Windows, macOS, Linux
- [ ] Pre-commit hook tested (via husky)
- [ ] CI/CD integration tested (GitHub Actions)
- [ ] Documentation complete (README + CLI guide)
- [ ] NPM package published and installable

---

## 📅 TIMELINE ESTIMATES

### Phase 0: Documentation (IMMEDIATE)
- **Effort**: 2 hours
- **When**: This week
- **Blocker**: None

### Phase 1: Workspace-Wide (HIGH PRIORITY)
- **Effort**: 1 week (16 hours)
- **When**: Next week
- **Blocker**: Phase 0 complete

### Phase 2: CLI (NEXT PRIORITY)
- **Effort**: 1-2 weeks (32-40 hours)
- **When**: After Phase 1
- **Blocker**: Phase 1 complete

### Phase 3: Advanced CLI (FUTURE)
- **Effort**: TBD (as needed)
- **When**: Based on user feedback
- **Blocker**: Phase 2 complete

---

## 🚀 PRIORITIZATION RATIONALE

**Why Phase 0 first?**
- Quick wins (<2 hours)
- Helps current users immediately
- Makes existing features more discoverable

**Why Phase 1 before Phase 2?**
- Higher user impact (VS Code users > CLI users)
- Simpler implementation (no refactoring needed)
- Validates workspace-processing logic before CLI
- Stronger release story ("workspace-wide organization!")

**Why Phase 2 is still important?**
- Unlocks CI/CD use cases
- Makes extension editor-agnostic
- Competes with organize-imports-cli
- Complete solution for teams

---

## 📝 DECISION LOG

**Decision 1: Monorepo Structure**
- **When**: Phase 2
- **Why**: Share code between extension and CLI
- **Alternative considered**: Separate repos (rejected - too much duplication)

**Decision 2: Config File Format**
- **Format**: JSON (not YAML, not TOML)
- **Why**: Matches VS Code settings.json, easy to validate
- **Schema**: Published for editor autocomplete

**Decision 3: Processing Order**
- **Approach**: Sequential (not parallel)
- **Why**: Simpler error handling, avoids race conditions
- **Trade-off**: Slightly slower, but safer

**Decision 4: Reuse ImportManager**
- **Approach**: Extract to @core, minimal changes
- **Why**: 90% of code is already VS Code-independent
- **Validation**: All existing tests must pass

---

## ✅ DEFINITION OF DONE

### Phase 0 Done When (COMPLETED 2025-11-22):
- CONFIGURATION.md created with full Cookbook (4 presets: Angular, React, Node, Monorepo)
- README has Prettier/ESLint integration section
- README has Debugging section
- MIGRATION.md created for TypeScript Hero users
- All existing tests passing
- Committed to git

**Note:** Implementation modified original plan. Instead of adding cookbook to README, created 3-file structure (README/CONFIGURATION/MIGRATION) for better organization.

### Phase 1 Done When (Implementation Complete, Audit In Progress):

**Note:** These are criteria, not current status. See Phase 1 Audit Checklist above for actual completion tracking.

**Implementation Status:**
- ✅ Commands implemented (organizeWorkspace, organizeFolder)
- ✅ Context menu working (right-click folder)
- ✅ Progress UI with cancellation support
- ✅ Error handling (continues on errors, shows summary)
- ✅ Documentation updated (README, CONFIGURATION.md)
- ✅ Basic integration tests added
- ✅ Committed to git

**Audit Status (see checklist above for details):**
- [ ] Comprehensive test coverage for all behavioral claims
- [ ] Manual testing on 3 real projects (Angular, React, Node)
- [ ] Performance tested on workspace with 1000+ files
- [ ] Multi-root workspace edge cases tested
- [ ] All error paths have test coverage

### Phase 2 Done When:
- ✅ Core package extracted
- ✅ CLI tool working
- ✅ Config file supported
- ✅ Cross-platform tested
- ✅ All tests passing
- ✅ Documentation complete
- ✅ NPM package published
- ✅ Committed to git

---

## 🎓 KEY LEARNINGS APPLIED

From organize-imports-cli research:
1. ✅ CLI without VS Code is feasible (ts-morph standalone)
2. ✅ Config file approach works (don't parse VS Code settings)
3. ✅ Smart project detection is valuable (tsconfig.json grouping)
4. ✅ Reuse core logic (don't reimplement)

From VS Code research:
1. ✅ Workspace-wide is a clear gap Microsoft wants extensions to fill
2. ✅ Existing extensions do it but with basic features only
3. ✅ Our custom grouping is unique competitive advantage

From audit findings:
1. ✅ Documentation clarity prevents user confusion
2. ✅ Test quality ensures confidence
3. ✅ Settings independence keeps code maintainable

---

**This plan is designed to be executed over multiple sessions, with clear checkpoints and validation criteria at each phase.**
