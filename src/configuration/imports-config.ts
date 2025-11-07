import { Uri, workspace, extensions } from 'vscode';
import * as editorconfig from 'editorconfig';

import { ImportGroup, ImportGroupSetting, ImportGroupSettingParser, RemainImportGroup } from '../imports/import-grouping';

const sectionKey = 'miniTypescriptHero.imports';
const EDITORCONFIG_EXTENSION_ID = 'EditorConfig.EditorConfig';

export class ImportsConfig {
  /**
   * Check if the official EditorConfig extension is installed and active.
   * We only respect .editorconfig settings if this extension is present.
   *
   * Protected (not private) to allow mocking in tests.
   */
  protected isEditorConfigActive(): boolean {
    const extension = extensions.getExtension(EDITORCONFIG_EXTENSION_ID);
    return extension !== undefined;
  }

  public insertSpaceBeforeAndAfterImportBraces(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('insertSpaceBeforeAndAfterImportBraces', true);
  }

  /**
   * Get semicolon preference with priority order:
   * 1. .editorconfig (highest - team standard)
   * 2. VSCode TypeScript/JavaScript preferences
   * 3. Our extension settings (lowest - fallback)
   */
  public async insertSemicolons(resource: Uri): Promise<boolean> {
    // Priority 1: .editorconfig
    // Note: EditorConfig doesn't have a direct semicolon setting
    // But we check for consistency with other formatters

    // Priority 2: VSCode TypeScript/JavaScript format settings
    const languageId = resource.path.endsWith('.tsx') || resource.path.endsWith('.ts') ? 'typescript' : 'javascript';
    const formatSemicolons = workspace
      .getConfiguration(`${languageId}.format`, resource)
      .get<'ignore' | 'insert' | 'remove'>('semicolons');

    if (formatSemicolons === 'insert') {return true;}
    if (formatSemicolons === 'remove') {return false;}

    // Priority 3: Our setting (fallback)
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('insertSemicolons', true);
  }

  public removeTrailingIndex(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('removeTrailingIndex', true);
  }

  /**
   * Get quote style preference with priority order:
   * 1. .editorconfig (highest - team standard, ONLY if EditorConfig extension is active)
   * 2. VSCode TypeScript/JavaScript preferences
   * 3. Our extension settings (lowest - fallback)
   */
  public async stringQuoteStyle(resource: Uri): Promise<'"' | '\''> {
    // Priority 1: .editorconfig (HIGHEST - team standard)
    // Only check if EditorConfig extension is installed and active
    if (this.isEditorConfigActive()) {
      try {
        const config = await editorconfig.parse(resource.fsPath);
        if (config.quote_type === 'single') {return `'`;}
        if (config.quote_type === 'double') {return `"`;}
      } catch (error) {
        // Ignore errors (no .editorconfig file, parse error, etc.)
      }
    }

    // Priority 2: VSCode TypeScript/JavaScript preferences
    const languageId = resource.path.endsWith('.tsx') || resource.path.endsWith('.ts') ? 'typescript' : 'javascript';
    const quoteStyle = workspace
      .getConfiguration(`${languageId}.preferences`, resource)
      .get<'single' | 'double' | 'auto'>('quoteStyle');

    if (quoteStyle === 'single') {return `'`;}
    if (quoteStyle === 'double') {return `"`;}

    // Priority 3: Our setting (LOWEST - fallback only)
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('stringQuoteStyle', `'`);
  }

  public multiLineWrapThreshold(resource: Uri): number {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('multiLineWrapThreshold', 125);
  }

  public multiLineTrailingComma(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('multiLineTrailingComma', true);
  }

  public disableImportRemovalOnOrganize(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('disableImportRemovalOnOrganize', false);
  }

  public mergeImportsFromSameModule(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('mergeImportsFromSameModule', true);
  }

  public disableImportsSorting(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('disableImportsSorting', false);
  }

  public organizeOnSave(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('organizeOnSave', false);
  }

  public organizeSortsByFirstSpecifier(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('organizeSortsByFirstSpecifier', false);
  }

  public ignoredFromRemoval(resource: Uri): string[] {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('ignoredFromRemoval', ['react']);
  }

  /**
   * Enable full legacy mode for 100% compatibility with old TypeScript Hero extension.
   *
   * When true, enables ALL legacy behaviors:
   * - Within-group sorting: Always sorts by library name (ignores disableImportsSorting/organizeSortsByFirstSpecifier)
   * - Blank lines: Uses 'preserve' mode (keeps existing blank lines from source)
   * - Merge timing: When mergeImportsFromSameModule is true, merges BEFORE removeTrailingIndex (matches old bug where './lib/index' and './lib' stay separate)
   * - Type-only merging: Strips 'import type' keywords and allows merging type-only with value imports (old behavior)
   *
   * When false (default), uses modern best practices:
   * - Sorting: Respects all sorting configs correctly
   * - Blank lines: Exactly 1 blank line (Google/ESLint/Prettier standard)
   * - Merge timing: Removes '/index' FIRST, then merges (so './lib/index' and './lib' DO merge)
   * - Type-only separation: Keeps 'import type' keywords and prevents merging type-only with value imports (TS 3.8+ semantics)
   *
   * Default: false (new users get modern behavior)
   * Migrated users: Automatically set to true for 100% backward compatibility
   */
  public legacyMode(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('legacyMode', false);
  }

  public blankLinesAfterImports(resource: Uri): 'one' | 'two' | 'preserve' {
    // Check legacy mode first
    if (this.legacyMode(resource)) {
      return 'preserve'; // Old extension behavior: keep existing blank lines
    }

    return workspace
      .getConfiguration(sectionKey, resource)
      .get('blankLinesAfterImports', 'one');
  }

  /**
   * Internal: Controls within-group sorting behavior.
   * This is NOT a user-configurable setting - it's controlled by legacyMode.
   */
  public legacyWithinGroupSorting(resource: Uri): boolean {
    // Always controlled by legacyMode flag
    return this.legacyMode(resource);
  }

  public grouping(resource: Uri): ImportGroup[] {
    const groups = workspace
      .getConfiguration(sectionKey, resource)
      .get<ImportGroupSetting[]>('grouping');
    let importGroups: ImportGroup[] = [];

    try {
      if (groups) {
        importGroups = groups.map(g =>
          ImportGroupSettingParser.parseSetting(g),
        );
      } else {
        importGroups = ImportGroupSettingParser.default;
      }
    } catch (e) {
      importGroups = ImportGroupSettingParser.default;
    }
    if (!importGroups.some(i => i instanceof RemainImportGroup)) {
      importGroups.push(new RemainImportGroup());
    }

    return importGroups;
  }
}
