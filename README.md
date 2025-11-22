<div align="center">
  <img src="logo.png" alt="Mini TypeScript Hero Logo" width="200">
</div>

# Mini TypeScript Hero – Small hero. Big cleanup!

**Sorts and organizes TypeScript/JavaScript imports** — A lightweight, modern VSCode extension that automatically manages your import statements.

This extension is a modernized extraction of the "Organize Imports" feature from the original [TypeScript Hero](https://github.com/buehler/typescript-hero) extension, rebuilt with modern best practices.

**📖 Read the full story:** [TypeScript Hero is dead (is yet another VS Code extension gone forever?)](https://angular.schule/blog/2025-10-mini-typescript-hero)

## Features

- ✨ **Sort imports** alphabetically (by module path or first specifier)
- 🧹 **Remove unused imports** automatically
- 🔀 **Merge duplicate imports** from the same module
- 📦 **Custom grouping patterns** with regex (e.g., group all `/@angular/` imports together)
- 💾 **Organize on save** (optional)
- Blank line control between groups (1 line, 2 lines, or preserve existing)
- Formatting control — quotes (`'` vs `"`), semicolons, spaces in braces, trailing commas
- Multi-line wrapping at configurable character threshold
- Remove `/index` from paths (shorten `./lib/index` to `./lib`)
- Import attributes/assertions — Preserves modern syntax like `with { type: 'json' }`
- Works with TypeScript, JavaScript, TSX, and JSX

## Example

**Before** organizing imports:

```typescript
import { UserDetail } from './components/user-detail';
import { Component } from '@angular/core';
import { UnusedService } from './services/unused';
import {Router} from "@angular/router"
import { map, switchMap } from 'rxjs/operators';
import {OnInit, inject} from "@angular/core"
import { BookList } from './components/book-list';


```

**After** pressing `Ctrl+Alt+O` (or `Cmd+Alt+O` on macOS):

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';

```

✨ **What happened:**
- Angular imports merged into one import
- RxJS operators in separate group
- Local imports grouped together with blank line separator
- Unused `UnusedService` removed automatically
- Everything sorted alphabetically
- Consistent quotes and semicolons
- 1 blank line after imports (configurable)

## Configuration Cookbook

**Just want to get started?** Copy-paste a complete configuration for your stack:

### Angular workspace

Good defaults for Angular CLI / Nx Angular projects with `@app/*` aliases and RxJS.

```json
{
  // Style (VS Code TypeScript / JavaScript)
  "typescript.preferences.quoteStyle": "single",
  "typescript.format.semicolons": "insert",
  "javascript.preferences.quoteStyle": "single",
  "javascript.format.semicolons": "insert",

  // Mini TypeScript Hero - core behavior
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,

  // Multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Grouping: Angular first, then app aliases, then other modules, then workspace
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^@angular/",
    "/^@app\\//",
    "Modules",
    "Workspace"
  ]
}
```

**What you get:**
* Angular imports first, then your `@app/*` aliases
* One blank line between imports and code
* `/index` cleaned from local paths
* Imports merged and sorted within groups

---

### React app (React / Next.js / CRA / Vite)

Preset tuned for React projects with Prettier-style double quotes and semicolons.

```json
{
  // Style (match common React + Prettier defaults)
  "typescript.preferences.quoteStyle": "double",
  "typescript.format.semicolons": "insert",
  "javascript.preferences.quoteStyle": "double",
  "javascript.format.semicolons": "insert",

  // Mini TypeScript Hero - core behavior
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,

  // Multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 120,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Grouping: React first, then other modules, then local code
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^react/",
    "Modules",
    "Workspace"
  ]
}
```

**What you get:**
* React ecosystem imports grouped together at the top
* Prettier-compatible formatting
* Automatic merge and cleanup of unused imports

---

### Node backend / library

Preset for Node services and libraries (Express, NestJS, plain TS/JS backends).

```json
{
  // Style (common backend defaults)
  "typescript.preferences.quoteStyle": "single",
  "typescript.format.semicolons": "insert",

  // Mini TypeScript Hero - core behavior
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,

  // Grouping: simple but effective
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "Modules",
    "Workspace"
  ]
}
```

---

### Monorepo (Nx, Turborepo, Yarn/pnpm workspaces)

Preset for monorepos with internal packages under a shared scope like `@myorg/*`.

```json
{
  // Enforce repo-wide style from extension only
  "miniTypescriptHero.imports.useOnlyExtensionSettings": true,

  // Style owned by Mini TS Hero (not by VS Code)
  "miniTypescriptHero.imports.stringQuoteStyle": "'",
  "miniTypescriptHero.imports.insertSemicolons": true,
  "miniTypescriptHero.imports.tabSize": 2,

  // Core behavior
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",

  // Group monorepo packages separately
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^@myorg\\//",
    "Modules",
    "Workspace"
  ]
}
```

**How to adapt:** Replace `@myorg` with your actual scope (e.g., `@acme`).

---

📚 **Need more control?** See the [Configuration Reference](CONFIGURATION.md) for all available settings.

## Quick Start

1. **Install** the extension from the VS Code Marketplace
2. **Choose a preset** from the [Configuration Cookbook](#configuration-cookbook) above
3. **Paste into `.vscode/settings.json`** in your workspace
4. **Open a TypeScript/JavaScript file**
5. **Press `Ctrl+Alt+O`** (or `Cmd+Alt+O` on macOS) to organize imports

That's it! Your imports are now organized.

## Usage

### Available Commands

Access these commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. **Mini TS Hero: Organize imports (sort and remove unused)** — `Ctrl+Alt+O` / `Cmd+Alt+O`
2. **Mini TS Hero: Check for configuration conflicts** — Detect if multiple tools would organize imports
3. **Mini TS Hero: Toggle legacy mode** — Switch between modern and legacy behavior

### Organize on Save

Enable automatic import organization when saving files:

```json
{
  "miniTypescriptHero.imports.organizeOnSave": true
}
```

> **💡 Tip:** If you enable `organizeOnSave`, disable VS Code's built-in `source.organizeImports` to avoid conflicts. Use the "Check for configuration conflicts" command to detect issues.

## Why Use This Instead of VS Code's Built-in?

VS Code has a built-in "Organize Imports" that removes unused imports and sorts alphabetically. Since TypeScript 4.7+, it preserves blank lines you manually add between groups.

**The key difference:** VS Code requires **manual blank lines** for grouping (you type them, VS Code preserves them). Mini TypeScript Hero **automatically creates groups** based on patterns.

### What VS Code Cannot Do

❌ **Automatically create groups based on patterns** — VS Code sorts everything alphabetically unless you manually add blank lines
❌ **Remove `/index` from paths** — Keeps `./foo/index` as-is instead of cleaning to `./foo`
❌ **Sort by first specifier** — Only sorts by module path, not by the first imported name

### Example: Automatic vs Manual Grouping

**Mini TypeScript Hero** with default grouping (`["Modules", "Workspace"]`):

```typescript
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';
```

External imports (node_modules) automatically separated from internal imports (local files) with a blank line.

**VS Code built-in** without manual blank lines:

```typescript
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookList } from './components/book-list';
import { map, switchMap } from 'rxjs/operators';
import { UserDetail } from './components/user-detail';
```

Everything sorted alphabetically as one flat list. To separate them, you'd manually add a blank line and maintain it every time you add imports.

## Migrating from TypeScript Hero

Your settings auto-migrate on first use. Legacy mode enabled automatically for compatibility.

**For migrated users:** `legacyMode: true` matches the old TypeScript Hero output (including some quirks).
**For new users:** `legacyMode: false` gives modern best practices.

📚 **Full migration details:** See [MIGRATION.md](MIGRATION.md)

## Using with Prettier and ESLint

Mini TypeScript Hero focuses on **import organization**. Prettier and ESLint still own formatting and linting. They work together as long as **only one tool sorts imports**.

### Recommended setup: Mini TS Hero + Prettier + ESLint

On save:
1. Mini TS Hero organizes imports
2. ESLint fixes rule violations
3. Prettier formats the final code

```json
{
  "miniTypescriptHero.imports.organizeOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": false  // IMPORTANT: disable VS Code built-in
  }
}
```

**Why disable `source.organizeImports`?** If both Mini TS Hero and VS Code built-in organize imports on save, your imports get rearranged multiple times.

> **Check conflicts automatically:** Run **"Mini TS Hero: Check for configuration conflicts"** from the Command Palette.

### Option A (recommended): Let Mini TS Hero own import order

Turn off import-sorting rules in ESLint:

```js
// .eslintrc.js
module.exports = {
  rules: {
    "sort-imports": "off",
    "import/order": "off",
  }
};
```

Disable Prettier plugins that sort imports:
- `@trivago/prettier-plugin-sort-imports`
- `prettier-plugin-organize-imports`

### Option B: Use Mini TS Hero only for removal

If your team already has ESLint/Prettier import-sorting, use Mini TS Hero mainly for **unused import removal**:

```json
{
  "miniTypescriptHero.imports.disableImportsSorting": true,
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": false
}
```

### Prettier style compatibility

Mini TS Hero respects your VS Code settings by default:
- Quote style from `typescript.preferences.quoteStyle`
- Semicolons from `typescript.format.semicolons`
- Indentation from `editor.tabSize` and `editor.insertSpaces`

To reduce friction with Prettier, match your VS Code settings to your Prettier config. See the [Monorepo preset](#monorepo-nx-turborepo-yarnpnpm-workspaces) for enforcing consistent formatting across the team using `useOnlyExtensionSettings`.

## Debugging & Troubleshooting

### Opening the Output Panel

1. **Open VS Code Output:** `Ctrl+` ` (backtick) or View → Output
2. **Select "Mini TypeScript Hero"** from the channel dropdown

### What Gets Logged

**Startup Events:** Extension activation, settings migration, conflict detection
**Per-File Events:** Each file organized, success/failure of edits
**Configuration Events:** Settings changes, legacy mode toggle

### Example Log Output

```
[ImportOrganizer] Activating
Mini TypeScript Hero: Extension activated successfully
[ImportOrganizer] Organizing imports for /path/to/file.ts
[ImportOrganizer] Imports organized successfully
```

### Manual Test Cases

The repository includes [10 test cases](https://github.com/angular-schule/mini-typescript-hero/tree/master/manual-test-cases) covering various scenarios (unused imports, grouping, type-only imports, JSX/TSX, etc.). Use these to test configurations or create reproducible bug reports.

## Requirements

- VS Code 1.104.0 or higher
- Node.js 18.0.0 or higher (for extension development)

## Privacy

**This extension does not collect any telemetry or user data.** Your code, settings, and usage patterns remain completely private.

## Notes

### Comment Handling

The extension preserves most comments in your import blocks:

**Preserved:**
- Comments above import statements
- Comments at the end of import lines
- Comments between import statements

**Not preserved:**
- Comments inside import braces (e.g., `import { Foo /* comment */ } from './lib'`)

**💡 Best Practice:** Put critical comments above the import statement, not embedded inside the braces.

### Legacy Mode

When `legacyMode: true` (automatically enabled for migrated users), some settings behave differently to maintain compatibility:

- `blankLinesAfterImports` — Preserves existing blank lines (ignores configured value)
- `organizeSortsByFirstSpecifier` — Always sorts by library name (setting has no effect)
- `disableImportsSorting` — Always sorts imports (setting has no effect)

New users get `legacyMode: false` by default. You can toggle this setting anytime via the command palette.

## Credits

This extension is based on the "Organize Imports" feature from [TypeScript Hero](https://github.com/buehler/typescript-hero) by Christoph Bühler. The original TypeScript Hero is no longer maintained, so we've extracted and modernized this valuable feature.

## License

MIT License — Copyright (c) 2025 [Angular.Schule](https://angular.schule) (by Johannes Hoppe)

Original work Copyright (c) Christoph Bühler

## Documentation

- 📖 [Configuration Reference](CONFIGURATION.md) — Complete settings documentation
- 🔄 [Migration Guide](MIGRATION.md) — Migrating from TypeScript Hero
- 🐛 [Report Issues](https://github.com/angular-schule/mini-typescript-hero/issues)
- 💡 [Request Features](https://github.com/angular-schule/mini-typescript-hero/issues)

## Links

- [GitHub Repository](https://github.com/angular-schule/mini-typescript-hero)
- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero)
- [Angular.Schule](https://angular.schule)
