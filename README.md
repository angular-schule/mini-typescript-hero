<div align="center">
  <img src="logo.png" alt="Mini TypeScript Hero Logo" width="200">
</div>

# Mini TypeScript Hero – Small hero. Big cleanup!

**Sorts and organizes TypeScript/JavaScript imports** — A lightweight, modern VSCode extension that automatically manages your import statements.

This extension is a modernized extraction of the "Organize Imports" feature from the original [TypeScript Hero](https://github.com/buehler/typescript-hero) extension, rebuilt with modern best practices.

**Read the full story:** [TypeScript Hero is dead (is yet another VS Code extension gone forever?)](https://angular.schule/blog/2025-10-mini-typescript-hero)

## Features

- **Sort imports** alphabetically (by module path or first specifier)
- **Remove unused imports** automatically
- **Merge duplicate imports** from the same module
- **Organize workspace** - Process all files in workspace or selected folder
- **Exclude patterns** - Skip auto-generated files using glob patterns (team collaboration feature)
- **Custom grouping patterns** with regex (e.g., group all `/@angular/` imports together)
- **Organize on save** (optional)
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

**What happened:**
- Angular imports merged into one import
- RxJS operators in separate group
- Local imports grouped together with blank line separator
- Unused `UnusedService` removed automatically
- Everything sorted alphabetically
- Consistent quotes and semicolons
- 1 blank line after imports (configurable)

## Quick Start

**The defaults are already great!** Just install and you're ready to go:

1. **Install** the extension from the VS Code Marketplace
2. **Open a TypeScript/JavaScript file**
3. **Press `Ctrl+Alt+O`** (or `Cmd+Alt+O` on macOS) to organize imports

That's it! Your imports are now organized.

**Want to customize?** See the [Configuration Cookbook](README-configuration.md#full-configuration-cookbook) for ready-to-use presets (Angular, React, Node, Monorepo).

## Usage

### Available Commands

Access these commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. **Mini TS Hero: Organize imports (sort and remove unused)** — `Ctrl+Alt+O` / `Cmd+Alt+O`
   - Organizes imports in the current file
2. **Mini TS Hero: Organize imports in workspace** — Process all TypeScript/JavaScript files in your workspace
3. **Mini TS Hero: Organize imports in folder** — Right-click any folder in the Explorer to organize all files within
4. **Mini TS Hero: Check for configuration conflicts** — Detect if multiple tools would organize imports
5. **Mini TS Hero: Toggle legacy mode** — Switch between modern and legacy behavior

> **Tip:** Workspace and folder commands automatically skip build artifacts (`node_modules`, `dist`, `build`, etc.). You can add custom exclude patterns for auto-generated files — see [excludePatterns configuration](README-configuration.md#exclude-patterns-team-collaboration).

### Organize on Save

Enable automatic import organization when saving files:

```json
{
  "miniTypescriptHero.imports.organizeOnSave": true
}
```

> **Tip:** If you enable `organizeOnSave`, disable VS Code's built-in `source.organizeImports` to avoid conflicts. Use the "Check for configuration conflicts" command to detect issues.

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

- **For migrated users:** `legacyMode: true` matches the old TypeScript Hero output (including some quirks).
- **For new users:** `legacyMode: false` gives modern best practices.

**Full migration details:** See [Migration Guide](README-migration.md)

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

To reduce friction with Prettier, match your VS Code settings to your Prettier config. For team projects, see the [Monorepo preset](README-configuration.md#monorepo-complete) which shows how to use `useOnlyExtensionSettings` to enforce consistent formatting.

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

**Best Practice:** Put critical comments above the import statement, not embedded inside the braces.

### Legacy Mode

Legacy mode (`legacyMode: true`) is automatically enabled for users migrating from the original TypeScript Hero extension. In this mode, some settings behave differently to maintain output compatibility:

- `blankLinesAfterImports` — Preserves existing blank lines (ignores configured value)
- `organizeSortsByFirstSpecifier` — Always sorts by library name (setting has no effect)
- `disableImportsSorting` — Always sorts imports (setting has no effect)

New users get `legacyMode: false` by default. You can toggle this setting anytime via the command palette.

## Credits

This extension is based on the "Organize Imports" feature from [TypeScript Hero](https://github.com/buehler/typescript-hero) by Christoph Bühler. The original TypeScript Hero is no longer maintained, so we've extracted and modernized this valuable feature.

## License

MIT License — Copyright (c) 2025-2026 [Angular.Schule](https://angular.schule) (by Johannes Hoppe)

Original work Copyright (c) Christoph Bühler

## Documentation

- [Configuration Reference](README-configuration.md) — Complete settings documentation
- [Migration Guide](README-migration.md) — Migrating from TypeScript Hero
- [Contributing](CONTRIBUTING.md) — Development setup and debugging
- [Report Issues](https://github.com/angular-schule/mini-typescript-hero/issues)
- [Request Features](https://github.com/angular-schule/mini-typescript-hero/issues)

## Links

- [GitHub Repository](https://github.com/angular-schule/mini-typescript-hero)
- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero)
- [Angular.Schule](https://angular.schule)
