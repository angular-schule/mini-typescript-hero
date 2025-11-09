<div align="center">
  <img src="logo.png" alt="Mini TypeScript Hero Logo" width="200">
</div>

# Mini TypeScript Hero

**Sorts and organizes TypeScript/JavaScript imports** — A lightweight, modern VSCode extension that automatically manages your import statements.

This extension is a modernized extraction of the "Organize Imports" feature from the original [TypeScript Hero](https://github.com/buehler/typescript-hero) extension, rebuilt with 2025 best practices.

**📖 Read the full story:** [TypeScript Hero is dead (is yet another VS Code extension gone forever?)](https://angular.schule/blog/2025-10-mini-typescript-hero)

## Features

- ✨ **Sort imports** alphabetically (by module path or first specifier)
- 🧹 **Remove unused imports** automatically
- 🔀 **Merge duplicate imports** from the same module (e.g., `import { A, B } from './lib'`)
- 📦 **Custom grouping patterns** with regex (e.g., group all `/@angular/` imports together)
- 📏 **Blank line control** between groups (1 line, 2 lines, or preserve existing)
- ⚙️ **Formatting control** — quotes (`'` vs `"`), semicolons, spaces in braces, trailing commas
- 🎯 **Multi-line wrapping** at configurable character threshold
- 🗂️ **Remove `/index`** from paths (shorten `./lib/index` to `./lib`)
- 💾 **Organize on save** (optional)
- 🌍 **Works with TypeScript, JavaScript, TSX, and JSX**

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
- Exactly 1 blank line after imports (configurable)

## Why Use This Instead of VS Code's Built-in?

**VS Code has a built-in "Organize Imports"** ([docs](https://code.visualstudio.com/docs/typescript/typescript-refactoring#_organize-imports)) that removes unused imports, sorts alphabetically, and merges duplicate imports. Since TypeScript 4.7+, it preserves blank lines you manually add between import groups. However, the fundamental difference is in **how groups are created**: VS Code requires you to manually type blank lines to separate groups (manual maintenance), while Mini TypeScript Hero automatically separates external (node_modules) from internal (local files) imports with blank lines between them. This alone covers 90% of use cases. Optionally, you can configure additional patterns like `["/^@angular/", "/rxjs/", "Workspace"]` if you want specific libraries (e.g., all RxJS imports) grouped together separately.

### What is a "Group"?

**VS Code's approach:** You manually type blank lines between imports to create groups. VS Code then preserves those blank lines and sorts within each group. If you delete a blank line, imports merge into one group.

**Mini TypeScript Hero's approach:** The extension automatically groups imports by external (node_modules) vs internal (local files), creating blank lines between them. Optionally, you can add more specific patterns (e.g., `/^@angular/`, `/rxjs/`) if you want framework imports or specific libraries grouped separately.

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

External imports (node_modules) automatically separated from internal imports (local files) with a blank line between them.

**VS Code built-in** without manual blank lines:

```typescript
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookList } from './components/book-list';
import { map, switchMap } from 'rxjs/operators';
import { UserDetail } from './components/user-detail';
```

VS Code sorts everything alphabetically as one flat list. External and internal imports mixed together. To separate them, you'd need to manually type a blank line between `rxjs/operators` and `./components/book-list` and maintain it yourself every time you add new imports.

## Usage

### Available Commands

Access these commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. **Mini TS Hero: Organize imports** — Sort and remove unused imports
   - Keyboard shortcut: `Ctrl+Alt+O` (`Cmd+Alt+O` on macOS)
2. **Mini TS Hero: Check for configuration conflicts** — Detect if multiple tools would organize imports
3. **Mini TS Hero: Toggle legacy mode** — Switch between modern and legacy behavior

### Organize Imports

**Command Palette:**
1. Open a TypeScript or JavaScript file
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type "Mini TS Hero: Organize imports"
4. Press Enter

**Keyboard Shortcut:**
Press `Ctrl+Alt+O` (Windows/Linux) or `Cmd+Alt+O` (macOS)

**Organize on Save:**
Enable automatic import organization on file save:

```json
{
  "miniTypescriptHero.imports.organizeOnSave": true
}
```

### Check for Conflicts

If you have multiple import organizers enabled (VSCode built-in, old TypeScript Hero extension, etc.), you may see a warning on first activation. You can also manually check for conflicts:

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Mini TS Hero: Check for configuration conflicts"
3. The extension will show if any conflicts exist and offer to fix them automatically (where possible)

### Toggle Legacy Mode

Switch between modern best practices and original TypeScript Hero behavior:

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "Mini TS Hero: Toggle legacy mode"
3. The current value will be toggled and saved to the appropriate settings scope

## Migrating from TypeScript Hero

**Good news!** If you're upgrading from the original TypeScript Hero extension, your settings will be automatically migrated on first startup.

### What Gets Migrated

All import-related settings from `typescriptHero.imports.*` are automatically copied to `miniTypescriptHero.imports.*`:

- ✅ All formatting settings (quotes, semicolons, spaces, etc.)
- ✅ Organize on save preference
- ✅ Sorting and removal settings
- ✅ Ignored libraries configuration
- ✅ Custom import grouping rules

### Migration Behavior

- **Runs once:** Migration happens automatically the first time you activate Mini TypeScript Hero
- **Preserves all levels:** User, workspace, and workspace folder settings are all migrated
- **Safe:** Your original TypeScript Hero settings remain untouched
- **Notification:** You'll see a message confirming how many settings were migrated

### After Migration

Once your settings are migrated, you have two options:

1. **Keep both extensions:** Both extensions can coexist, but you may want to disable one to avoid conflicts
2. **Uninstall TypeScript Hero:** If you only need the import organization feature, you can safely uninstall the original extension

If the old TypeScript Hero extension is still active, you'll see a reminder in the migration notification suggesting you can disable it.

**Legacy Mode:** For migrated users, `legacyMode` is automatically set to `true` to match the original TypeScript Hero behavior exactly. When enabled, legacy mode overrides certain settings to ensure 100% backward compatibility:

- **`blankLinesAfterImports`** — Always preserves existing blank lines (ignores configured value)
- **`organizeSortsByFirstSpecifier`** — Disabled (always sorts by library name)
- **`disableImportsSorting`** — Disabled (always sorts within groups)
- **Merge timing** — Merges BEFORE removeTrailingIndex (replicates old bug)
- **Type-only imports** — Strips `import type` keywords (old TS <3.8 behavior)

New users get `legacyMode: false` by default for modern best practices. You can toggle this setting anytime via the command palette or your configuration.

### No Old Settings?

If you've never used TypeScript Hero before, the migration simply won't run — no action needed!

## Configuration

### 🎯 Configuration Priority (Smart Defaults)

**Mini TypeScript Hero respects your existing editor configuration!** Instead of requiring duplicate configuration, the extension follows this priority order:

1. **`.editorconfig`** (highest priority - team standard)
   - Only if the [EditorConfig extension](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) is installed
   - Respects `quote_type = single` or `quote_type = double`

2. **VSCode TypeScript/JavaScript preferences** (middle priority - user/workspace settings)
   - `typescript.preferences.quoteStyle` - Quote style for TypeScript files
   - `typescript.format.semicolons` - Semicolon behavior
   - `javascript.preferences.quoteStyle` - Quote style for JavaScript files
   - `javascript.format.semicolons` - Semicolon behavior

3. **`miniTypescriptHero.imports.*` settings** (lowest priority - fallback only)
   - Used when `.editorconfig` and VSCode preferences are not configured

**Why this order?** It matches how other formatters (Prettier, ESLint) work, preventing configuration conflicts and ensuring consistency across your entire project.

#### Example Scenarios

**Scenario 1: Using `.editorconfig` (recommended for teams)**
```ini
# .editorconfig
[*.ts]
quote_type = single
```

Result: **Single quotes** (from `.editorconfig`, even if VSCode or extension settings say double quotes)

**Scenario 2: Using VSCode settings (no `.editorconfig`)**
```json
{
  "typescript.preferences.quoteStyle": "double",
  "miniTypescriptHero.imports.stringQuoteStyle": "'"
}
```

Result: **Double quotes** (from VSCode preferences, extension setting is ignored)

**Scenario 3: Fallback to extension settings (nothing else configured)**
```json
{
  "miniTypescriptHero.imports.stringQuoteStyle": "'",
  "miniTypescriptHero.imports.insertSemicolons": false
}
```

Result: **Single quotes, no semicolons** (from extension settings)

💡 **Tip**: For team projects, use `.editorconfig` to enforce standards. For personal projects, use VSCode settings. The extension's settings are there as convenient fallbacks.

### Basic Settings

```json
{
  // Automatically organize imports when saving a file
  "miniTypescriptHero.imports.organizeOnSave": false,

  // Blank lines after imports: "one" (default), "two", or "preserve"
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",

  // Quote style (fallback - respects .editorconfig and VSCode preferences first)
  // Use single quotes (') or double quotes (")
  "miniTypescriptHero.imports.stringQuoteStyle": "'",

  // Semicolons (fallback - respects VSCode typescript.format.semicolons first)
  // Add semicolons at the end of import statements
  "miniTypescriptHero.imports.insertSemicolons": true,

  // Add spaces inside import braces: { foo } vs {foo}
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,

  // Remove trailing /index from import paths
  "miniTypescriptHero.imports.removeTrailingIndex": true
}
```

#### Blank Line Modes

Control spacing after imports with `blankLinesAfterImports`:

- **`"one"`** (default) — Always exactly 1 blank line (ESLint standard) **RECOMMENDED**
- **`"two"`** — Always exactly 2 blank lines (for teams preferring more visual separation)
- **`"preserve"`** — Keep existing blank lines (0, 1, 2, 3+) as they are

**Note:** This setting is ignored when `legacyMode: true` (which is automatically set for migrated users). Legacy mode preserves blank lines to match original TypeScript Hero behavior.

📖 **Detailed documentation:** [README-how-we-handle-blank-lines.md](README-how-we-handle-blank-lines.md)

### Multiline Import Indentation

Mini TypeScript Hero respects your editor's indentation settings for multiline imports:

```json
{
  // Modern mode (default): Respects VS Code editor.tabSize and editor.insertSpaces
  // Default: 2 spaces (if no explicit tabSize configured)
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // Legacy mode: Always uses spaces, default 4 (matches old TypeScript Hero)
  // Reads editor.tabSize automatically
  "miniTypescriptHero.imports.legacyMode": false
}
```

**Default Indentation Behavior:**

- **Modern mode** (`legacyMode: false`):
  - Default: **2 spaces** (common TypeScript/JavaScript convention)
  - Supports both spaces and tabs via `editor.insertSpaces`
  - Respects `editor.tabSize` if explicitly configured
  - Example: `import {\n  Foo,\n  Bar\n} from './lib';`

- **Legacy mode** (`legacyMode: true`):
  - Reads VS Code's resolved editor settings (usually **2 spaces** for TypeScript)
  - Falls back to **4 spaces** when no editor context is available
  - Always uses spaces (never tabs)
  - Matches old TypeScript Hero behavior exactly

**Note:** VS Code automatically applies `.editorconfig` settings to `editor.tabSize` and `editor.insertSpaces`. The extension reads these resolved values, so EditorConfig integration works automatically.

### Advanced Settings

```json
{
  // Disable sorting (keep original order)
  "miniTypescriptHero.imports.disableImportsSorting": false,

  // Disable removal of unused imports
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,

  // Merge imports from same module (e.g., two '@angular/core' imports become one)
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,

  // Sort by first imported name instead of module path
  "miniTypescriptHero.imports.organizeSortsByFirstSpecifier": false,

  // Libraries that should never be removed (even if unused)
  // Uses exact string matching - no wildcards or sub-paths
  // Example: "react" matches "react" but NOT "react-dom" or "react/jsx-runtime"
  "miniTypescriptHero.imports.ignoredFromRemoval": ["react"],

  // Character threshold for multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,

  // Add trailing comma in multiline imports
  "miniTypescriptHero.imports.multiLineTrailingComma": true
}
```

#### Import Merging vs. Import Removal

**`mergeImportsFromSameModule`** (default: `true`) combines multiple import statements from the same module into a single statement:

```typescript
// Before (mergeImportsFromSameModule: false):
import { Component } from '@angular/core';
import { OnInit } from '@angular/core';

// After (mergeImportsFromSameModule: true):
import { Component, OnInit } from '@angular/core';
```

**`disableImportRemovalOnOrganize`** controls whether unused imports/specifiers are deleted:

```typescript
// Code file only uses 'Component', not 'OnInit'
import { Component, OnInit } from '@angular/core';

// With disableImportRemovalOnOrganize: false (default):
import { Component } from '@angular/core';  // OnInit removed

// With disableImportRemovalOnOrganize: true:
import { Component, OnInit } from '@angular/core';  // OnInit kept
```

**These settings are independent:**
- You can merge imports while keeping unused ones
- You can disable merging while removing unused ones
- New users get merging enabled (modern best practice)
- Migrated users preserve their original behavior

### Import Grouping

Group your imports into logical sections with blank lines between groups:

```json
{
  "miniTypescriptHero.imports.grouping": [
    "Plains",      // import 'side-effects';
    "Modules",     // import { foo } from 'library';
    "Workspace"    // import { bar } from './local';
  ]
}
```

#### Grouping Keywords

- **`Plains`** — String-only imports (e.g., `import 'reflect-metadata'`)
- **`Modules`** — External library imports (e.g., `import { Component } from '@angular/core'`)
- **`Workspace`** — Relative imports (e.g., `import { foo } from './utils'`)
- **`Remaining`** — Catch-all for imports not matched by other groups

#### Custom Regex Groups

**What are regex groups?** Custom import categories based on pattern matching. They let you organize imports by library name patterns.

**How do they work?** The extension tests each import's module path against your regex pattern. If it matches, the import goes into that group.

**Pattern format:** Wrap your regex in slashes: `/pattern/`

**Common patterns:**
- `/^@angular/` — Matches any import starting with `@angular` (e.g., `@angular/core`, `@angular/common`)
- `/^@app/` — Matches path aliases starting with `@app`
- `/rxjs/` — Matches any import containing `rxjs` anywhere in the path
- `/^react/` — Matches React and React-related packages
- `/(^lodash|^ramda)/` — Matches either lodash OR ramda

**Example configuration:**

```json
{
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^@angular/",    // Angular imports first
    "/^@app/",        // App-specific aliases
    "Modules",        // Other node_modules
    "Workspace"
  ]
}
```

**Result with this config:**

```typescript
// Group 1: Plains (string imports)
import 'zone.js';

// Group 2: /^@angular/ (Angular packages)
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Group 3: /^@app/ (app aliases)
import { AppConfig } from '@app/config';
import { UserService } from '@app/services';

// Group 4: Modules (everything else from node_modules)
import { Observable } from 'rxjs';
import * as React from 'react';
import * as _ from 'lodash';

// Group 5: Workspace (local files)
import { MyComponent } from './components';
import { helper } from '../utils';
```

**Why use regex groups?**
- Separate framework imports from your code (e.g., all Angular imports together)
- Group monorepo packages (e.g., `/@mycompany/`)
- Organize related libraries (e.g., all testing libraries with `/jest|vitest|mocha/`)
- Organize TypeScript path aliases separately from other modules

**Order matters!** Regex groups are processed **before** keyword groups, so they can "capture" imports before the broader `Modules` group matches everything.

#### Custom Sort Order

Control ascending or descending sort per group:

```json
{
  "miniTypescriptHero.imports.grouping": [
    { "identifier": "Plains", "order": "asc" },
    { "identifier": "Modules", "order": "desc" },
    "Workspace"
  ]
}
```

## Requirements

- VS Code 1.104.0 or higher
- Node.js 18.0.0 or higher (for extension development)

### Activation

The extension activates when:
- You open a TypeScript/JavaScript/TSX/JSX file (`onLanguage`)
- You run any command from the palette (automatic in VS Code 1.74+)

Command activation is automatic in VS Code 1.74+ via `contributes.commands`. We explicitly declare `onLanguage` activation events to activate when TypeScript/JavaScript/TSX/JSX files are opened. This ensures commands work from the palette while keeping the extension lazy-loaded for performance.

## Privacy

**This extension does not collect any telemetry or user data.** Your code, settings, and usage patterns remain completely private. We respect your privacy and believe in keeping your development environment local and secure.

## Credits

This extension is based on the "Organize Imports" feature from [TypeScript Hero](https://github.com/buehler/typescript-hero) by Christoph Bühler. The original TypeScript Hero is no longer maintained, so we've extracted and modernized this valuable feature into a standalone extension.

## License

MIT License — Copyright (c) 2025 [Angular.Schule](https://angular.schule) (by Johannes Hoppe)

Original work Copyright (c) Christoph Bühler

## Support

- 🐛 [Report issues](https://github.com/angular-schule/mini-typescript-hero/issues)
- 💡 [Request features](https://github.com/angular-schule/mini-typescript-hero/issues)
- 📚 [Documentation](https://github.com/angular-schule/mini-typescript-hero)

## Links

- [GitHub Repository](https://github.com/angular-schule/mini-typescript-hero)
- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero)
- [Angular.Schule](https://angular.schule)
