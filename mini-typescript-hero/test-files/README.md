# Manual Test Files

These files are for manual testing of the Mini TypeScript Hero extension. Each file demonstrates a specific feature or edge case.

## How to Test

1. Open VSCode in the Extension Development Host (press F5)
2. Open any test case file from this folder
3. Press `Ctrl+Alt+O` (or `Cmd+Alt+O` on macOS) to organize imports
4. Observe the changes and verify they match the expected behavior

## Test Cases

### Case 01: Basic Unused Imports (`case01-basic-unused-imports.ts`)
**Tests:** Basic unused import removal
**Expected:** Remove `unused` and `AnotherUnused`, keep `UsedClass`

### Case 02: Import Grouping (`case02-import-grouping.ts`)
**Tests:** Import grouping and alphabetical sorting
**Expected:**
- Group 1: Plains (`import 'zone.js'`)
- Group 2: Modules (`@angular/core`, `react`, `rxjs/operators`)
- Group 3: Workspace (`./helpers/...`, `../utils/...`)
- Blank lines between groups
- Alphabetical order within each group

### Case 03: Type-Only Imports (`case03-type-only-imports.ts`)
**Tests:** Type annotation detection
**Expected:** Keep `Component`, `Observable`, `HttpClient` (used in type annotations), remove `UnusedType`

### Case 04: Local Shadowing (`case04-local-shadowing.ts`)
**Tests:** Local declarations that shadow imports
**Expected:** Remove `Component` import (local class shadows it), keep `Injectable`

### Case 05: Re-exports (`case05-re-exports.ts`)
**Tests:** Detection of re-exported symbols
**Expected:** Keep `Foo`, `Bar`, `MyClass` (all re-exported), remove `Unused`

### Case 06: TypeScript React (`case06-typescript-react.tsx`)
**Tests:** TSX file support
**Expected:** Keep `React`, `useState`, `Button`, `helper`, remove `unused`, `UnusedComponent`

### Case 07: JavaScript (`case07-javascript.js`)
**Tests:** JavaScript file support
**Expected:** Keep `used`, `UsedClass`, remove `unused`, `AnotherUnused`

### Case 08: JavaScript React (`case08-javascript-react.jsx`)
**Tests:** JSX file support
**Expected:** Keep `React`, `Button`, `helper`, remove `unused`, `UnusedComponent`

### Case 09: Modern JavaScript (`case09-modern-javascript.js`)
**Tests:** Modern JavaScript features (arrow functions, destructuring, chaining)
**Expected:** Keep `map`, `filter`, `reduce`, `UsedClass`, remove `unused`, `tap`, `flatMap`

### Case 10: Configuration Showcase (`case10-config-showcase.ts`)
**Tests:** Various formatting configurations
**Try with different settings:**
- Quote style: `'` vs `"`
- Semicolons: `true` vs `false`
- Spaces in braces: `true` vs `false`
- Multiline threshold: adjust to see multiline formatting
- Trailing comma: `true` vs `false`

## Configuration Tips

Edit your VSCode settings to test different configurations:

```json
{
  // Quote style
  "miniTypescriptHero.imports.stringQuoteStyle": "'",  // or "\""

  // Semicolons
  "miniTypescriptHero.imports.insertSemicolons": true,

  // Spaces in braces
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,

  // Multiline wrapping
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Import grouping
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "Modules",
    "Workspace"
  ]
}
```

## Expected Workflow

1. Open a test case file (it will have messy, unorganized imports)
2. Run "Organize imports" command (`Ctrl+Alt+O`)
3. Verify:
   - ✅ Unused imports are removed
   - ✅ Imports are grouped correctly
   - ✅ Imports are sorted alphabetically
   - ✅ Formatting matches your configuration
   - ✅ No false positives (used imports are kept)

## Helper Files

The `helpers/` directory contains mock modules that the test cases import from. These are simple placeholder files that allow the extension to parse the imports correctly.
