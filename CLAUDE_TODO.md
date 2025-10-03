# Mini TypeScript Hero - Implementation Plan

## Project Overview

**Goal**: Extract and modernize the "Sort and organize your imports" feature from TypeScript Hero into a new, minimal extension called `mini-typescript-hero`.

**Background**: Original author (Christoph Bühler) no longer maintains TypeScript Hero. The extension is deprecated, but the import organization feature is still valuable. We're rescuing this single feature with modern 2025 best practices.

## Key Decisions

### Extension Metadata
- **Extension ID**: `mini-typescript-hero`
- **Publisher**: `angular-schule`
- **Publisher Website**: http://angular.schule
- **Publisher Email**: team@angular.schule
- **Copyright**: Copyright (c) 2025 Angular.Schule (by Johannes Hoppe)
- **Original Author Credit**: Christoph Bühler (maintain MIT license with attribution)
- **Repository**: https://github.com/angular-schule/mini-typescript-hero (will replace content)

### Configuration Namespace
- **Primary Config**: `miniTypescriptHero.imports.*`
- **Migration**: Consider adding migration step from `typescriptHero.imports.*` (future enhancement)
- **Backward Compatibility**: All config options maintained

### Commands
- **Primary Command**: `miniTypescriptHero.imports.organize`
- **Alias**: Consider `typescriptHero.imports.organize` for backward compatibility (evaluate complexity)
- **Keybinding**: Ctrl+Alt+O (same as original)

### Features to Keep
✅ Manual organize imports command
✅ Organize on save (configurable)
✅ Sort imports (with configurable sorting strategies)
✅ Remove unused imports
✅ Import grouping (Plains, Modules, Workspace, Regex, Remaining)
✅ Configurable quote style (single/double)
✅ Configurable semicolons
✅ Configurable space in import braces
✅ Multiline import thresholds
✅ Trailing comma in multiline imports
✅ Remove trailing /index from imports
✅ Ignored imports (don't remove specific libraries)
✅ Disable sorting option
✅ Disable removal option

### Technology Stack (2025 Modern Approach)

| Component | Old | New | Reason |
|-----------|-----|-----|--------|
| **Scaffolding** | Manual | `yo code` | Official VSCode generator |
| **TypeScript Parser** | `typescript-parser` (deprecated 7 years) | `ts-morph` v27 | Active, modern, powerful API |
| **Bundler** | None (tsc only) | esbuild | Fast, modern standard |
| **DI Container** | InversifyJS | None (direct instantiation) | Overkill for small extension |
| **Logging** | winston | VSCode OutputChannel | Native, simpler |
| **Node Engine** | ^1.28.0 | ^1.85.0 | Modern VSCode |
| **TypeScript** | ~3.1.1 | ~5.7.0 | Latest stable |

### Architecture Simplification

**Old Architecture:**
```
extension.ts
  └─> TypescriptHero (DI container orchestrator)
      └─> ImportOrganizer (Activatable)
          └─> ImportManagerProvider
              └─> ImportManager
                  ├─> TypescriptParser (typescript-parser)
                  ├─> TypescriptCodeGenerator
                  ├─> Configuration
                  ├─> Logger (winston)
                  └─> Import Groups
```

**New Architecture:**
```
extension.ts
  └─> ImportOrganizer
      ├─> Configuration (simple wrapper)
      ├─> Logger (OutputChannel)
      └─> ImportManager
          ├─> ts-morph (parsing)
          └─> Import Groups
```

## Detailed Implementation Plan

### Phase 1: Scaffold New Extension ✓ TODO

**Location**: Create `mini-typescript-hero/` subfolder in current repo

**Steps**:
1. ✓ Run `npx --package yo --package generator-code -- yo code`
   - Choose: New Extension (TypeScript)
   - Extension name: mini-typescript-hero
   - Identifier: mini-typescript-hero
   - Description: "Sorts and organizes TypeScript/JavaScript imports"
   - Enable esbuild: Yes
   - Initialize git: No (already in repo)
   - Package manager: npm

2. ✓ Update `package.json` with extension metadata:
   - Publisher: angular-schule
   - Author: Johannes Hoppe / Angular.Schule
   - Repository URL
   - Homepage
   - License: MIT
   - Icon (reuse from angular-schule-extension-pack or create new)
   - Categories: [Formatters, Programming Languages]
   - Keywords: [typescript, javascript, imports, organize, sort]

3. ✓ Configure strict TypeScript (`tsconfig.json`):
   ```json
   "strict": true,
   "noUnusedLocals": true,
   "noUnusedParameters": true,
   "noImplicitReturns": true,
   "noFallthroughCasesInSwitch": true
   ```

4. ✓ Install dependencies:
   ```bash
   npm install ts-morph
   ```

### Phase 2: Port Configuration System ✓ TODO

**Files to create in `mini-typescript-hero/src/`**:

1. ✓ `configuration/imports-config.ts`
   - Port from `src/configuration/imports-config.ts`
   - Change config section key to `miniTypescriptHero.imports`
   - Keep all methods (with Uri parameter for multi-root workspaces)

2. ✓ `configuration/index.ts`
   - Export configuration classes
   - Add helper for workspace configuration

3. ✓ Update `package.json` contributions:
   ```json
   "contributes": {
     "configuration": {
       "title": "Mini TypeScript Hero",
       "properties": {
         "miniTypescriptHero.imports.organizeOnSave": { ... },
         "miniTypescriptHero.imports.stringQuoteStyle": { ... },
         // ... all other config options
       }
     }
   }
   ```

### Phase 3: Port Import Grouping ✓ TODO

**Files to create in `mini-typescript-hero/src/imports/import-grouping/`**:

1. ✓ `import-group-keyword.ts` - Enum for keyword groups
2. ✓ `import-group-order.ts` - Enum for sort order (asc/desc)
3. ✓ `import-group.ts` - Abstract base class
4. ✓ `keyword-import-group.ts` - Plains/Modules/Workspace groups
5. ✓ `regex-import-group.ts` - Regex-based custom groups
6. ✓ `remain-import-group.ts` - Catch-all group
7. ✓ `import-group-setting-parser.ts` - Parse config to groups
8. ✓ `import-group-identifier-invalid-error.ts` - Error class
9. ✓ `index.ts` - Exports

**Key Changes**:
- Remove dependency on `typescript-parser` types
- Use ts-morph's ImportDeclaration instead
- Simplify to work with string-based import representations

### Phase 4: Implement ImportManager with ts-morph ✓ TODO

**File**: `mini-typescript-hero/src/imports/import-manager.ts`

**Key Responsibilities**:
1. Parse document using ts-morph Project/SourceFile
2. Extract all imports with their metadata
3. Analyze usage of imported symbols
4. Remove unused imports (respecting ignoredFromRemoval config)
5. Sort imports (by first specifier or by module path)
6. Group imports according to configuration
7. Generate organized import text
8. Calculate TextEdits for VSCode WorkspaceEdit

**ts-morph API Usage**:
```typescript
import { Project, SourceFile, ImportDeclaration } from 'ts-morph';

// Parse document
const project = new Project({ useInMemoryFileSystem: true });
const sourceFile = project.createSourceFile(fileName, content);

// Get imports
const imports = sourceFile.getImportDeclarations();

// Get usages
const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);

// Manipulate
importDeclaration.remove();
sourceFile.addImportDeclaration({ ... });

// Generate
const newText = sourceFile.getText();
```

**Methods to Implement**:
- `constructor(document: TextDocument, config: Configuration, logger: Logger)`
- `organizeImports(): Promise<TextEdit[]>` - Main method
- `parseImports()` - Extract imports from document
- `findUnusedImports()` - Analyze which imports are unused
- `sortImports()` - Sort according to config
- `groupImports()` - Apply grouping rules
- `generateOrganizedImports()` - Create new import section
- `calculateTextEdits()` - VSCode TextEdit array

### Phase 5: Implement ImportOrganizer ✓ TODO

**File**: `mini-typescript-hero/src/imports/import-organizer.ts`

**Responsibilities**:
1. Register command: `miniTypescriptHero.imports.organize`
2. Register command alias: `typescriptHero.imports.organize` (if not too complex)
3. Register organize-on-save handler
4. Handle errors gracefully with user notifications

**Key Code**:
```typescript
export class ImportOrganizer {
  constructor(
    private context: ExtensionContext,
    private config: Configuration,
    private logger: Logger
  ) {}

  public activate(): void {
    // Register commands
    this.context.subscriptions.push(
      commands.registerTextEditorCommand(
        'miniTypescriptHero.imports.organize',
        () => this.organizeImports()
      )
    );

    // Optional alias for backward compatibility
    this.context.subscriptions.push(
      commands.registerTextEditorCommand(
        'typescriptHero.imports.organize',
        () => this.organizeImports()
      )
    );

    // Organize on save
    this.context.subscriptions.push(
      workspace.onWillSaveTextDocument(event => {
        if (this.config.imports.organizeOnSave(event.document.uri)) {
          event.waitUntil(this.organizeImportsForDocument(event.document));
        }
      })
    );
  }

  private async organizeImports(): Promise<void> { ... }
  private async organizeImportsForDocument(doc: TextDocument): Promise<TextEdit[]> { ... }
}
```

### Phase 6: Update Extension Entry Point ✓ TODO

**File**: `mini-typescript-hero/src/extension.ts`

```typescript
import { ExtensionContext, OutputChannel, window } from 'vscode';
import { Configuration } from './configuration';
import { ImportOrganizer } from './imports/import-organizer';

let outputChannel: OutputChannel;
let organizer: ImportOrganizer;

export function activate(context: ExtensionContext) {
  // Set up logging
  outputChannel = window.createOutputChannel('Mini TypeScript Hero');

  // Set up configuration
  const config = new Configuration();

  // Set up import organizer
  organizer = new ImportOrganizer(context, config, outputChannel);
  organizer.activate();

  outputChannel.appendLine('Mini TypeScript Hero activated');
}

export function deactivate() {
  if (organizer) {
    organizer.dispose();
  }
  if (outputChannel) {
    outputChannel.dispose();
  }
}
```

### Phase 7: Package.json Configuration ✓ TODO

**Update contributions section**:

```json
{
  "activationEvents": [
    "onLanguage:typescript",
    "onLanguage:typescriptreact",
    "onLanguage:javascript",
    "onLanguage:javascriptreact"
  ],
  "contributes": {
    "commands": [
      {
        "command": "miniTypescriptHero.imports.organize",
        "title": "Mini TS Hero: Organize imports (sort and remove unused)"
      }
    ],
    "keybindings": [
      {
        "command": "miniTypescriptHero.imports.organize",
        "key": "ctrl+alt+o",
        "when": "editorTextFocus"
      }
    ],
    "configuration": {
      "title": "Mini TypeScript Hero",
      "properties": {
        "miniTypescriptHero.imports.organizeOnSave": {
          "type": "boolean",
          "default": false,
          "description": "Organize imports automatically on save"
        },
        // ... all other settings from original
      }
    }
  }
}
```

### Phase 8: Documentation ✓ TODO

**Files to create/update**:

1. ✓ `mini-typescript-hero/README.md`
   - Feature description
   - Installation instructions
   - Usage (command palette, keybinding, on-save)
   - Configuration options with examples
   - Import grouping examples
   - Credits to original author
   - Link to original TypeScript Hero

2. ✓ `mini-typescript-hero/CHANGELOG.md`
   - Version 1.0.0: Initial release (forked from TypeScript Hero)

3. ✓ `mini-typescript-hero/LICENSE`
   - MIT License
   - Copyright (c) 2025 Angular.Schule (by Johannes Hoppe)
   - Original work by Christoph Bühler

### Phase 9: Testing & Verification ✓ TODO

**Manual Testing Checklist**:

1. ✓ Extension loads without errors
2. ✓ Command appears in Command Palette
3. ✓ Keybinding works (Ctrl+Alt+O)
4. ✓ Organize imports works on TypeScript file
5. ✓ Organize imports works on JavaScript file
6. ✓ Organize imports works on TSX file
7. ✓ Organize imports works on JSX file
8. ✓ Unused imports are removed
9. ✓ Imports are sorted correctly
10. ✓ Import grouping works (Plains → Modules → Workspace)
11. ✓ Custom regex groups work
12. ✓ Quote style configuration works
13. ✓ Semicolon configuration works
14. ✓ Space in braces configuration works
15. ✓ Multiline threshold works
16. ✓ Trailing comma configuration works
17. ✓ Remove trailing /index works
18. ✓ Ignored imports are not removed
19. ✓ Organize on save works when enabled
20. ✓ Organize on save respects when disabled
21. ✓ Configuration changes apply immediately
22. ✓ Works in multi-root workspace

**Test Files to Create**:
- Create `test-files/` directory with sample TS/JS files for manual testing
- Include files with various import styles and unused imports

### Phase 10: Repository Migration ✓ TODO

**Steps to replace repository content**:

1. ✓ Verify everything works in `mini-typescript-hero/` folder
2. ✓ Build extension: `npm run compile` (or `npm run package` for .vsix)
3. ✓ Test .vsix installation in clean VSCode
4. ✓ Create backup branch: `git checkout -b backup-original`
5. ✓ Return to main branch: `git checkout main`
6. ✓ Remove old content (keep .git, .gitignore, CLAUDE.md):
   ```bash
   # Keep these
   git mv CLAUDE.md CLAUDE_OLD.md

   # Remove old files
   rm -rf src test config node_modules out etc
   rm package.json package-lock.json tsconfig.json tslint.json

   # Move new content
   mv mini-typescript-hero/* .
   mv mini-typescript-hero/.* . 2>/dev/null || true
   rmdir mini-typescript-hero

   # Update CLAUDE.md
   mv CLAUDE_OLD.md CLAUDE_ORIGINAL.md
   # Create new CLAUDE.md for new extension
   ```

7. ✓ Update root README.md
8. ✓ Commit and push:
   ```bash
   git add .
   git commit -m "feat: rewrite as mini-typescript-hero with modern stack"
   git push
   ```

### Phase 11: Publishing ✓ TODO

**Prerequisites**:
1. ✓ Have vsce installed: `npm install -g @vscode/vsce`
2. ✓ Have publisher token for angular-schule
3. ✓ Test packaged extension: `vsce package`
4. ✓ Verify .vsix installs and works

**Publish**:
```bash
vsce publish
```

**Post-publish**:
1. ✓ Create GitHub release with .vsix attached
2. ✓ Update marketplace page with screenshots
3. ✓ Share on social media / Angular.Schule website

## Optional Enhancements (Future)

### Migration Helper
- Detect old `typescriptHero.imports.*` settings
- Show notification to migrate
- Provide "Migrate Settings" command
- Copy settings to new namespace

### Additional Features
- Add CodeAction provider for "Organize imports" quick fix
- Add status bar item showing import count
- Add command to organize imports in entire workspace
- Add telemetry (opt-in) to understand usage patterns

## Testing Strategy

### Manual Testing (Priority)
Focus on manual testing with real-world TypeScript/JavaScript projects.

### Unit Tests (Optional)
If time permits, add tests for:
- Import grouping logic
- Import parsing
- Unused import detection

Use VSCode's extension testing framework:
- `test/` directory with test files
- Use `@vscode/test-electron` for integration tests

## Success Criteria

✅ Extension installs without errors
✅ All import organization features work correctly
✅ All configuration options work as expected
✅ Performance is acceptable (< 1 second for typical files)
✅ No console errors or warnings
✅ Works with TypeScript, JavaScript, TSX, JSX
✅ Works in single and multi-root workspaces
✅ Published to VSCode marketplace
✅ Documentation is clear and complete

## Timeline Estimate

- Phase 1: Scaffolding - 30 minutes
- Phase 2: Configuration - 1 hour
- Phase 3: Import Grouping - 2 hours
- Phase 4: ImportManager (ts-morph) - 4 hours (most complex)
- Phase 5: ImportOrganizer - 1 hour
- Phase 6: Extension entry - 30 minutes
- Phase 7: Package.json - 1 hour
- Phase 8: Documentation - 1 hour
- Phase 9: Testing - 2 hours
- Phase 10: Migration - 1 hour
- Phase 11: Publishing - 1 hour

**Total: ~15 hours** (spread across multiple sessions)

## Notes for Claude in Future Sessions

1. Always check this file first when resuming work
2. Update checkmarks (✓) as tasks are completed
3. Document any deviations from plan in "Deviations" section below
4. Keep this file updated with progress

## Deviations from Original Plan

_(Document any changes to the plan here)_

---

**Last Updated**: 2025-10-03
**Status**: Ready to start Phase 1
