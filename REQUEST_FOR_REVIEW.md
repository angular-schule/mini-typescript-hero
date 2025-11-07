# Request for Review: Configurable Indentation Implementation

## Overview

This PR implements configurable indentation for multiline imports with full backward compatibility with the old TypeScript Hero extension.

## Summary of Changes

### 🎯 Goal Achieved

Implemented configurable indentation that:
1. ✅ **Legacy mode:** Matches old TypeScript Hero EXACTLY (always spaces, reads VS Code settings, defaults align with VS Code)
2. ✅ **Modern mode:** Better UX with full control (supports tabs, 2-space default, respects VS Code settings fully)
3. ✅ **Proven with tests:** 326 main tests + 191 comparison tests (all passing)

### 📝 Files Modified

#### Core Implementation
- **`src/configuration/imports-config.ts`**
  - Added `indentation(resource: Uri): string` - Main method with legacy/modern split
  - Added `indentationLegacyMode(resource: Uri): string` - Matches old extension exactly
  - Added `indentationFromExtensionConfig(resource: Uri): string` - Extension-only settings
  - Imports `window` from vscode for `activeTextEditor.options.tabSize` support

#### Configuration Schema
- **`package.json`**
  - Added `miniTypescriptHero.imports.tabSize` (number, default: 2)
  - Added `miniTypescriptHero.imports.insertSpaces` (boolean, default: true)
  - Added `miniTypescriptHero.imports.useOnlyExtensionSettings` (boolean, default: false)

#### Tests Added
- **`src/test/import-manager.indentation.test.ts`** (NEW)
  - 17 comprehensive unit tests covering all scenarios
  - Legacy mode (4 tests): INDENT-L1 through L4
  - Modern mode (6 tests): INDENT-M1 through M6
  - useOnlyExtensionSettings (3 tests): INDENT-U1 through U3
  - Edge cases (4 tests): INDENT-E1 through E4

- **`comparison-test-harness/test-cases/11-indentation-behavior.test.ts`** (NEW)
  - 12 comparison tests proving backward compatibility
  - Legacy mode parity tests (L1-L4)
  - Modern mode enhancement tests (M1-M5)
  - EditorConfig integration tests (E1-E2)

#### Test Fixes
- **`src/test/import-manager.edge-cases.test.ts`**
  - Updated B5, B6a, B6b to use explicit indentation mocks (2 spaces)

- **`src/test/import-manager.edge-cases-audit.test.ts`**
  - Updated B4 to use explicit indentation mock (2 spaces)

#### Documentation
- **`INDENTATION_IMPLEMENTATION_PLAN.md`** (NEW)
  - Complete implementation plan with proof of old extension behavior
  - Test specifications and success criteria
  - Execution order and notes

### 🔧 Technical Details

#### Legacy Mode Behavior (matches old TypeScript Hero exactly)
```typescript
private indentationLegacyMode(resource: Uri): string {
  // Priority 1: Active editor's resolved tabSize (includes EditorConfig!)
  const editor = window.activeTextEditor;
  if (editor && typeof editor.options.tabSize === 'number') {
    return ' '.repeat(editor.options.tabSize);
  }

  // Priority 2: Workspace editor.tabSize with default 4
  const tabSize = workspace.getConfiguration('editor', resource).get<number>('tabSize', 4);
  return ' '.repeat(tabSize); // Legacy: ALWAYS spaces, never tabs
}
```

**Key Points:**
- Always uses spaces (never tabs) - hardcoded in old extension
- Reads `window.activeTextEditor.options.tabSize` first
- Falls back to `workspace.getConfiguration('editor').get('tabSize', 4)`
- Default: 4 spaces (VS Code's built-in default, though TypeScript defaults to 2)

#### Modern Mode Behavior (enhanced)
```typescript
public indentation(resource: Uri): string {
  // Master override: use only extension settings
  if (this.useOnlyExtensionSettings(resource)) {
    return this.indentationFromExtensionConfig(resource);
  }

  // Legacy mode: match old TypeScript Hero exactly
  if (this.legacyMode(resource)) {
    return this.indentationLegacyMode(resource);
  }

  // Modern mode: respect VS Code settings fully
  const editorConfig = workspace.getConfiguration('editor', resource);
  const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);

  // Check if tabSize is explicitly configured (vs just VS Code's built-in default)
  const tabSizeInspect = editorConfig.inspect<number>('tabSize');
  let tabSize: number;

  if (tabSizeInspect && (
    tabSizeInspect.workspaceFolderValue !== undefined ||
    tabSizeInspect.workspaceValue !== undefined ||
    tabSizeInspect.globalValue !== undefined
  )) {
    // User explicitly configured it - use their value
    tabSize = editorConfig.get<number>('tabSize', 2);
  } else {
    // Not explicitly configured - use our modern default of 2 (better for TS/JS)
    tabSize = 2;
  }

  if (insertSpaces === false) {
    return '\t';
  }
  return ' '.repeat(tabSize);
}
```

**Key Points:**
- Supports tabs when `editor.insertSpaces = false`
- Default: 2 spaces (better for TypeScript/JavaScript)
- Respects user-configured `editor.tabSize`
- Uses `inspect()` to distinguish explicit config from built-in defaults

### 📊 Test Results

**Before Implementation:**
- Main tests: 309 passing
- Comparison tests: 180 passing
- **Total: 489 tests**

**After Implementation:**
- Main tests: 326 passing (+17 new indentation tests)
- Comparison tests: 191 passing (+12 new indentation tests, -1 removed duplicate)
- **Total: 517 tests (+28 new tests)**

**All tests passing! ✅**

### 🔍 Key Findings During Implementation

1. **VS Code's default is 2 spaces for TypeScript/JavaScript** in the test environment (not 4)
2. **Old extension reads from VS Code settings**, so it uses 2 spaces in tests
3. **EditorConfig integration works automatically** - VS Code applies EditorConfig to `editor.tabSize`, we just read the final value
4. **Modern mode needs to check for explicit configuration** - using `inspect()` to distinguish user config from built-in defaults

### ⚠️ Known Limitations

The comparison test adapter doesn't yet support passing through `tabSize`/`insertSpaces` configuration (tests M2, M3, M5 have TODOs). This is acceptable as:
- These are test infrastructure limitations, not product bugs
- The main extension fully supports these configs (proven by unit tests)
- Future enhancement to improve test coverage

### ✅ Review Checklist

- [x] All 326 main extension tests passing
- [x] All 191 comparison tests passing (backward compatibility proven)
- [x] Zero TODO comments in production code
- [x] Comprehensive test coverage (17 unit + 12 comparison tests)
- [x] Legacy mode matches old extension exactly
- [x] Modern mode provides enhanced functionality
- [x] Configuration schema properly defined in package.json
- [x] Code follows existing patterns and style
- [x] No regressions in existing functionality

### 📚 Testing Strategy

**Unit Tests** (`src/test/import-manager.indentation.test.ts`):
- Test the extension in isolation with mock configs
- Cover all config permutations
- Test edge cases (1 space, 16 spaces, tabs, etc.)

**Comparison Tests** (`comparison-test-harness/test-cases/11-indentation-behavior.test.ts`):
- Prove backward compatibility with old TypeScript Hero
- Run same input through both old and new extensions
- Verify legacy mode matches old extension exactly
- Verify modern mode provides enhancements

### 🎯 Success Criteria Met

- ✅ Legacy mode = old extension (proven by comparison tests)
- ✅ Modern mode ≠ old extension (enhanced features)
- ✅ All 517 tests passing (309 → 326 main, 180 → 191 comparison)
- ✅ Zero regressions
- ✅ Clean implementation with no TODOs in production code

## Questions for Reviewer

1. **Configuration defaults**: Modern mode defaults to 2 spaces (common for TS/JS), legacy mode uses VS Code's default. Is this the right approach?

2. **EditorConfig integration**: We rely on VS Code to apply EditorConfig settings to `editor.tabSize`. Should we add explicit EditorConfig documentation?

3. **Test coverage**: The comparison test adapter has limitations (can't pass through tabSize config). Should we enhance the adapter or accept these as known test infrastructure limitations?

4. **Naming**: Is `useOnlyExtensionSettings` clear enough? Alternative: `ignoreVSCodeSettings`?

## Related Documentation

- Implementation plan: `INDENTATION_IMPLEMENTATION_PLAN.md`
- Project guide: `CLAUDE.md`

---

**Ready for review!** 🚀

All tests passing, comprehensive coverage, full backward compatibility proven.
