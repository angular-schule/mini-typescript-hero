# Testing Guide for Mini TypeScript Hero

## Manual Testing Instructions

### 1. Open Extension in Development Mode

1. Open the `mini-typescript-hero` folder in VSCode
2. Press `F5` to launch the Extension Development Host
3. A new VSCode window will open with the extension loaded

### 2. Test Basic Functionality

1. In the Extension Development Host window, open `test-files/sample.ts`
2. Press `Ctrl+Alt+O` (Windows/Linux) or `Cmd+Alt+O` (macOS)
3. **Expected result**:
   - Unused imports (`UnusedImport`, `AnotherUnused`) should be removed
   - Imports should be sorted and grouped:
     - String import (`zone.js`) first
     - Module imports (`@angular/core`, `react`, `rxjs/operators`) second
     - Workspace imports (`./used-class`) last
   - Blank lines between groups

**Expected output:**
```typescript
import 'zone.js';

import { Component, OnInit } from '@angular/core';
import * as React from 'react';
import { filter, map } from 'rxjs/operators';

import { UsedClass } from './used-class';
```

### 3. Test Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type "Mini TS Hero"
3. **Expected result**: Command "Mini TS Hero: Organize imports" appears
4. Select it and verify imports are organized

### 4. Test Organize on Save

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "mini typescript hero"
3. Enable "Organize On Save"
4. Make a change to `test-files/sample.ts` and save
5. **Expected result**: Imports are automatically organized on save

### 5. Test Configuration Options

#### Test Quote Style
1. Settings → "String Quote Style" → Change to `"`
2. Organize imports
3. **Expected result**: Double quotes in import statements

#### Test Semicolons
1. Settings → "Insert Semicolons" → Uncheck
2. Organize imports
3. **Expected result**: No semicolons at end of imports

#### Test Space in Braces
1. Settings → "Insert Space Before And After Import Braces" → Uncheck
2. Organize imports
3. **Expected result**: `{foo}` instead of `{ foo }`

### 6. Test Import Grouping

#### Test Custom Order
1. Settings → "Grouping" → Set to:
   ```json
   ["Modules", "Plains", "Workspace"]
   ```
2. Organize imports
3. **Expected result**: Module imports first, then Plains, then Workspace

#### Test Regex Groups
1. Settings → "Grouping" → Set to:
   ```json
   ["Plains", "/^@angular/", "/^rxjs/", "Modules", "Workspace"]
   ```
2. **Expected result**: Angular imports grouped separately, rxjs imports separately

### 7. Test Edge Cases

**CRITICAL**: These edge cases test the reference tracking implementation (Approach 1).
Open each file in `test-files/edge-case-*.ts` and verify the behavior.

#### Edge Case 1: Local Shadowing (`edge-case-local-shadowing.ts`)
**Scenario**: Import `Component` but also declare `class Component` locally
1. Open file, run organize imports
2. **Expected result**:
   - `Component` import should be REMOVED (shadowed by local declaration)
   - `Injectable` import should be KEPT (used in decorator)

#### Edge Case 2: Type-Only Usage (`edge-case-type-only.ts`)
**Scenario**: Imports used only in type annotations
1. Open file, run organize imports
2. **Expected result**: ALL imports KEPT (type annotations count as usage)

#### Edge Case 3: Partial Usage (`edge-case-partial-usage.ts`)
**Scenario**: Some symbols used, some unused from same import
1. Open file, run organize imports
2. **Expected result**:
   - From `@angular/core`: Keep only `Component, OnInit` (sorted alphabetically)
   - From `rxjs/operators`: Keep only `filter, map` (sorted alphabetically)

#### Edge Case 4: Aliased Imports (`edge-case-aliased-imports.ts`)
**Scenario**: Imports with `as` aliases
1. Open file, run organize imports
2. **Expected result**:
   - Keep `Component as AngularComponent` (used by alias)
   - Remove `Injectable as Inject` and `Observable as Obs` (unused)

#### Edge Case 5: Namespace Imports (`edge-case-namespace-usage.ts`)
**Scenario**: `import * as Name` style imports
1. Open file, run organize imports
2. **Expected result**:
   - Keep `React` and `RxJS` (used)
   - Remove `Lodash` (unused)

#### Edge Case 6: Default Imports (`edge-case-default-import.ts`)
**Scenario**: Default import style
1. Open file, run organize imports
2. **Expected result**:
   - Keep `React` (used)
   - Remove `Vue` and `Angular` (unused)

#### Edge Case 7: Mixed Default + Named (`edge-case-mixed-import.ts`)
**Scenario**: `import Default, { named } from 'lib'` style
1. Open file, run organize imports
2. **Expected result**:
   - From `react`: Keep `React, { useState }` (both used)
   - From `vue`: Keep only `{ ref }` (Vue default removed)

#### Empty File
1. Create new TypeScript file with no imports
2. Run organize imports
3. **Expected result**: No errors, no changes

#### Only String Imports
1. Create file with only `import 'reflect-metadata'`
2. Run organize imports
3. **Expected result**: No errors, import remains

#### All Unused
1. Create file with imports but no usage
2. Run organize imports
3. **Expected result**: All imports removed (except ignored ones)

### 8. Test Language Support

Test with:
- `.ts` files ✓
- `.tsx` files
- `.js` files
- `.jsx` files

### 9. Check Output Channel

1. View → Output → Select "Mini TypeScript Hero"
2. **Expected result**: Logging messages show extension activity

## Automated Testing (Future Enhancement)

For now, manual testing is sufficient. Future versions could add:
- Unit tests for import grouping logic
- Integration tests using `@vscode/test-electron`
- End-to-end tests with sample projects

## Debugging

If the extension doesn't work:

1. **Check Output Channel**: Look for error messages
2. **Check Developer Tools**: Help → Toggle Developer Tools → Console
3. **Rebuild**: Run `npm run compile` in terminal
4. **Restart**: Close Extension Development Host and press F5 again

## Common Issues

### Extension Not Activating
- Check that file language is TypeScript/JavaScript
- Verify extension is loaded (bottom-left status bar)

### Imports Not Organizing
- Check Output Channel for errors
- Verify file has valid TypeScript/JavaScript syntax
- Try simpler test case

### Configuration Not Working
- Reload window after changing settings
- Check settings scope (User vs. Workspace)

## Success Criteria Checklist

✅ Extension loads without errors
✅ Command appears in Command Palette
✅ Keybinding works (Ctrl+Alt+O)
✅ Organize imports works on TypeScript file
✅ Organize imports works on JavaScript file
✅ Organize imports works on TSX file
✅ Organize imports works on JSX file
✅ Unused imports are removed
✅ Imports are sorted correctly
✅ Import grouping works (Plains → Modules → Workspace)
✅ Custom regex groups work
✅ Quote style configuration works
✅ Semicolon configuration works
✅ Space in braces configuration works
✅ Multiline threshold works
✅ Trailing comma configuration works
✅ Remove trailing /index works
✅ Ignored imports are not removed
✅ Organize on save works when enabled
✅ Organize on save respects when disabled
✅ Configuration changes apply immediately
✅ Works in multi-root workspace

### NEW: Edge Cases (CRITICAL - Reference Tracking Implementation)
These tests verify the fix for local vs. non-local usage detection:

- [ ] Edge Case 1: Local shadowing handled correctly
- [ ] Edge Case 2: Type-only imports kept
- [ ] Edge Case 3: Partial usage from same import
- [ ] Edge Case 4: Aliased imports (with `as`)
- [ ] Edge Case 5: Namespace imports (`import * as`)
- [ ] Edge Case 6: Default imports
- [ ] Edge Case 7: Mixed default + named imports
