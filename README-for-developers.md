# Developer Guide

This guide is for developers working on the Mini TypeScript Hero extension.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/angular-schule/mini-typescript-hero.git
cd mini-typescript-hero

# Install dependencies
npm install

# Compile and watch for changes
npm run watch

# Run tests
npm test
```

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

**Note:** These are integration tests that run in a real VS Code environment with the full TypeScript/JavaScript language server. Tests use real file I/O (temp files in `os.tmpdir()`), real VS Code APIs (`workspace.openTextDocument`, `workspace.applyEdit`), and real ts-morph parsing. This makes them slower than unit tests but ensures accurate testing of the actual user experience.

- Tests run on: Ubuntu, macOS, Windows (via GitHub Actions)
- Main extension tests location: `tests/unit/`
- Comparison tests location: `tests/comparison/test-cases/`

## Manual Testing

### Launch Extension Development Host

1. Open this project in VSCode
2. Press **F5** (or Run → Start Debugging)
3. A new VSCode window opens with the extension loaded
4. Open any TypeScript/JavaScript file
5. Press **Ctrl+Alt+O** (or **Cmd+Alt+O** on macOS) to organize imports

### Manual Test Cases

The `tests/manual/` folder contains 10 test scenarios:

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
2. Open a test case file from `tests/manual/`
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
│   ├── configuration/              # Configuration system
│   │   ├── imports-config.ts       # Import settings
│   │   ├── settings-migration.ts   # Migration from old extension
│   │   └── conflict-detector.ts    # Detects conflicts with Prettier/ESLint
│   ├── imports/                    # Import organization logic
│   │   ├── import-grouping/        # Group classification
│   │   ├── import-manager.ts       # Core logic (ts-morph, pipeline dispatch)
│   │   ├── import-organizer.ts     # VSCode integration
│   │   ├── import-types.ts         # Import representations
│   │   ├── import-utilities.ts     # Sorting/precedence
│   │   ├── organize-pipeline.ts    # Pipeline type definitions
│   │   ├── pipeline-shared.ts      # Shared pipeline functions (filter, merge, sort)
│   │   ├── pipeline-modern.ts      # Modern mode orchestrator
│   │   └── pipeline-legacy.ts      # Legacy mode orchestrator
│   ├── commands/
│   │   └── batch-organizer.ts      # Workspace/folder batch operations
│   └── extension.ts                # Extension entry point
├── tests/
│   ├── unit/                   # Main extension tests
│   ├── comparison/             # Old vs new extension comparison
│   ├── manual/                 # Manual testing scenarios
│   │   ├── case01-*.ts         # Test case files
│   │   └── helpers/            # Mock modules
│   └── workspaces/             # Pre-configured test workspaces
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
4. **Dispatch** to pipeline based on mode:
   - **Modern** (`pipeline-modern.ts`): filter → sort → removeTrailingIndex → merge
   - **Legacy** (`pipeline-legacy.ts`): filter (strip type flags) → sort → merge → removeTrailingIndex
   - Both pipelines call shared functions from `pipeline-shared.ts` with different option flags
5. **Group** imports (Plains → Modules → Workspace, regex precedence)
6. **Generate** formatted text (`ImportManager.generateImportStatement()`)
7. **Apply** edits via VSCode TextEdit API

### Key Design Decisions

- **ts-morph** instead of deprecated `typescript-parser`
- **Direct instantiation** instead of InversifyJS DI container
- **OutputChannel** logging instead of winston
- **esbuild** bundling instead of tsc alone
- **Extension runtime code in `src/`** uses strict TypeScript and avoids `any`. Test and demo files may use `any` when it improves readability or mirrors legacy behavior.
- **Regex groups processed first** for proper precedence

### TypeScript Configuration

- **Extension runtime** (`src/`): Compiled with `strict: true`, `noUnusedLocals: true`
- **Comparison tests** (`tests/comparison/`): Uses relaxed `tsconfig.json` with `strict: false` so we can compile the original TypeScript Hero code without rewriting it
- **Manual test cases**: Simple demonstration files, may use `any` for clarity

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

- Extension runtime code in `src/` uses strict TypeScript and avoids `any`. Test and demo files may use `any` when it improves readability or mirrors legacy behavior.
- Clear, descriptive variable names
- Document complex logic with comments
- Follow existing patterns in codebase
