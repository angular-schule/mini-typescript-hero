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

Create custom groups with regex patterns:

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
