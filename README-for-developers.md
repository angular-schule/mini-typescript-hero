# Developer Guide

This guide is for developers working on the Mini TypeScript Hero extension.

## Running Unit Tests

### Run Tests
```bash
npm test
```

This will:
1. Compile TypeScript (`npm run compile-tests`)
2. Compile extension code (`npm run compile`)
3. Run linter (`npm run lint`)
4. Execute all tests in VSCode test environment


- Tests run on: Ubuntu, macOS, Windows (via GitHub Actions)
- Main extension tests location: `src/test/`
- Comparison tests location: `comparison-test-harness/test-cases/`

## Manual Testing

### Launch Extension Development Host

1. Open this project in VSCode
2. Press **F5** (or Run → Start Debugging)
3. A new VSCode window opens with the extension loaded
4. Open any TypeScript/JavaScript file
5. Press **Ctrl+Alt+O** (or **Cmd+Alt+O** on macOS) to organize imports

### Manual Test Cases

The `manual-test-cases/` folder contains 10 test scenarios:

#### Case 01: Basic Unused Imports (`case01-basic-unused-imports.ts`)
**Tests:** Basic unused import removal
**Expected:** Remove `unused` and `AnotherUnused`, keep `UsedClass`

#### Case 02: Import Grouping (`case02-import-grouping.ts`)
**Tests:** Import grouping and alphabetical sorting
**Expected:**
- Group 1: Plains (`import 'zone.js'`)
- Group 2: Modules (`@angular/core`, `react`, `rxjs/operators`)
- Group 3: Workspace (`./helpers/...`, `./utils/...`)
- Blank lines between groups
- Alphabetical order within each group

#### Case 03: Type-Only Imports (`case03-type-only-imports.ts`)
**Tests:** Type annotation detection
**Expected:** Keep `Component`, `Observable`, `HttpClient` (used in type annotations), remove `UnusedType`

#### Case 04: Local Shadowing (`case04-local-shadowing.ts`)
**Tests:** Local declarations that shadow imports
**Expected:** Remove `Component` import (local class shadows it), keep `Injectable`

#### Case 05: Re-exports (`case05-re-exports.ts`)
**Tests:** Detection of re-exported symbols
**Expected:** Keep `Foo`, `Bar`, `MyClass` (all re-exported), remove `Unused`

#### Case 06: TypeScript React (`case06-typescript-react.tsx`)
**Tests:** TSX file support
**Expected:** Keep `React`, `useState`, `Button`, `helper`, remove `unused`, `UnusedComponent`

#### Case 07: JavaScript (`case07-javascript.js`)
**Tests:** JavaScript file support
**Expected:** Keep `used`, `UsedClass`, remove `unused`, `AnotherUnused`

#### Case 08: JavaScript React (`case08-javascript-react.jsx`)
**Tests:** JSX file support
**Expected:** Keep `React`, `Button`, `helper`, remove `unused`, `UnusedComponent`

#### Case 09: Modern JavaScript (`case09-modern-javascript.js`)
**Tests:** Modern JavaScript features (arrow functions, destructuring, chaining)
**Expected:** Keep `map`, `filter`, `reduce`, `UsedClass`, remove `unused`, `tap`, `flatMap`

#### Case 10: Configuration Showcase (`case10-config-showcase.ts`)
**Tests:** Various formatting configurations
**Try with different settings:**
- Quote style: `'` vs `"`
- Semicolons: `true` vs `false`
- Spaces in braces: `true` vs `false`
- Multiline threshold: adjust to see multiline formatting
- Trailing comma: `true` vs `false`

### Testing Workflow

1. Open Extension Development Host (F5)
2. Open a test case file from `manual-test-cases/`
3. Press `Ctrl+Alt+O` (or `Cmd+Alt+O`)
4. Verify:
   - ✅ Unused imports are removed
   - ✅ Imports are grouped correctly
   - ✅ Imports are sorted alphabetically
   - ✅ Formatting matches your configuration
   - ✅ No false positives (used imports are kept)

### Configuration Testing

Edit `.vscode/settings.json` or User Settings to test different configurations:

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
    "/^@angular/",    // Custom regex group
    "Modules",
    "Workspace"
  ],

  // Organize on save
  "miniTypescriptHero.imports.organizeOnSave": true
}
```

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript (watch mode)
npm run watch

# Compile TypeScript (production)
npm run compile

# Type checking only
npm run check-types

# Lint code
npm run lint

# Run tests
npm test

# Package extension (.vsix)
vsce package
```

## Project Structure

```
mini-typescript-hero/
├── src/
│   ├── configuration/          # Configuration system
│   │   ├── imports-config.ts   # Import settings
│   │   └── settings-migration.ts  # Migration from old extension
│   ├── imports/                # Import organization logic
│   │   ├── import-grouping/    # Group classification
│   │   ├── import-manager.ts   # Core logic (ts-morph)
│   │   ├── import-organizer.ts # VSCode integration
│   │   ├── import-types.ts     # Import representations
│   │   └── import-utilities.ts # Sorting/precedence
│   ├── test/                   # Unit tests
│   │   ├── configuration/      # Migration tests
│   │   └── imports/            # Import logic tests
│   └── extension.ts            # Extension entry point
├── manual-test-cases/          # Manual testing scenarios
│   ├── case01-*.ts             # Test case files
│   └── helpers/                # Mock modules
├── package.json                # Extension manifest
├── tsconfig.json               # TypeScript config
└── esbuild.js                  # Build configuration
```

## Architecture

### Import Organization Flow

1. **Parse** document with ts-morph (`ImportManager.parseDocument()`)
2. **Extract** all imports (`ImportManager.extractImports()`)
3. **Analyze** usage (`ImportManager.findUsedIdentifiers()`)
   - Scan all identifiers in code
   - Detect local shadowing
   - Handle re-exports
4. **Remove** unused imports (respects `ignoredFromRemoval` config)
5. **Sort** imports (by module or first specifier)
6. **Group** imports (Plains → Modules → Workspace, regex precedence)
7. **Generate** formatted text (`ImportManager.generateImportStatement()`)
8. **Apply** edits via VSCode TextEdit API

### Key Design Decisions

- **ts-morph v27** instead of deprecated `typescript-parser`
- **Direct instantiation** instead of InversifyJS DI container
- **OutputChannel** logging instead of winston
- **esbuild** bundling instead of tsc alone
- **Strict TypeScript** with no `any` types
- **Regex groups processed first** for proper precedence

## Debugging

### Enable Extension Logging

1. Open Output panel in VSCode: `View → Output`
2. Select "Mini TypeScript Hero" from dropdown
3. Logs appear when organizing imports

### VSCode Debugging

1. Set breakpoints in `src/` files
2. Press F5 to launch Extension Development Host
3. Trigger the command (`Ctrl+Alt+O`)
4. Debugger pauses at breakpoints

### Common Issues

**Imports not being removed:**
- Check if import is in `ignoredFromRemoval` config
- Verify the symbol isn't used (including type annotations)
- Check for local shadowing

**Grouping not working:**
- Regex groups are processed before keyword groups
- Check regex pattern syntax (`/pattern/`)
- Verify config in `.vscode/settings.json`

**Tests failing on macOS:**
- Socket path issue: solved with shorter user-data-dir
- See `.github/workflows/test.yml` for macOS config

## Contributing

### Before Submitting PR

1. Run all tests: `npm test` (must pass)
2. Run linter: `npm run lint` (no errors)
3. Test manually with F5
4. Update CHANGELOG.md
5. Add tests for new features

### Test Guidelines

- Add unit tests for new logic
- Add manual test cases for user-facing features
- Ensure tests pass on all platforms (Ubuntu, macOS, Windows)
- Use descriptive test names: "should keep imports used in re-exports"

### Code Style

- Strict TypeScript (no `any` types)
- Clear, descriptive variable names
- Document complex logic with comments
- Follow existing patterns in codebase
