# Changelog

## [4.0.0-rc.0]

**Initial release** of Mini TypeScript Hero

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
- Modern implementation using ts-morph (v27)
- Built with esbuild for optimal performance

### Notes

This extension is a modernized extraction of the "Organize Imports" feature from the original [TypeScript Hero](https://github.com/buehler/typescript-hero) extension by Christoph Bühler. TypeScript Hero is no longer actively maintained, so we've rescued this valuable feature with a modern 2025 technology stack.

**Technology improvements over original:**
- Replaced deprecated `typescript-parser` with modern `ts-morph` v27
- Simplified architecture (removed InversifyJS DI container)
- Native VSCode OutputChannel logging (replaced winston)
- Modern esbuild bundling (replaced tsc)
- TypeScript 5.7+ with strict mode
- VSCode engine 1.104.0+ (required for modern VS Code APIs and stability improvements)
