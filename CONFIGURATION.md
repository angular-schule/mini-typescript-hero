# Configuration Reference

Complete reference for all Mini TypeScript Hero configuration options.

> **💡 The defaults are already great!** Most users just need organize-on-save and they're done. See the [README](README.md#quick-start) for the fastest path.
>
> **Want to customize everything?** Keep reading for complete presets with ALL options exposed.

---

## Table of Contents

- [Full Configuration Cookbook](#full-configuration-cookbook)
- [Configuration Priority (Smart Defaults)](#configuration-priority-smart-defaults)
- [Basic Settings](#basic-settings)
- [Advanced Settings](#advanced-settings)
- [Import Grouping](#import-grouping)
- [Multiline Import Indentation](#multiline-import-indentation)

---

## Full Configuration Cookbook

These presets show **every available setting** so you can see what's configurable. Most settings use smart defaults, but here's how to customize everything.

> **Note:** Settings marked `// (default)` can be omitted - they're shown here for completeness.

### Angular Workspace (Complete)

Full configuration for Angular CLI / Nx Angular projects showing all available options.

```json
{
  // ========================================
  // VS Code TypeScript/JavaScript Settings
  // ========================================
  "typescript.preferences.quoteStyle": "single",
  "typescript.format.semicolons": "insert",
  "javascript.preferences.quoteStyle": "single",
  "javascript.format.semicolons": "insert",

  // ========================================
  // Mini TypeScript Hero - Behavior
  // ========================================
  "miniTypescriptHero.imports.legacyMode": false,  // (default for new users)
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.disableImportsSorting": false,  // (default)
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,  // (default)
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,  // (default)
  "miniTypescriptHero.imports.organizeSortsByFirstSpecifier": false,  // (default)

  // ========================================
  // Mini TypeScript Hero - Formatting
  // ========================================
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",  // (default)
  "miniTypescriptHero.imports.removeTrailingIndex": true,  // (default)
  "miniTypescriptHero.imports.stringQuoteStyle": "'",  // (default, but VS Code setting takes priority)
  "miniTypescriptHero.imports.insertSemicolons": true,  // (default, but VS Code setting takes priority)
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,  // (default)

  // ========================================
  // Mini TypeScript Hero - Multiline Imports
  // ========================================
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,  // (default: 125)
  "miniTypescriptHero.imports.multiLineTrailingComma": true,  // (default)
  "miniTypescriptHero.imports.tabSize": 2,  // Used when useOnlyExtensionSettings=true
  "miniTypescriptHero.imports.insertSpaces": true,  // (default)

  // ========================================
  // Mini TypeScript Hero - Advanced
  // ========================================
  "miniTypescriptHero.imports.ignoredFromRemoval": ["react"],  // (default)
  "miniTypescriptHero.imports.useOnlyExtensionSettings": false,  // (default)

  // ========================================
  // Mini TypeScript Hero - Import Grouping
  // ========================================
  "miniTypescriptHero.imports.grouping": [
    "Plains",          // Side-effect imports: import 'zone.js'
    "/^@angular/",     // Angular framework imports
    "/^@app\\//",      // Your app path aliases (@app/*)
    "Modules",         // Other node_modules libraries
    "Workspace"        // Relative imports (./, ../)
  ]
}
```

**What each setting does:**
- **`legacyMode: false`** — Modern behavior (type-only imports preserved, predictable blank lines)
- **`organizeOnSave: true`** — Automatically organize imports when saving files
- **`disableImportsSorting: false`** — Sorts imports alphabetically (recommended)
- **`disableImportRemovalOnOrganize: false`** — Removes unused imports (recommended)
- **`mergeImportsFromSameModule: true`** — Combines duplicate imports from same module
- **`blankLinesAfterImports: "one"`** — Exactly 1 blank line after imports (ESLint standard)
- **`removeTrailingIndex: true`** — Cleans `./foo/index` → `./foo`
- **Custom grouping** — Angular first, then app aliases, then other modules, then local files

---

### React App (Complete)

Full configuration for React/Next.js/CRA/Vite with Prettier-style formatting.

```json
{
  // ========================================
  // VS Code TypeScript/JavaScript Settings
  // ========================================
  "typescript.preferences.quoteStyle": "double",
  "typescript.format.semicolons": "insert",
  "javascript.preferences.quoteStyle": "double",
  "javascript.format.semicolons": "insert",

  // ========================================
  // Mini TypeScript Hero - Behavior
  // ========================================
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.disableImportsSorting": false,
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,

  // ========================================
  // Mini TypeScript Hero - Formatting
  // ========================================
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,

  // ========================================
  // Mini TypeScript Hero - Multiline Imports
  // ========================================
  "miniTypescriptHero.imports.multiLineWrapThreshold": 120,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // ========================================
  // Mini TypeScript Hero - Advanced
  // ========================================
  "miniTypescriptHero.imports.ignoredFromRemoval": [
    "react",           // (default - React is never removed)
    "react-dom",       // Add if using React DOM
    "react/jsx-runtime"  // Add if using new JSX transform
  ],
  "miniTypescriptHero.imports.useOnlyExtensionSettings": false,

  // ========================================
  // Mini TypeScript Hero - Import Grouping
  // ========================================
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^react/",        // React ecosystem: react, react-dom, react-router
    "Modules",         // Other npm packages
    "Workspace"        // Local files
  ]
}
```

**React-specific settings:**
- **Double quotes** — Matches Prettier default for React projects
- **`ignoredFromRemoval`** — React imports often appear unused but are needed for JSX
- **React grouping** — React imports together at the top

---

### Node Backend / Library (Complete)

Full configuration for Express, NestJS, or plain TypeScript/JavaScript backends.

```json
{
  // ========================================
  // VS Code TypeScript/JavaScript Settings
  // ========================================
  "typescript.preferences.quoteStyle": "single",
  "typescript.format.semicolons": "insert",
  "javascript.preferences.quoteStyle": "single",
  "javascript.format.semicolons": "insert",

  // ========================================
  // Mini TypeScript Hero - Behavior
  // ========================================
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.disableImportsSorting": false,
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,

  // ========================================
  // Mini TypeScript Hero - Formatting
  // ========================================
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,

  // ========================================
  // Mini TypeScript Hero - Multiline Imports
  // ========================================
  "miniTypescriptHero.imports.multiLineWrapThreshold": 120,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,
  "miniTypescriptHero.imports.tabSize": 2,

  // ========================================
  // Mini TypeScript Hero - Advanced
  // ========================================
  "miniTypescriptHero.imports.ignoredFromRemoval": ["react"],  // (default, usually not needed for Node)

  // ========================================
  // Mini TypeScript Hero - Import Grouping
  // ========================================
  "miniTypescriptHero.imports.grouping": [
    "Plains",          // Side-effect imports: import 'dotenv/config'
    "Modules",         // All npm packages (node:fs, express, etc.)
    "Workspace"        // Local files
  ]
}
```

**Node-specific settings:**
- **Simple grouping** — Just 3 groups: side-effects, modules, local files
- **Single quotes** — Common backend convention
- **Default ignoredFromRemoval** — Usually doesn't need React

---

### Monorepo (Complete)

Full configuration for Nx, Turborepo, Yarn/pnpm workspaces with enforced team-wide formatting.

```json
{
  // ========================================
  // Mini TypeScript Hero - OVERRIDE MODE
  // ========================================
  // This mode ignores VS Code settings and uses extension settings only
  "miniTypescriptHero.imports.useOnlyExtensionSettings": true,

  // ========================================
  // Mini TypeScript Hero - Formatting (OWNED BY EXTENSION)
  // ========================================
  "miniTypescriptHero.imports.stringQuoteStyle": "'",
  "miniTypescriptHero.imports.insertSemicolons": true,
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,
  "miniTypescriptHero.imports.tabSize": 2,
  "miniTypescriptHero.imports.insertSpaces": true,

  // ========================================
  // Mini TypeScript Hero - Behavior
  // ========================================
  "miniTypescriptHero.imports.legacyMode": false,
  "miniTypescriptHero.imports.organizeOnSave": true,
  "miniTypescriptHero.imports.disableImportsSorting": false,
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,
  "miniTypescriptHero.imports.organizeSortsByFirstSpecifier": false,

  // ========================================
  // Mini TypeScript Hero - Formatting
  // ========================================
  "miniTypescriptHero.imports.blankLinesAfterImports": "one",
  "miniTypescriptHero.imports.removeTrailingIndex": true,

  // ========================================
  // Mini TypeScript Hero - Multiline Imports
  // ========================================
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,
  "miniTypescriptHero.imports.multiLineTrailingComma": true,

  // ========================================
  // Mini TypeScript Hero - Advanced
  // ========================================
  "miniTypescriptHero.imports.ignoredFromRemoval": ["react"],

  // ========================================
  // Mini TypeScript Hero - Import Grouping
  // ========================================
  "miniTypescriptHero.imports.grouping": [
    "Plains",
    "/^@myorg\\//",    // All internal packages: @myorg/core, @myorg/ui, etc.
    "/^@myorg-/",      // Old-style packages: @myorg-core, @myorg-ui (optional)
    "Modules",         // Third-party npm packages
    "Workspace"        // Relative imports
  ]
}
```

**Monorepo-specific settings:**
- **`useOnlyExtensionSettings: true`** — Enforces consistent formatting regardless of personal VS Code settings
- **Explicit formatting** — All formatting controlled by extension, not VS Code preferences
- **Custom scoping** — Groups `@myorg/*` packages separately from third-party modules

**How to adapt:**
- Replace `@myorg` with your actual scope (`@acme`, `@company`, etc.)
- Add more regex groups for sub-scopes if needed: `/^@myorg\/apps\//`, `/^@myorg\/libs\//`

---

## Summary: Defaults vs. Customization

**The defaults are already great!** Most settings have sensible defaults:
- ✅ Merging enabled
- ✅ Removal enabled
- ✅ Sorting enabled
- ✅ 1 blank line after imports
- ✅ `/index` removal enabled
- ✅ Smart quotes and semicolons (respects VS Code settings)

**Only customize if:**
- You want specific framework grouping (Angular, React, etc.)
- You need team-wide formatting enforcement (monorepos)
- You have existing ESLint/Prettier conflicts to resolve

---

## Configuration Priority (Smart Defaults)

**Mini TypeScript Hero respects your existing editor configuration!** Instead of requiring duplicate configuration, the extension follows this priority order:

### Priority Decision Flow

The extension checks settings in this order and uses the first explicit value it finds:

| Setting | Priority 1: VS Code | Priority 2: Extension Setting | Notes |
|---------|---------------------|-------------------------------|-------|
| **Quote Style** | `typescript.preferences.quoteStyle`<br>`javascript.preferences.quoteStyle` | `miniTypescriptHero.imports.stringQuoteStyle` | VS Code default: `"auto"`<br>Extension default: `'` (single) |
| **Semicolons** | `typescript.format.semicolons`<br>`javascript.format.semicolons` | `miniTypescriptHero.imports.insertSemicolons` | VS Code default: `"ignore"`<br>Extension default: `true` |
| **Indentation** | `editor.tabSize`<br>`editor.insertSpaces` | `miniTypescriptHero.imports.tabSize`<br>`miniTypescriptHero.imports.insertSpaces`<br>**(Only when `useOnlyExtensionSettings: true`)** | VS Code **always has values** (default: `4` spaces)<br>Modern mode: uses `2` spaces when VS Code is at default<br>Extension settings ignored unless override enabled |

### What Do "auto" and "ignore" Mean?

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

### Override: useOnlyExtensionSettings

Set `miniTypescriptHero.imports.useOnlyExtensionSettings: true` to skip Priority 1 entirely:

| Setting | When `useOnlyExtensionSettings: false` (default) | When `useOnlyExtensionSettings: true` |
|---------|--------------------------------------------------|---------------------------------------|
| **Quote Style** | VS Code setting → Extension setting | Extension setting only |
| **Semicolons** | VS Code setting → Extension setting | Extension setting only |
| **Indentation** | VS Code setting → Extension setting | Extension setting only |

**Use case:** Enforce consistent import formatting across all team members regardless of their personal VS Code configuration.

**Note on EditorConfig:** For indentation (`tabSize` and `insertSpaces`), if you have the [EditorConfig extension](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) installed, VS Code automatically applies `.editorconfig` settings to its own `editor.tabSize` and `editor.insertSpaces` settings. Our extension reads these resolved VS Code values, so EditorConfig integration works automatically for indentation (but NOT for quotes - use VS Code settings for quotes).

### Example Scenarios

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

---

## Basic Settings

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
  // In legacy mode, merge timing is different (see Migration Guide for details).
  "miniTypescriptHero.imports.removeTrailingIndex": true
}
```

### Blank Line Modes

Control spacing after imports with `blankLinesAfterImports`:

- **`"one"`** (default) — Always exactly 1 blank line (ESLint standard) **RECOMMENDED**
- **`"two"`** — Always exactly 2 blank lines (for teams preferring more visual separation)
- **`"preserve"`** — Keep existing blank lines (0, 1, 2, 3+) as they are

**Note:** When `legacyMode: true` (automatically set for migrated users), this setting is overridden and legacy mode uses `"preserve"` behavior to match the old TypeScript Hero extension. For consistent spacing, new users should use modern mode (`legacyMode: false`) which respects the configured blank line setting exactly.

**Example:**

Input file:
```typescript
import { A } from './a';


const x = 1; // 2 blank lines before code
```

**With `blankLinesAfterImports: "one"`:** Always exactly 1 blank line
**With `blankLinesAfterImports: "preserve"`:** Keeps the 2 blank lines from source
**With `legacyMode: true`:** Uses 'preserve' behavior automatically (ignores configured value)

---

## Advanced Settings

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

### Import Merging vs. Import Removal

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

### Disable Sorting

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

### Sort Order Within Groups

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

---

## Import Grouping

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

### Grouping Keywords

- **`Plains`** — String-only imports (e.g., `import 'reflect-metadata'`)
- **`Modules`** — External library imports (e.g., `import { Component } from '@angular/core'`)
- **`Workspace`** — Relative imports (e.g., `import { foo } from './utils'`)
- **`Remaining`** — Catch-all for imports not matched by other groups

### Custom Regex Groups

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

### Custom Sort Order

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

---

## Multiline Import Indentation

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

### Default Indentation Behavior

**Modern mode** (`legacyMode: false`):
- VS Code **always has `editor.tabSize`** (default: 4 spaces)
- Modern mode uses **2 spaces** when VS Code is at its default value (4)
- If you've explicitly set `editor.tabSize` to a different value, that value is used instead
- Supports both spaces and tabs via `editor.insertSpaces`
- Example: `import {\n  Foo,\n  Bar\n} from './lib';`

**Legacy mode** (`legacyMode: true`):
- Reads VS Code's resolved editor settings (VS Code defaults to **4 spaces**, but many TypeScript projects use 2)
- Falls back to **4 spaces** when no editor context is available
- Always uses spaces (never tabs)
- Matches old TypeScript Hero output format

**Note:** EditorConfig integration works automatically for indentation (see Configuration Priority section above for details).

---

## See Also

- [Configuration Cookbook](README.md#configuration-cookbook) - Ready-to-use presets for Angular, React, Node, and Monorepo projects
- [Migration Guide](MIGRATION.md) - Migrating from TypeScript Hero
- [Main README](README.md) - Getting started and usage guide
