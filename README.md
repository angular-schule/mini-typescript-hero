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
- 🔀 **Merge duplicate imports** from the same module (e.g., `import { A, B } from './lib'`)
- 📦 **Custom grouping patterns** with regex (e.g., group all `/@angular/` imports together)
- 📏 **Blank line control** between groups (1 line, 2 lines, or preserve existing)
- ⚙️ **Formatting control** — quotes (`'` vs `"`), semicolons, spaces in braces, trailing commas
- 🎯 **Multi-line wrapping** at configurable character threshold
- 🗂️ **Remove `/index`** from paths (shorten `./lib/index` to `./lib`)
- 💾 **Organize on save** (optional)
- 🎨 **Import attributes/assertions** — Preserves modern syntax like `with { type: 'json' }`
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
- 1 blank line after imports (configurable)

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

## 🚀 Quick Start

**Just want to get started?** Jump to the [Configuration Cookbook](#configuration-cookbook) for ready-to-use presets:

- 🅰️ **Angular/Nx** — Groups `@angular/*`, `rxjs`, and `@app/*` imports
- ⚛️ **React/Next.js** — React-first with Prettier-compatible formatting
- 🟢 **Node/Backend** — Clean separation for Express, NestJS, and libraries
- 📦 **Monorepo** — Shared scope grouping for Nx, Turborepo, or pnpm workspaces

Each preset is a complete `.vscode/settings.json` configuration you can copy-paste and start using immediately.

## Usage

### Available Commands

Access these commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. **Mini TS Hero: Organize imports (sort and remove unused)**
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

> **💡 Tip:** If you enable `organizeOnSave`, consider disabling VS Code's built-in organize imports action to avoid conflicts. Use the "Check for configuration conflicts" command to detect overlapping settings.

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

**Legacy Mode:** For migrated users, `legacyMode` is automatically set to `true` to match the original TypeScript Hero output format as closely as possible. When enabled, legacy mode matches these old behaviors (including bugs) for maximum backward compatibility:

- **`blankLinesAfterImports`** — Always preserves existing blank lines (ignores configured value)
- **`organizeSortsByFirstSpecifier`** — **SILENTLY IGNORED** (always sorts by library name within groups) ⚠️ Bug replication
- **`disableImportsSorting`** — **SILENTLY IGNORED** (always sorts imports within groups) ⚠️ Bug replication
- **Merge timing** — Merges BEFORE removeTrailingIndex (old bug: `./lib/index` and `./lib` won't merge)
- **Type-only imports** — Strips `import type` keywords (old TS <3.8 behavior)
- **Indentation** — Always uses spaces (ignores `insertSpaces` setting)
- **Crash handling** — Gracefully handles cases that crashed old extension (silent fix)

**Why match old bugs?** Migrated users depend on consistent output format. Any change would create massive diffs across their codebase on first run, breaking trust. Legacy mode provides the closest match possible to the old extension's output, though some edge cases may differ due to the modern parser (ts-morph vs deprecated typescript-parser) and improved comment handling.

**Modern mode fixes these bugs:** New users get `legacyMode: false` by default for correct behavior. You can toggle this setting anytime via the command palette or your configuration.

> **⚠️ IMPORTANT**: When `legacyMode: true`, certain config settings are silently ignored (see above). The extension does NOT warn about this - it's intentional for backward compatibility. If you need these settings to work, set `legacyMode: false`.

### No Old Settings?

If you've never used TypeScript Hero before, the migration simply won't run — no action needed!

## Configuration

### 🎯 Configuration Priority (Smart Defaults)

**Mini TypeScript Hero respects your existing editor configuration!** Instead of requiring duplicate configuration, the extension follows this priority order:

#### Priority Decision Flow

The extension checks settings in this order and uses the first explicit value it finds:

| Setting | Priority 1: VS Code | Priority 2: Extension Setting | Notes |
|---------|---------------------|-------------------------------|-------|
| **Quote Style** | `typescript.preferences.quoteStyle`<br>`javascript.preferences.quoteStyle` | `miniTypescriptHero.imports.stringQuoteStyle` | VS Code default: `"auto"`<br>Extension default: `'` (single) |
| **Semicolons** | `typescript.format.semicolons`<br>`javascript.format.semicolons` | `miniTypescriptHero.imports.insertSemicolons` | VS Code default: `"ignore"`<br>Extension default: `true` |
| **Indentation** | `editor.tabSize`<br>`editor.insertSpaces` | `miniTypescriptHero.imports.tabSize`<br>`miniTypescriptHero.imports.insertSpaces`<br>**(Only when `useOnlyExtensionSettings: true`)** | VS Code **always has values** (default: `4` spaces)<br>Modern mode: uses `2` spaces when VS Code is at default<br>Extension settings ignored unless override enabled |

#### What Do "auto" and "ignore" Mean?

VS Code uses special default values that delegate the decision to other tools:

**`"auto"` (for quotes):**
- Means: "Let the extension/formatter decide"
- VS Code returns this when the user hasn't explicitly configured a quote style
- When Mini TypeScript Hero sees `"auto"`, it uses the extension's `stringQuoteStyle` setting
- **Result:** Single quotes `'` by default (unless you configure the extension setting)

**`"ignore"` (for semicolons):**
- Means: "Don't enforce semicolons - leave code as-is"
- VS Code returns this when the user hasn't explicitly configured semicolon behavior
- When Mini TypeScript Hero sees `"ignore"`, it uses the extension's `insertSemicolons` setting
- **Result:** Semicolons inserted by default (unless you configure the extension setting)

**Explicit VS Code values always win:**
- `typescript.preferences.quoteStyle: "single"` → Single quotes (overrides extension setting)
- `typescript.preferences.quoteStyle: "double"` → Double quotes (overrides extension setting)
- `typescript.format.semicolons: "insert"` → Add semicolons (overrides extension setting)
- `typescript.format.semicolons: "remove"` → Remove semicolons (overrides extension setting)

#### Override: useOnlyExtensionSettings

Set `miniTypescriptHero.imports.useOnlyExtensionSettings: true` to skip Priority 1 entirely:

| Setting | When `useOnlyExtensionSettings: false` (default) | When `useOnlyExtensionSettings: true` |
|---------|--------------------------------------------------|---------------------------------------|
| **Quote Style** | VS Code setting → Extension setting | Extension setting only |
| **Semicolons** | VS Code setting → Extension setting | Extension setting only |
| **Indentation** | VS Code setting → Extension setting | Extension setting only |

**Use case:** Enforce consistent import formatting across all team members regardless of their personal VS Code configuration.

**Note on EditorConfig:** For indentation (`tabSize` and `insertSpaces`), if you have the [EditorConfig extension](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) installed, VS Code automatically applies `.editorconfig` settings to its own `editor.tabSize` and `editor.insertSpaces` settings. Our extension reads these resolved VS Code values, so EditorConfig integration works automatically for indentation (but NOT for quotes - use VS Code settings for quotes).

#### Example Scenarios

**Scenario 1: Using VSCode settings (recommended)**
```json
{
  "typescript.preferences.quoteStyle": "single",
  "typescript.format.semicolons": "insert"
}
```

Result: **Single quotes with semicolons** (from VSCode settings, applies to all TypeScript tools)

**Scenario 2: VSCode settings override extension settings**
```json
{
  "typescript.preferences.quoteStyle": "double",
  "miniTypescriptHero.imports.stringQuoteStyle": "'"
}
```

Result: **Double quotes** (from VSCode preferences, extension setting is ignored)

**Scenario 3: Use only extension settings (skip VSCode preferences)**
```json
{
  "miniTypescriptHero.imports.stringQuoteStyle": "'",
  "miniTypescriptHero.imports.insertSemicolons": false,
  "miniTypescriptHero.imports.useOnlyExtensionSettings": true
}
```

Result: **Single quotes, no semicolons** (from extension settings, VS Code settings skipped)

💡 **Tip**: For team projects, configure VSCode workspace settings (`.vscode/settings.json`). For personal preferences, use user settings. The extension's settings are there as convenient fallbacks.

### Basic Settings

```json
{
  // Automatically organize imports when saving a file
  "miniTypescriptHero.imports.organizeOnSave": false,

  // Blank lines after imports: "one" (default), "two", or "preserve"
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",

  // Quote style (fallback - respects VSCode preferences first)
  // Use single quotes (') or double quotes (")
  "miniTypescriptHero.imports.stringQuoteStyle": "'",

  // Semicolons (fallback - respects VSCode typescript.format.semicolons first)
  // Add semicolons at the end of import statements
  "miniTypescriptHero.imports.insertSemicolons": true,

  // Add spaces inside import braces: { foo } vs {foo}
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,

  // Remove trailing /index from import paths
  // Note: In modern mode, when enabled with mergeImportsFromSameModule, imports from
  // './lib/index' and './lib' will be normalized to './lib' and then merged.
  // In legacy mode, merge timing is different (see Legacy Mode section below).
  "miniTypescriptHero.imports.removeTrailingIndex": true
}
```

#### Blank Line Modes

Control spacing after imports with `blankLinesAfterImports`:

- **`"one"`** (default) — Always exactly 1 blank line (ESLint standard) **RECOMMENDED**
- **`"two"`** — Always exactly 2 blank lines (for teams preferring more visual separation)
- **`"preserve"`** — Keep existing blank lines (0, 1, 2, 3+) as they are

**Note:** When `legacyMode: true` (automatically set for migrated users), this setting is overridden and legacy mode uses `"preserve"` behavior to match the old TypeScript Hero extension. Legacy mode preserves existing blank lines from the source file and replicates the old extension's quirks around headers and leading blank lines. The old extension had unpredictable blank line behavior (sometimes accumulating extra lines, sometimes adding 2 lines after headers) which legacy mode replicates for output consistency. For consistent spacing, new users should use modern mode (`legacyMode: false`) which respects the configured blank line setting exactly.

**Implementation detail:** Internally, legacy mode forces `blankLinesAfterImports` to `"preserve"` and then applies the old TypeScript Hero quirks for headers and leading blanks. This makes it easier to correlate README documentation with the actual implementation in `ImportsConfig` and `ImportManager`.

**Example:**

Input file:
```typescript
import { A } from './a';


const x = 1; // 2 blank lines before code
```

**With `blankLinesAfterImports: "one"`:** Always exactly 1 blank line
**With `blankLinesAfterImports: "preserve"`:** Keeps the 2 blank lines from source
**With `legacyMode: true`:** Uses 'preserve' behavior automatically (ignores configured value)

### Multiline Import Indentation

Mini TypeScript Hero respects your editor's indentation settings for multiline imports:

```json
{
  // NOTE: These extension settings (tabSize, insertSpaces) are ONLY used when
  // useOnlyExtensionSettings is true. Otherwise, VS Code editor settings are
  // always used (VS Code defaults: 4 spaces, insertSpaces=true)

  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,
  "miniTypescriptHero.imports.useOnlyExtensionSettings": false,  // Set to true to use extension settings

  // Legacy mode: Always uses spaces, default 4 (matches old TypeScript Hero)
  // Reads editor.tabSize automatically
  "miniTypescriptHero.imports.legacyMode": false
}
```

**Default Indentation Behavior:**

- **Modern mode** (`legacyMode: false`):
  - VS Code **always has `editor.tabSize`** (default: 4 spaces)
  - Modern mode uses **2 spaces** when VS Code is at its default value (4)
  - If you've explicitly set `editor.tabSize` to a different value, that value is used instead
  - Supports both spaces and tabs via `editor.insertSpaces`
  - Example: `import {\n  Foo,\n  Bar\n} from './lib';`

- **Legacy mode** (`legacyMode: true`):
  - Reads VS Code's resolved editor settings (VS Code defaults to **4 spaces**, but many TypeScript projects use 2)
  - Falls back to **4 spaces** when no editor context is available
  - Always uses spaces (never tabs)
  - Matches old TypeScript Hero output format

**Note:** EditorConfig integration works automatically for indentation (see Configuration Priority section above for details).

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
  "miniTypescriptHero.imports.ignoredFromRemoval": ["react"],
}
```

> **⚠️ NOTE:** `ignoredFromRemoval` uses exact string matching without wildcards. For example, `"react"` matches only `"react"`, not `"react-dom"` or `"react/jsx-runtime"`. Each library must be listed individually.

**Example: Multiple React packages**

If you want to preserve all React-related imports:

```json
{
  "miniTypescriptHero.imports.ignoredFromRemoval": [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime"
  ]
}
```

This is useful in React projects where some imports (like `react/jsx-runtime`) are used implicitly by JSX compilation and the extension might incorrectly flag them as unused.

```json
{
  // Character threshold for multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,

  // Add trailing comma in multiline imports
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Ignore VS Code settings (use only extension settings)
  // When true: Ignores VS Code editor.tabSize, editor.insertSpaces,
  // typescript.preferences.quoteStyle, typescript.format.semicolons, etc.
  // Use case: Enforce consistent import formatting across team regardless of editor config
  "miniTypescriptHero.imports.useOnlyExtensionSettings": false
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

#### Disable Sorting

**`disableImportsSorting`** (default: `false`) preserves the original order of imports in your file:

**Default (false): Sorts alphabetically**
```typescript
import { z } from './z';  // Reordered to: a, z
import { a } from './a';
```

**When enabled (true): Keeps original order**
```typescript
import { z } from './z';  // Stays: z, a (as written)
import { a } from './a';
```

> **Note:** Specifiers within each import are still sorted alphabetically (e.g., `import { b, a }` becomes `import { a, b }`). This setting has no effect when `legacyMode: true`.

#### Sort Order Within Groups

**`organizeSortsByFirstSpecifier`** (default: `false`) controls how imports are sorted within each group:

**Default (false): Sort by module path**
```typescript
import { Zebra } from './a-module';  // './a-module' comes before './z-module'
import { Apple } from './z-module';
```

**When enabled (true): Sort by first imported name**
```typescript
import { Apple } from './z-module';  // 'Apple' comes before 'Zebra'
import { Zebra } from './a-module';
```

> **Note:** This is an advanced setting inherited from the original TypeScript Hero extension. Most users should keep the default (sort by module path) for consistency with VS Code's built-in "Organize Imports" command. This setting has no effect when `disableImportsSorting: true` or `legacyMode: true`.

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

**Example: Grouping Path Aliases**

Many projects use TypeScript path aliases (configured in `tsconfig.json`) like `@app/*`, `@shared/*`, or `@core/*`. You can group these separately from other node_modules imports:

```json
{
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^@angular/",    // Angular framework imports
    "/^@app\\//",      // Your app-specific path aliases (@app/*)
    "Modules",         // Other node_modules libraries
    "Workspace"        // Relative imports (./*)
  ]
}
```

**Result:**
```typescript
// Group 1: Plains
import 'zone.js';

// Group 2: Angular framework
import { Component } from '@angular/core';

// Group 3: App aliases (@app/*)
import { AppConfig } from '@app/config';
import { UserService } from '@app/services/user';

// Group 4: Other modules
import { Observable } from 'rxjs';

// Group 5: Local files
import { helper } from './utils';
```

**Note:** The regex pattern `/^@app\\//` uses `\\/` to match the literal forward slash after `@app`. This ensures only imports starting with `@app/` are matched, not imports like `@app-something`.

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

## Configuration Cookbook

Sometimes you just want a working preset you can drop into `.vscode/settings.json` and move on.
This section gives you opinionated presets for common project types.

> All examples use **modern mode** (`legacyMode: false`) and assume you want Mini TS Hero to own import organization.

---

### Angular workspace

Good defaults for Angular CLI / Nx Angular projects with `@app/*` aliases and RxJS.

Paste into `.vscode/settings.json` in your Angular workspace:

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
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",   // 1 blank line between imports and code
  "miniTypescriptHero.imports.removeTrailingIndex": true,       // ./foo/index -> ./foo
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.disableImportsSorting": false,

  // Multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Indentation for multiline imports (matches standard Angular style)
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // Grouping: Angular first, then app aliases, then other modules, then workspace
  "miniTypescriptHero.imports.grouping": [
    "Plains",          // import 'zone.js';
    "/^@angular/",     // Angular framework imports
    "/^@app\\//",       // Your app path aliases (@app/*)
    "Modules",         // Other node_modules libraries
    "Workspace"        // Relative imports (./*)
  ]
}
```

**What you get:**

* Angular imports first, then your `@app/*` aliases
* One blank line between imports and code
* `/index` cleaned from local paths
* Imports merged and sorted within groups
* Safe defaults for most Angular projects

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
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.disableImportsSorting": false,

  // Multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 120,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Indentation
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // Grouping: React first, then other modules, then local code
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^react/",     // react, react-dom, react-router, etc.
    "Modules",
    "Workspace"
  ]

  // Note: By default, Mini TS Hero never removes "react" even if unused:
  // "miniTypescriptHero.imports.ignoredFromRemoval": ["react"]
}
```

**What you get:**

* React ecosystem imports grouped together at the top
* Import style that plays nicely with common Prettier defaults
* Automatic merge and cleanup of unused imports

---

### Node backend / library

Preset for Node services and libraries (Express, NestJS, plain TS/JS backends).

```json
{
  // Style (common backend defaults)
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
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.disableImportsSorting": false,

  // Multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 120,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // Indentation
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // Grouping: simple but effective
  "miniTypescriptHero.imports.grouping": [
    "Plains",     // e.g. import 'dotenv/config';
    "Modules",    // node:fs, express, lodash, etc.
    "Workspace"   // ./src/..., ../shared/...
  ]
}
```

**What you get:**

* Clean separation of core modules / npm packages / local files
* Good defaults for backend projects with minimal tweaking

---

### Monorepo (Nx, Turborepo, Yarn workspaces, pnpm workspaces)

Preset for monorepos with internal packages under a shared scope like `@myorg/*`.
This one assumes you want the **same import style for everyone in the repo**, regardless of personal editor settings.

```json
{
  // Enforce a repo-wide style from the extension only
  "miniTypescriptHero.imports.useOnlyExtensionSettings": true,

  // Style owned by Mini TS Hero (not by VS Code)
  "miniTypescriptHero.imports.stringQuoteStyle": "'",
  "miniTypescriptHero.imports.insertSemicolons": true,
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // Core behavior
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.disableImportsSorting": false,

  // Group monorepo packages separately from third-party modules and local files
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^@myorg\\//",     // All internal packages (apps/libs) under @myorg/*
    "/^@myorg-/",       // Optional: old-style packages like @myorg-core, @myorg-ui
    "Modules",          // Other node_modules
    "Workspace"         // Relative paths (./, ../)
  ]
}
```

**How to adapt:**

* Replace `@myorg` with your actual scope (for example `@acme`).
* Add more regex groups for special internal areas if needed, for example:

  * `/^@myorg-apps\\//` for app entry points
  * `/^@myorg-libs\\//` for shared libraries

This preset is ideal when you want **one canonical import style** across all packages in the monorepo.

---

If none of these exactly match your project, pick the closest preset and tweak:

* `grouping` for your framework and aliases
* `stringQuoteStyle` / `insertSemicolons` to match your formatter
* `multiLineWrapThreshold` and `multiLineTrailingComma` for your wrapping rules

## Using with Prettier and ESLint

Mini TypeScript Hero focuses on **import organization**:

- Sort imports
- Merge imports from the same module
- Remove unused imports

Formatters (Prettier) and linters (ESLint) still own everything else.
They work together as long as **only one tool is responsible for sorting imports**.

---

### Recommended setup: Mini TS Hero + Prettier + ESLint

On save, a typical modern setup looks like this:

1. Mini TS Hero organizes imports.
2. ESLint fixes rule violations.
3. Prettier formats the final code.

Example `settings.json`:

```json
{
  // Mini TypeScript Hero: organize imports on save
  "miniTypescriptHero.imports.organizeOnSave": true,

  // Prettier as default formatter
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,

  // ESLint fix on save (optional but common)
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": false  // IMPORTANT: disable VS Code built-in import organizer
  }
}
```

**Why disable `source.organizeImports`?**

* VS Code built-in `source.organizeImports` also sorts imports.
* If both Mini TS Hero and VS Code built-in organize imports on save, your imports can be rearranged multiple times.
* Mini TS Hero already covers the built-in behavior plus grouping and advanced options, so it should be the only import organizer.

> To check and fix this automatically, run the command
> **"Mini TS Hero: Check for configuration conflicts"** from the Command Palette.
> It will detect if the built-in organizer or the old TypeScript Hero extension are still active and offer to fix conflicts.

---

### Avoid multiple tools sorting imports

Only **one** of the following should reorder imports:

* Mini TypeScript Hero
* VS Code built-in `editor.codeActionsOnSave: { "source.organizeImports": true }`
* ESLint rules that change import order:

  * `sort-imports`
  * `import/order`
* Prettier plugins that sort imports:

  * `@trivago/prettier-plugin-sort-imports`
  * `prettier-plugin-organize-imports`
  * Any other plugin that explicitly rearranges imports

If two or more of these are enabled, you can see:

* Imports jumping around on each save.
* Large, noisy diffs where each tool reorders slightly differently.

---

### Option A (recommended): Let Mini TS Hero own import order

In this setup:

* Mini TS Hero is the **only** tool that reorders imports.
* ESLint and Prettier are still free to format and lint.

**1. ESLint config (`.eslintrc.*`)**

Turn off import-sorting rules:

```js
// .eslintrc.js (example)
module.exports = {
  // ...
  rules: {
    // Let Mini TS Hero sort imports instead of ESLint
    "sort-imports": "off",
    "import/order": "off",

    // Other rules are fine
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
};
```

**2. VS Code settings**

Make sure only Mini TS Hero organizes imports:

```json
{
  "miniTypescriptHero.imports.organizeOnSave": true,

  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": false
  }
}
```

**3. Run conflict check**

After enabling `organizeOnSave`, run:

1. `Ctrl+Shift+P` / `Cmd+Shift+P`
2. "Mini TS Hero: Check for configuration conflicts"

This ensures:

* VS Code built-in `source.organizeImports` is not fighting with Mini TS Hero.
* The old TypeScript Hero extension is not still active.

---

### Option B: Use ESLint/Prettier for sorting, Mini TS Hero only for removal

If your team already has a strong ESLint or Prettier import-sorting setup and you do **not** want to change it, you can:

* Let ESLint/Prettier control the **order** of imports.
* Use Mini TS Hero mainly for **unused import removal**.

In that case:

**1. Keep your ESLint import rules on**, and adjust Mini TS Hero:

```json
{
  // Do NOT let Mini TS Hero reorder entire import list
  "miniTypescriptHero.imports.disableImportsSorting": true,

  // Keep removal of unused imports
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,

  // Optional: avoid merging to keep lines close to what ESLint expects
  "miniTypescriptHero.imports.mergeImportsFromSameModule": false
}
```

**Trade-offs:**

* Mini TS Hero will still visit and clean up imports, but it will not reorder them globally.
* ESLint or the Prettier plugin remains the single source of truth for import order.
* You may lose some of the advanced grouping features from Mini TS Hero, because grouping effectively requires reordering.

If you see thrashing or constant diffs, go back to **Option A** and let Mini TS Hero own the import order.

---

### Prettier style vs Mini TS Hero style

Mini TS Hero tries to respect your existing VS Code / language settings by default:

* Quote style from `typescript.preferences.quoteStyle` and `javascript.preferences.quoteStyle`
* Semicolons from `typescript.format.semicolons` and `javascript.format.semicolons`
* Indentation from `editor.tabSize` and `editor.insertSpaces` (or from extension settings when `useOnlyExtensionSettings: true`)

To reduce friction with Prettier:

* Configure VS Code TS/JS preferences to match your Prettier config, **or**
* Turn on `miniTypescriptHero.imports.useOnlyExtensionSettings` and set the extension style to match your Prettier rules (see Monorepo preset in the Configuration Cookbook).

As long as only **one tool is responsible for import ordering** and their formatting styles are aligned, Mini TS Hero, Prettier, and ESLint can happily coexist in the same project.

## Debugging & Troubleshooting

If something isn't working as expected, the extension's Output channel provides detailed logging to help diagnose issues.

### Opening the Output Panel

1. **Open the VS Code Output panel:**
   - Windows/Linux: `Ctrl+` ` (backtick) → Select "Output" tab
   - macOS: `Cmd+` ` (backtick) → Select "Output" tab
   - OR: Menu → View → Output

2. **Select "Mini TypeScript Hero" from the channel dropdown**
   - Located in the top-right of the Output panel
   - Shows all extension logging in real-time

### What Gets Logged

The extension logs these events to help diagnose issues:

**Startup Events:**
- Extension activation/deactivation
- Settings migration from old TypeScript Hero
- Conflict detection (other import organizers)

**Per-File Events:**
- Each file organized (filename logged)
- Success/failure of edits applied
- Any errors during processing

**Configuration Events:**
- Settings changes via toggle commands
- Legacy mode enable/disable

### Example Log Output

When organizing imports on file save, you'll see:

```
[ImportOrganizer] Activating
Mini TypeScript Hero: Activating extension
Mini TypeScript Hero: Extension activated successfully
[ImportOrganizer] Organizing imports for /path/to/file.ts
[ImportOrganizer] Imports organized successfully
```

If an error occurs:

```
[ImportOrganizer] Error organizing imports for /path/to/file.ts
Error: Unexpected token...
    at ImportManager.organizeImports (...)
    at ...
```

### Manual Test Cases

The repository includes [10 test cases](https://github.com/angular-schule/mini-typescript-hero/tree/master/manual-test-cases) covering various scenarios (unused imports, grouping, type-only imports, JSX/TSX, etc.). Use these to test configurations or create reproducible bug reports.

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

## Notes

### Comment Handling

The extension preserves most comments in your import blocks:

**Preserved:**
- Comments above import statements
- Comments at the end of import lines
- Comments between import statements

**Not preserved:**
- Comments inside import braces (e.g., `import { Foo /* comment */ } from './lib'`)
- Comments between individual specifiers in multiline imports

```typescript
// ✅ This comment is preserved
import { Foo } from './foo'; // ✅ This too

// ❌ This is lost:
import { Bar /* inline comment */ } from './bar';
```

This matches the behavior of the original TypeScript Hero extension. Inline comment preservation adds significant complexity for limited real-world benefit. If you rely on inline comments within imports, please [share your use case](https://github.com/angular-schule/mini-typescript-hero/issues).

**💡 Best Practice:** If a comment is critical to understanding your code, put it above the import statement or on its own line, not embedded directly inside the import braces. This ensures your comments are preserved during import organization.

### Legacy Mode Notes

When `legacyMode: true` (automatically enabled for migrated users), some settings behave differently to maintain compatibility with the original TypeScript Hero:

- `blankLinesAfterImports` — Preserves existing blank lines (ignores configured value)
- `organizeSortsByFirstSpecifier` — Always sorts by library name (setting has no effect)
- `disableImportsSorting` — Always sorts imports (setting has no effect)

This ensures consistent output for users migrating from the original extension. New users get `legacyMode: false` by default for modern, fully-functional behavior. You can toggle this setting anytime via the command palette.

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
