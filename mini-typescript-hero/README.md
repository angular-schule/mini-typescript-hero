<div align="center">
  <img src="logo.png" alt="Mini TypeScript Hero Logo" width="200">
</div>

# Mini TypeScript Hero

**Sorts and organizes TypeScript/JavaScript imports** — A lightweight, modern VSCode extension that automatically manages your import statements.

This extension is a modernized extraction of the "Organize Imports" feature from the original [TypeScript Hero](https://github.com/buehler/typescript-hero) extension, rebuilt with 2025 best practices.

## Features

- ✨ **Sort imports** alphabetically (by module path or first specifier)
- 🧹 **Remove unused imports** automatically
- 📦 **Group imports** into customizable categories (Plains, Modules, Workspace, Regex patterns)
- ⚙️ **Highly configurable** formatting (quotes, semicolons, spaces, multiline thresholds)
- 💾 **Organize on save** (optional)
- 🎯 **Works with TypeScript, JavaScript, TSX, and JSX**

## Usage

### Command Palette

1. Open a TypeScript or JavaScript file
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type "Mini TS Hero: Organize imports"
4. Press Enter

### Keyboard Shortcut

Press `Ctrl+Alt+O` (Windows/Linux) or `Cmd+Alt+O` (macOS) to organize imports in the current file.

### Organize on Save

Enable automatic import organization on file save:

```json
{
  "miniTypescriptHero.imports.organizeOnSave": true
}
```

## Migrating from TypeScript Hero

**Good news!** If you're upgrading from the original TypeScript Hero extension, your settings will be **automatically migrated** on first startup.

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

**Import Merging Behavior:** For migrated users, `mergeImportsFromSameModule` is automatically set to `false` to preserve the original TypeScript Hero behavior. New users get `true` by default (modern best practice). You can change this setting anytime in your configuration.

### No Old Settings?

If you've never used TypeScript Hero before, the migration simply won't run — no action needed!

## Configuration

### Basic Settings

```json
{
  // Automatically organize imports when saving a file
  "miniTypescriptHero.imports.organizeOnSave": false,

  // Use single quotes (') or double quotes (")
  "miniTypescriptHero.imports.stringQuoteStyle": "'",

  // Add semicolons at the end of import statements
  "miniTypescriptHero.imports.insertSemicolons": true,

  // Add spaces inside import braces: { foo } vs {foo}
  "miniTypescriptHero.imports.insertSpaceBeforeAndAfterImportBraces": true,

  // Remove trailing /index from import paths
  "miniTypescriptHero.imports.removeTrailingIndex": true
}
```

### Advanced Settings

```json
{
  // Disable sorting (keep original order)
  "miniTypescriptHero.imports.disableImportsSorting": false,

  // Disable removal of unused imports
  "miniTypescriptHero.imports.disableImportRemovalOnOrganize": false,

  // Sort by first imported name instead of module path
  "miniTypescriptHero.imports.organizeSortsByFirstSpecifier": false,

  // Merge multiple imports from the same module (default: true)
  // When true: import { A, B } from './lib'
  // When false: import { A } from './lib'; import { B } from './lib';
  "miniTypescriptHero.imports.mergeImportsFromSameModule": true,

  // Libraries that should never be removed (even if unused)
  "miniTypescriptHero.imports.ignoredFromRemoval": ["react"],

  // Character threshold for multiline imports
  "miniTypescriptHero.imports.multiLineWrapThreshold": 125,

  // Add trailing comma in multiline imports
  "miniTypescriptHero.imports.multiLineTrailingComma": true
}
```

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

## Example

**Before:**

```typescript
import { UsedComponent } from './components';
import { UnusedService } from './services';
import * as React from 'react';
import {Component, OnInit} from "@angular/core"
import 'zone.js';
import { map } from 'rxjs/operators';
```

**After (with default settings):**

```typescript
import 'zone.js';

import { Component, OnInit } from '@angular/core';
import * as React from 'react';
import { map } from 'rxjs/operators';

import { UsedComponent } from './components';
```

## Requirements

- VSCode 1.85.0 or higher
- Node.js 18.0.0 or higher (for extension development)

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
