# Migrating from TypeScript Hero

**Good news!** If you're upgrading from the original TypeScript Hero extension, your settings will be automatically migrated on first startup.

## What Gets Migrated

All import-related settings from `typescriptHero.imports.*` are automatically copied to `miniTypescriptHero.imports.*`:

- All formatting settings (quotes, semicolons, spaces, etc.)
- Organize on save preference
- Sorting and removal settings
- Ignored libraries configuration
- Custom import grouping rules

## Migration Behavior

- **Runs once:** Migration happens automatically the first time you activate Mini TypeScript Hero
- **Preserves all levels:** User, workspace, and workspace folder settings are all migrated
- **Safe:** Your original TypeScript Hero settings remain untouched
- **Notification:** You'll see a message confirming how many settings were migrated

## After Migration

Once your settings are migrated, you have two options:

1. **Keep both extensions:** Both extensions can coexist, but you may want to disable one to avoid conflicts
2. **Uninstall TypeScript Hero:** If you only need the import organization feature, you can safely uninstall the original extension

If the old TypeScript Hero extension is still active, you'll see a reminder in the migration notification suggesting you can disable it.

## Legacy Mode

**For migrated users, `legacyMode` is automatically set to `true`** to match the original TypeScript Hero output format as closely as possible.

### What Legacy Mode Does

When enabled, legacy mode matches these old behaviors (including bugs) for maximum backward compatibility:

- **`blankLinesAfterImports`** — Always preserves existing blank lines (ignores configured value)
- **`organizeSortsByFirstSpecifier`** — **SILENTLY IGNORED** (always sorts by library name within groups) ⚠️ Bug replication
- **`disableImportsSorting`** — **SILENTLY IGNORED** (always sorts imports within groups) ⚠️ Bug replication
- **Merge timing** — Merges BEFORE removeTrailingIndex (old bug: `./lib/index` and `./lib` won't merge)
- **Type-only imports** — Strips `import type` keywords (old TS <3.8 behavior)
- **Indentation** — Always uses spaces (ignores `insertSpaces` setting)
- **Crash handling** — Gracefully handles cases that crashed old extension (silent fix)

### Why Match Old Bugs?

Migrated users depend on consistent output format. Any change would create massive diffs across their codebase on first run, breaking trust. Legacy mode provides the closest match possible to the old extension's output, though some edge cases may differ due to the modern parser (ts-morph vs deprecated typescript-parser) and improved comment handling.

### Modern Mode Fixes These Bugs

New users get `legacyMode: false` by default for correct behavior. You can toggle this setting anytime via the command palette or your configuration.

> **⚠️ IMPORTANT**: When `legacyMode: true`, certain config settings are silently ignored (see above). The extension does NOT warn about this - it's intentional for backward compatibility. If you need these settings to work, set `legacyMode: false`.

## Switching to Modern Mode

If you're a migrated user and want to use modern mode:

1. **Review what changes:** Read the legacy mode behaviors above
2. **Set `legacyMode: false`** in your settings
3. **Run organize imports** on a test file to see the difference
4. **Commit the changes** if you're happy with the new output

The differences will be minimal for most projects - mainly:
- More predictable blank line handling
- Better merge timing (./lib/index and ./lib will merge correctly)
- Preserved `import type` syntax for TypeScript 3.8+

## No Old Settings?

If you've never used TypeScript Hero before, the migration simply won't run — no action needed! You'll start with `legacyMode: false` and modern best practices.
