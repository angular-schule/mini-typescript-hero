# Indentation Implementation Plan

## 🎯 Goal

Implement configurable indentation that:
1. **Legacy mode:** Matches old TypeScript Hero EXACTLY (always spaces, 4-space default, reads activeEditor)
2. **Modern mode:** Better UX with full control (supports tabs, 2-space default, respects VS Code settings)
3. **Proven with tests:** Comparison tests prove legacy parity, unit tests prove modern features

---

## 📚 Old TypeScript Hero Behavior (PROVEN)

**Source:** `comparison-test-harness/old-typescript-hero/src/configuration/index.ts:55-58`

```typescript
tabSize:
  window.activeTextEditor && window.activeTextEditor.options.tabSize
    ? (window.activeTextEditor.options.tabSize as any) * 1
    : workspace.getConfiguration('editor', resource).get('tabSize', 4),
insertSpaces: true,  // HARDCODED - always spaces, never tabs!
```

**Behavior:**
- ✅ Priority 1: `window.activeTextEditor.options.tabSize` (current editor's resolved value)
- ✅ Priority 2: `workspace.getConfiguration('editor').get('tabSize', 4)` with default **4**
- ⚠️ **ALWAYS uses spaces** - never tabs (hardcoded `insertSpaces: true`)
- ⚠️ No extension config for indentation
- ⚠️ No way to override

---

## 🧪 Phase 1: Add Comparison Tests (Test Harness)

**File:** `comparison-test-harness/test-cases/11-indentation-behavior.test.ts` (NEW)

### Test Suite 1: Legacy Mode - Prove Exact Parity

```typescript
suite('Legacy Mode Indentation (Old Extension Parity)', () => {

  test('L1: Uses 4 spaces by default (VS Code default)', async () => {
    const input = `import { VeryLongNameA, VeryLongNameB, VeryLongNameC, VeryLongNameD, VeryLongNameE } from 'library';`;
    const config = { legacyMode: true, multiLineWrapThreshold: 50 };

    const expected = `import {\n    VeryLongNameA,\n    VeryLongNameB,\n    ...\n} from 'library';`;
    // OLD: Uses 4 spaces
    // NEW: Should use 4 spaces in legacy mode
  });

  test('L2: Always uses spaces (never tabs) even if editor.insertSpaces is false', async () => {
    // Set up: editor.insertSpaces = false
    // Expected: OLD and NEW both use SPACES (ignore insertSpaces in legacy mode)
  });

  test('L3: Respects activeEditor.options.tabSize when available', async () => {
    // This test will be challenging - need to mock activeEditor
    // Or document as "known limitation: can't test activeEditor in comparison harness"
  });

  test('L4: Falls back to editor.tabSize when no activeEditor', async () => {
    // No active editor (normal case for our tests)
    // Uses workspace.getConfiguration('editor').get('tabSize')
  });

  test('L5: Uses 4 spaces when editor.tabSize is not configured', async () => {
    // No editor.tabSize configured
    // OLD: defaults to 4
    // NEW: should default to 4 in legacy mode
  });
});
```

### Test Suite 2: Modern Mode - Prove We DON'T Match Old Extension

```typescript
suite('Modern Mode Indentation (Enhanced Behavior)', () => {

  test('M1: Uses 2 spaces by default (better for TS/JS)', async () => {
    const config = { legacyMode: false, multiLineWrapThreshold: 50 };

    const expected = `import {\n  VeryLongNameA,\n  VeryLongNameB,\n  ...\n} from 'library';`;
    // OLD: Uses 4 spaces
    // NEW: Uses 2 spaces (DIFFERENT from old!)
  });

  test('M2: Respects editor.insertSpaces = false (uses tabs)', async () => {
    // Set up: editor.insertSpaces = false
    // Expected: OLD uses spaces, NEW uses TABS (DIFFERENT!)
  });

  test('M3: Respects editor.tabSize = 3', async () => {
    // Set up: editor.tabSize = 3
    // Expected: NEW uses 3 spaces
  });

  test('M4: Extension config overrides VS Code settings', async () => {
    // Set up: miniTypescriptHero.imports.tabSize = 5
    // Expected: Uses 5 spaces
  });

  test('M5: useOnlyExtensionSettings ignores VS Code entirely', async () => {
    // Set up: useOnlyExtensionSettings = true
    // editor.tabSize = 8, extension.tabSize = 2
    // Expected: Uses 2 spaces (ignores VS Code)
  });
});
```

### Test Suite 3: EditorConfig Integration

```typescript
suite('EditorConfig Integration (Via VS Code)', () => {

  test('E1: .editorconfig indent_size = 4 applied via VS Code', async () => {
    // NOTE: We can't test this in comparison harness because EditorConfig
    // extension updates editor.tabSize, and we read from there
    // Document as: "EditorConfig works automatically via VS Code settings"
  });

  test('E2: Legacy mode respects EditorConfig (via editor.tabSize)', async () => {
    // If editor.tabSize is set (by EditorConfig or user), use it
  });

  test('E3: Modern mode respects EditorConfig (via editor.tabSize)', async () => {
    // Same as legacy, but different default
  });
});
```

---

## 🧪 Phase 2: Add Unit Tests (Main Extension)

**File:** `src/test/import-manager.indentation.test.ts` (NEW)

### Test Suite 1: Legacy Mode Behavior

```typescript
suite('ImportManager - Indentation - Legacy Mode', () => {

  test('INDENT-L1: Default 4 spaces in legacy mode', async () => {
    const config = createMockConfig({ legacyMode: true });
    // Assert: Uses 4 spaces for multiline
  });

  test('INDENT-L2: Always spaces in legacy mode (never tabs)', async () => {
    const config = createMockConfig({
      legacyMode: true,
      insertSpaces: false // This should be IGNORED
    });
    // Assert: Still uses spaces (not tabs)
  });

  test('INDENT-L3: Respects editor.tabSize = 8 in legacy mode', async () => {
    // Mock editor.tabSize = 8
    // Assert: Uses 8 spaces
  });

  test('INDENT-L4: Falls back to 4 when editor.tabSize undefined', async () => {
    // Mock editor.tabSize = undefined
    // Assert: Uses 4 spaces (legacy default)
  });
});
```

### Test Suite 2: Modern Mode Behavior

```typescript
suite('ImportManager - Indentation - Modern Mode', () => {

  test('INDENT-M1: Default 2 spaces in modern mode', async () => {
    const config = createMockConfig({ legacyMode: false });
    // Assert: Uses 2 spaces for multiline
  });

  test('INDENT-M2: Uses tabs when editor.insertSpaces = false', async () => {
    // Mock editor.insertSpaces = false
    // Assert: Uses tabs (\t)
  });

  test('INDENT-M3: Respects editor.tabSize = 3', async () => {
    // Mock editor.tabSize = 3
    // Assert: Uses 3 spaces
  });

  test('INDENT-M4: Respects editor.tabSize = 8', async () => {
    // Mock editor.tabSize = 8
    // Assert: Uses 8 spaces
  });

  test('INDENT-M5: Extension config overrides editor.tabSize', async () => {
    // Mock: editor.tabSize = 4, extension.tabSize = 5
    // Assert: Uses 5 spaces (extension wins)
  });

  test('INDENT-M6: Extension config insertSpaces = false uses tabs', async () => {
    // Mock: extension.insertSpaces = false
    // Assert: Uses tabs
  });
});
```

### Test Suite 3: useOnlyExtensionSettings

```typescript
suite('ImportManager - Indentation - useOnlyExtensionSettings', () => {

  test('INDENT-U1: Ignores editor.tabSize when useOnlyExtensionSettings = true', async () => {
    const config = createMockConfig({
      useOnlyExtensionSettings: true,
      tabSize: 2 // extension setting
      // editor.tabSize would be 4
    });
    // Assert: Uses 2 spaces (extension only)
  });

  test('INDENT-U2: Ignores editor.insertSpaces when useOnlyExtensionSettings = true', async () => {
    const config = createMockConfig({
      useOnlyExtensionSettings: true,
      insertSpaces: false // extension setting
      // editor.insertSpaces would be true
    });
    // Assert: Uses tabs (extension only)
  });

  test('INDENT-U3: Works in legacy mode too', async () => {
    const config = createMockConfig({
      legacyMode: true,
      useOnlyExtensionSettings: true,
      tabSize: 2
    });
    // Assert: Uses 2 spaces (NOT 4, because useOnlyExtensionSettings overrides legacy)
  });
});
```

### Test Suite 4: Edge Cases

```typescript
suite('ImportManager - Indentation - Edge Cases', () => {

  test('INDENT-E1: Single-line import unchanged', async () => {
    const input = `import { A, B } from 'lib';`;
    // Assert: Stays single-line (threshold not exceeded)
  });

  test('INDENT-E2: Mixed spaces and tabs normalized', async () => {
    const input = `import {\n\tA,\n  B\n} from 'lib';`;
    // Assert: Normalized to consistent indentation
  });

  test('INDENT-E3: Comments preserve indentation', async () => {
    const input = `import {\n  A, // comment\n  B\n} from 'lib';`;
    // Assert: Comments maintain proper indentation
  });

  test('INDENT-E4: Very large tabSize (16) works', async () => {
    // Mock editor.tabSize = 16
    // Assert: Uses 16 spaces (no crash)
  });

  test('INDENT-E5: tabSize = 1 works', async () => {
    // Mock editor.tabSize = 1
    // Assert: Uses 1 space
  });
});
```

---

## 💻 Phase 3: Implementation

**File:** `src/configuration/imports-config.ts`

### Step 1: Add `legacyMode()` accessor (ALREADY EXISTS)

```typescript
public legacyMode(resource: Uri): boolean {
  return workspace
    .getConfiguration(sectionKey, resource)
    .get('legacyMode', false);
}
```

### Step 2: Implement `indentation()` method

```typescript
/**
 * Get indentation string for multiline imports.
 *
 * Legacy mode: Matches old TypeScript Hero exactly
 * - Always uses spaces (never tabs)
 * - Default: 4 spaces (VS Code default)
 * - Reads window.activeTextEditor.options.tabSize first
 * - Fallback: workspace.getConfiguration('editor').get('tabSize', 4)
 *
 * Modern mode: Enhanced with full control
 * - Respects editor.insertSpaces (supports tabs)
 * - Default: 2 spaces (better for TS/JS)
 * - Extension config can override
 * - useOnlyExtensionSettings skips VS Code entirely
 */
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
  const tabSize = editorConfig.get<number>('tabSize', 2); // Modern default: 2

  if (insertSpaces === false) {
    return '\t';
  }
  return ' '.repeat(tabSize);
}

/**
 * Legacy mode indentation - matches old TypeScript Hero exactly.
 * ALWAYS uses spaces (never tabs), default 4 spaces.
 */
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

/**
 * Get indentation from extension-specific settings only.
 */
private indentationFromExtensionConfig(resource: Uri): string {
  const config = workspace.getConfiguration(sectionKey, resource);
  const insertSpaces = config.get<boolean>('insertSpaces', true);
  const tabSize = config.get<number>('tabSize', 2);

  if (insertSpaces === false) {
    return '\t';
  }
  return ' '.repeat(tabSize);
}
```

### Step 3: Update ImportManager to use config

**File:** `src/imports/import-manager.ts`

Already done! Just ensure it uses the configured `indent` value correctly.

---

## ✅ Success Criteria

### Phase 1: Comparison Tests
- [ ] 10+ new tests in test harness
- [ ] All tests prove legacy mode = old extension
- [ ] All tests prove modern mode ≠ old extension
- [ ] Tests document EditorConfig integration

### Phase 2: Unit Tests
- [ ] 20+ new tests in main extension
- [ ] Complete coverage: legacy, modern, useOnlyExtensionSettings
- [ ] Edge cases covered (1 space, 16 spaces, tabs, etc.)
- [ ] All tests passing

### Phase 3: Implementation
- [ ] Code matches old extension in legacy mode
- [ ] Code provides better UX in modern mode
- [ ] All 329+ tests passing (309 existing + 20 new)
- [ ] Zero regressions

### Final Verification
- [ ] Comparison tests: 180 → 190+ passing
- [ ] Unit tests: 259 → 279+ passing
- [ ] Total: 438 → 469+ passing
- [ ] Documentation updated in CLAUDE.md

---

## 📝 Notes

1. **ActiveEditor limitation:** Cannot easily mock `window.activeTextEditor` in comparison tests. Document as "EditorConfig works via editor.tabSize".

2. **Test environment:** Extension test runs in VS Code with real settings. Use mock configs to control behavior.

3. **Default debate:** Legacy = 4 spaces (match old), Modern = 2 spaces (better for TS/JS). Users can override both.

4. **Tab support:** Old extension never supported tabs. Modern mode does!

5. **Priority chain:**
   - Legacy: `useOnlyExtensionSettings` → `activeEditor.tabSize` → `editor.tabSize` → 4
   - Modern: `useOnlyExtensionSettings` → `editor.tabSize` → 2

---

## 🚀 Execution Order

1. Write comparison tests (Phase 1) - document expected behavior
2. Write unit tests (Phase 2) - comprehensive coverage
3. Implement code (Phase 3) - make tests pass
4. Verify all tests pass
5. Update CLAUDE.md with findings
6. Commit changes
