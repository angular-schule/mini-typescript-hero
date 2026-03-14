# Changelog

All notable changes to "Mini TypeScript Hero" will be documented in this file.

This project continues the legacy of [TypeScript Hero](https://github.com/buehler/typescript-hero) by Christoph Bühler. Version history prior to v4.0.0 is from the original extension.

---

## Mini TypeScript Hero

### [4.0.0]

**Modernization release** - rebuilding Mini TypeScript Hero with a modern technology stack.

- Organize imports command (`Ctrl+Alt+O` / `Cmd+Alt+O`)
- Automatic removal of unused imports
- Intelligent import sorting (by module path or first specifier)
- Configurable import grouping (Plains, Modules, Workspace, Regex patterns)
- Organize on save functionality (optional)
- **Automatic settings migration** from original TypeScript Hero extension (runs once on first startup)
- Support for TypeScript, JavaScript, TSX, and JSX files
- Comprehensive configuration options:
  - Quote style (single/double)
  - Semicolons (on/off)
  - Space in braces
  - Multiline threshold
  - Trailing comma in multiline imports
  - Remove trailing /index from paths
  - Ignored imports (never removed)
  - Exclude patterns (glob patterns to skip files)
  - Disable sorting option
  - Disable removal option
- **Configuration Priority Order** - Respects VS Code settings (which may come from `.editorconfig` via the EditorConfig extension) before extension settings
- **Commands:**
  - `Mini TS Hero: Organize imports` - Sort and remove unused imports in current file
  - `Mini TS Hero: Organize imports in workspace` - Organize all files in workspace
  - `Mini TS Hero: Organize imports in folder` - Organize all files in selected folder (context menu)
  - `Mini TS Hero: Check for configuration conflicts` - Detect if multiple tools would organize imports
  - `Mini TS Hero: Toggle legacy mode` - Switch between modern and legacy behavior
- Modern implementation using ts-morph
- Built with esbuild for optimal performance

#### Notes

[TypeScript Hero](https://github.com/buehler/typescript-hero) by Christoph Bühler was well-known for its import organizer, but it went unmaintained. I picked it up, modernized everything, and added new features.

**Technology improvements:**
- Replaced deprecated `typescript-parser` with modern ts-morph
- Replaced InversifyJS DI container with direct instantiation
- Native VSCode OutputChannel logging (replaced winston)
- Modern esbuild bundling
- Strict TypeScript
- Modern VS Code APIs

---

## TypeScript Hero (Original Extension)

The following changelog documents the original TypeScript Hero extension by Christoph Bühler. Mini TypeScript Hero continues from v3.0.0.

### [3.0.0] - 2018-10-10

**Focused release**: The original author streamlined TypeScript Hero to focus solely on import organization, as VS Code's built-in features now handle the rest.

### [2.3.2] - 2018-04-04

#### Fixed
- Bug fix for parser

### [2.3.1] - 2018-03-06

#### Fixed
- Bug fix for parser

### [2.3.0] - 2018-03-06

#### Added
- Code outline icons
- Code completion improvements

#### Fixed
- Exported elements handling
- Shebang handling in files

### [2.2.0] - 2018-02-08

#### Added
- Merge imports from same package (via libraryAlreadyImported check)

#### Fixed
- Logging improvements

### [2.1.1] - 2018-01-26

#### Fixed
- fs-extra package handling
- Logger improvements

### [2.1.0] - 2018-01-26

#### Added
- Add imports command
- Import under cursor command

### [2.0.0] - 2018-01-18

**BREAKING CHANGES**: Major refactoring release

#### Changed
- Major internal refactoring

#### Removed
- Auto-import feature (recommended using VS Code built-in)

### [1.8.0] - 2017-12-11

#### Added
- Regex groups are processed after keyword groups for proper precedence
- First-specifier ordering option (`organizeSortsByFirstSpecifier`)

### [1.7.0] - 2017-10-31

#### Added
- Multi-root workspace support (#325)
- Improved logging and error handling (#326)

#### Fixed
- Default exports and indexer properties not removed when used (#328)
- File handler logging level
- TypeScript parsing improvements (#327, #311)

### [1.6.0] - 2017-10-17

#### Added
- Document outline: Show getters and setters (#314)
- Setting to disable removal of unused imports (`disableImportRemovalOnOrganize`) (#315)
- Default value for `organizeOnSave` changed to false

#### Changed
- Upgraded TypeScript parser with default import generation improvements (#313, #227, #305)

### [1.5.0] - 2017-09-19

#### Added
- Organize on save via workspace hook (#291)
- Respect file header comments and JSDoc (#296)
- Setting to disable prompting for aliases and default names (#298)

#### Fixed
- Disable organize command when not in a code file (#295)
- Don't add empty newline on organize imports (#297)
- Fixed TypeScript version to 2.4.2 (#299, #292)

### [1.4.0] - 2017-08-11

#### Added
- JavaScript mode to support JavaScript files for importing (#263)

#### Fixed
- Imports with no specifiers generated correctly (#264)
- TSX files are watched for indexing (#255)

### [1.3.0] - 2017-07-15

#### Added
- Long-running task for indexing (#247, #246)

#### Fixed
- Code completion text edits calculated in later stage (#248, #231)
- Duplicate imports not generated anymore (#253, #226, #175)
- Ignore imports to remove configuration (#252, #250)

### [1.2.0] - 2017-07-12

#### Added
- Code outline window removal when disabled (#236)

#### Changed
- Parser package changed with refactoring (#237)

#### Fixed
- Implement interface/abstract adds optionals (#233)
- Missing icons in code outline (#238)

### [1.1.0] - 2017-06-20

#### Added
- Code outline view in Explorer with jump-to-code on click

#### Fixed
- Boolean settings returned correctly (#222)
- Code outline jumps to selected element (#219)
- References in namespaces/modules recognized and not removed (#214)
- Complex regex now possible in import groups (e.g., `/@angular|regex/core/?.*/`) (#218)

### [1.0.0] - 2017-06-15

**First stable release!**

#### Added
- Import grouping with sorting (Plains, Modules, Workspace) (#102)
- Trailing comma option for multiline imports (#100)

#### Changed
- Multiline import threshold default changed to 125 characters

#### Removed
- `newImportLocation` setting (obsolete with import grouping) (#102)

#### Fixed
- Default imports removed regardless of usage (#149)
- Generic interfaces and abstract classes for implement elements (#158)
- Deprecation warnings during testing

### [0.13.0] - 2017-06-01

**Big refactoring release (#143)**

#### Added
- Setting `disableImportsSorting` to disable sorting during organize

#### Changed
- Setting `pathStringDelimiter` renamed to `stringQuoteStyle`
- Extension split into extension part and language-server part (performance improvement)
- Changed linting to airbnb style

#### Fixed
- Imports from newly added TSX files (#169)
- Imports from modules with index file same name as folder (Angular)
- Files without exports no longer added to index

### [0.12.0] - 2017-01-03

#### Added
- Setting `insertSemicolons` to disable semicolon emit

#### Changed
- Default value of `ignorePatterns` no longer contains node_modules
- Upgraded to TypeScript 2.1.4 (#148)

#### Fixed
- "Flame" error state shown correctly during indexing
- Duplicate declarations filtered (overloads) (#105)
- Only workspace files filtered by exclude pattern (#103)
- Variables sorted to top to reduce auto-import for `console` (#99)
- Extension no longer crashes with prototype methods (#79)

### [0.11.0] - 2016-12-03

#### Added
- Class manager for modifying classes in documents (#127)
- Light-bulb feature support in TSX files (#128)
- CodeFix for implementing missing methods/properties from interfaces and abstract classes (#114)

### [0.10.0] - 2016-11-12

#### Added
- JSDoc support
- Code action provider (light bulb) for importing missing imports (#11)
- Add all missing imports command (#106)

#### Changed
- Documents managed by controller that calculates edits before committing

#### Fixed
- Extension and completion provider initialized for TSX files (#112)
- Template literal strings (backticks) considered in autocompletion

### [0.9.0] - 2016-10-14

#### Added
- TypeScript symbols know their positions
- Statusbar item for debug restarter state (#85)
- Default export import suggests a name (#71)
- Support for `@types` style definitions (TypeScript 2.0) (#77)

#### Changed
- Upgraded to TypeScript 2.0 (#88)
- Default value of `insertSpaceBeforeAndAfterImportBraces` is now `true`

#### Fixed
- New imports placed below `"use strict"` (#73)
- Multiline imports respect `editor.tabSize` (#74)
- Index reloaded when ignore patterns change (#75)
- Autocomplete filters local file usages (#69)
- Default exports don't break extension (#79)
- Node paths correctly split (#76)
- Exports from root index.ts not empty

### [0.8.0] - 2016-09-24

#### Added
- Multiline import support (#60)
- Setting for multiline threshold
- Configurable new import location (top of file or cursor position) (#41)
- Alias prompt when specifier already present (#44)

#### Fixed
- Autocomplete doesn't suggest already imported items (#64)
- Autocomplete doesn't suggest items from own file (#61)
- No duplicates with multiline imports (#43)
- Multiline imports work with multiple imports
- Autocomplete doesn't add other classes from file

### [0.7.0] - 2016-09-15

#### Added
- More tests (#8)
- CodeCompletionProvider with auto-import (#5)
- Support for `*.tsx` files (#42)

#### Changed
- Import under cursor only imports exact matches (#35)
- Own imports (workspace) sorted to top (#37)
- Updated inversify to v2

#### Fixed
- Forward slashes used on Windows (#19)
- `export xxx as yyy` correctly uses alias (#36)
- Build directories ignored by default (#48)
- Substructures import parent index.ts correctly (#49)

### [0.6.0] - 2016-09-09

#### Added
- Command to add import from symbol under cursor (#22)

#### Changed
- Complete indexing/parsing engine rewritten
- Adding import doesn't auto-organize afterward (#22, #23)

#### Fixed
- Exports recursively merged (#25)
- Imports added with forward slashes (#19)
- Imports not vanishing with PropertyAssignments (#27)
- Imports not vanishing on organize (#30)

### [0.5.0] - 2016-08-08

#### Added
- Output channel for logging with configurable verbosity
- Commands added to command GUI

#### Fixed
- Tests on Travis CI
- Typos

### [0.4.0] - 2016-08-05

**Initial public release**

#### Added
- Organize imports
- Add new imports
- Debug restarter feature
- Command palette (`Ctrl+Alt+G`)

#### Fixed
- Various bugs in AST parsing

---

## Links

- [GitHub Repository](https://github.com/angular-schule/mini-typescript-hero)
- [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero)
- [Original TypeScript Hero](https://github.com/buehler/typescript-hero)
