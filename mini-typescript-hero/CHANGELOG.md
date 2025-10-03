# Changelog

## [1.0.0] - 2025-10-03

### Added

- **Initial release** of Mini TypeScript Hero
- Organize imports command (`Ctrl+Alt+O` / `Cmd+Alt+O`)
- Automatic removal of unused imports
- Intelligent import sorting (by module path or first specifier)
- Configurable import grouping (Plains, Modules, Workspace, Regex patterns)
- Organize on save functionality (optional)
- Support for TypeScript, JavaScript, TSX, and JSX files
- Comprehensive configuration options:
  - Quote style (single/double)
  - Semicolons (on/off)
  - Space in braces
  - Multiline threshold
  - Trailing comma in multiline imports
  - Remove trailing /index from paths
  - Ignored imports (never removed)
  - Disable sorting option
  - Disable removal option
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
- VSCode engine 1.85.0+

[1.0.0]: https://github.com/angular-schule/mini-typescript-hero/releases/tag/v1.0.0
