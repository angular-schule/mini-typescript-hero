# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript Hero is a VSCode extension that provides import organization and management for TypeScript/JavaScript files. The extension automatically sorts imports, removes unused imports, and provides configurable grouping.

## Commands

### Build & Development
```bash
npm run build          # Clean, compile TypeScript (production build)
npm run develop        # Clean, compile TypeScript (development build with tests)
npm run clean          # Remove ./out and ./coverage directories
npm run lint           # Run TSLint on source files
npm run test           # Note: Test command is echoed but not executed
```

### Installation
```bash
npm install            # Install dependencies and run postinstall (VSCode test setup)
```

## Architecture

### Dependency Injection (InversifyJS)
The extension uses InversifyJS for dependency injection. The IoC container is configured in `src/ioc.ts`:
- **Entry point**: `TypescriptHero` (singleton)
- **Activatables**: Components that implement setup/start/stop/dispose lifecycle (e.g., `ImportOrganizer`)
- **Providers**: `ImportManagerProvider` creates `ImportManager` instances for documents
- **Services**: `TypescriptParser`, `TypescriptCodeGenerator`, `Configuration`, `Logger`

IoC symbols are defined in `src/ioc-symbols.ts`.

### Extension Lifecycle
1. **Activation** (`src/extension.ts`): Binds `ExtensionContext` to IoC, retrieves `TypescriptHero`, calls `setup()` then `start()`
2. **TypescriptHero** (`src/typescript-hero.ts`): Coordinates activatables and extends code generator with custom import group generators
3. **Deactivation**: Calls `stop()` and `dispose()` on all activatables

### Import Management System

#### ImportOrganizer (`src/imports/import-organizer.ts`)
- Registers command: `typescriptHero.imports.organize` (Ctrl+Alt+O)
- Implements organize-on-save if configured
- Uses `ImportManagerProvider` to create `ImportManager` for documents

#### ImportManager (`src/imports/import-manager.ts`)
Core class managing imports for a document:
- **organizeImports()**: Removes unused imports, sorts remaining imports, applies grouping
- **addDeclarationImport()**: Adds new import declarations
- **commit()**: Applies changes to the document via TextEdit
- **calculateTextEdits()**: Computes the TextEdit operations needed

#### Import Grouping (`src/imports/import-grouping/`)
Configurable import organization into groups:
- **KeywordImportGroup**: Predefined groups (Plains, Modules, Workspace)
- **RegexImportGroup**: Custom regex-based groups
- **RemainImportGroup**: Catch-all for ungrouped imports
- **ImportGroupSettingParser**: Parses VSCode settings to create import groups

Default grouping: Plains → Modules → Workspace → Remaining

### Configuration (`src/configuration/`)
Configuration wrapper around VSCode workspace settings:
- All settings under `typescriptHero` namespace
- Import settings: quote style, semicolons, multiline thresholds, grouping, organize-on-save
- Accessed per-resource (URI) to support workspace folders

### TypeScript Parsing
Uses `typescript-parser` library (external):
- Parses documents to AST (`File` with imports/declarations/usages)
- Generates code from AST using `TypescriptCodeGenerator`
- Custom generators registered for import groups in `TypescriptHero.extendCodeGenerator()`

## Testing

Tests are in `test/` directory, mirroring `src/` structure. The test runner setup is in `test/index.ts` and `test/setup.ts`.

## Key Extension Points

When modifying import organization behavior:
1. **Import detection/removal logic**: `ImportManager.organizeImports()` in `src/imports/import-manager.ts`
2. **Grouping logic**: Import group classes in `src/imports/import-grouping/`
3. **Configuration options**: `src/configuration/imports-config.ts` and `package.json` contributes.configuration
4. **Code generation**: Custom generators in `TypescriptHero.extendCodeGenerator()`
