import { Uri, workspace, window } from 'vscode';

import { ImportGroup, ImportGroupSetting, ImportGroupSettingParser, RemainImportGroup } from '../imports/import-grouping';

const sectionKey = 'miniTypescriptHero.imports';

export class ImportsConfig {

  public insertSpaceBeforeAndAfterImportBraces(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('insertSpaceBeforeAndAfterImportBraces', true);
  }

  /**
   * Get semicolon preference with priority order:
   * 1. VSCode TypeScript/JavaScript preferences
   * 2. Our extension settings (fallback)
   */
  public async insertSemicolons(resource: Uri): Promise<boolean> {
    // If user wants strict control, skip VS Code settings
    if (this.useOnlyExtensionSettings(resource)) {
      return workspace
        .getConfiguration(sectionKey, resource)
        .get('insertSemicolons', true);
    }

    // Priority 1: VSCode TypeScript/JavaScript format settings
    const p = resource.path.toLowerCase();
    const isTS = p.endsWith('.ts') || p.endsWith('.tsx') ||
                 p.endsWith('.mts') || p.endsWith('.cts');
    const languageId = isTS ? 'typescript' : 'javascript';

    const formatSemicolons = workspace
      .getConfiguration(`${languageId}.format`, resource)
      .get<'ignore' | 'insert' | 'remove'>('semicolons');

    if (formatSemicolons === 'insert') {return true;}
    if (formatSemicolons === 'remove') {return false;}

    // Priority 2: Our setting (fallback)
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
   * 1. VSCode TypeScript/JavaScript preferences
   * 2. Our extension settings (fallback)
   */
  public async stringQuoteStyle(resource: Uri): Promise<'"' | '\''> {
    // If user wants strict control, skip VS Code settings
    if (this.useOnlyExtensionSettings(resource)) {
      return workspace
        .getConfiguration(sectionKey, resource)
        .get('stringQuoteStyle', `'`);
    }

    // Priority 1: VSCode TypeScript/JavaScript preferences
    const p = resource.path.toLowerCase();
    const isTS = p.endsWith('.ts') || p.endsWith('.tsx') ||
                 p.endsWith('.mts') || p.endsWith('.cts');
    const languageId = isTS ? 'typescript' : 'javascript';

    const quoteStyle = workspace
      .getConfiguration(`${languageId}.preferences`, resource)
      .get<'single' | 'double' | 'auto'>('quoteStyle');

    if (quoteStyle === 'single') {return `'`;}
    if (quoteStyle === 'double') {return `"`;}

    // Priority 2: Our setting (fallback)
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('stringQuoteStyle', `'`);
  }

  /**
   * Get whether to use only extension settings (ignore VS Code settings).
   */
  public useOnlyExtensionSettings(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('useOnlyExtensionSettings', false);
  }

  /**
   * Get indentation string for multiline imports.
   *
   * PRIORITY ORDER (highest to lowest):
   * 1. useOnlyExtensionSettings = true → Use extension config only (ignore VS Code)
   * 2. legacyMode = true → Match old TypeScript Hero exactly (see indentationLegacyMode)
   * 3. Modern mode (default) → Respect VS Code settings with smart defaults
   *
   * Legacy mode behavior: Matches old TypeScript Hero exactly
   * - Always uses spaces (never tabs)
   * - Default: 4 spaces (VS Code default)
   * - Reads window.activeTextEditor.options.tabSize first
   * - Fallback: workspace.getConfiguration('editor').get('tabSize', 4)
   *
   * Modern mode behavior: Enhanced with full control
   * - Respects editor.insertSpaces (supports tabs when false)
   * - Default: 2 spaces (better for TS/JS, only when tabSize not explicitly configured)
   * - Extension config can override via useOnlyExtensionSettings
   *
   * Note: VS Code automatically resolves editor.tabSize from all sources:
   * EditorConfig → workspace folder → workspace → user → built-in default (4)
   * We just read the final resolved value!
   */
  public indentation(resource: Uri): string {
    // Priority 1: Master override - use only extension settings
    if (this.useOnlyExtensionSettings(resource)) {
      return this.indentationFromExtensionConfig(resource);
    }

    // Priority 2: Legacy mode - match old TypeScript Hero exactly
    if (this.legacyMode(resource)) {
      return this.indentationLegacyMode(resource);
    }

    // Priority 3: Modern mode - respect VS Code settings fully
    const editorConfig = workspace.getConfiguration('editor', resource);
    const insertSpaces = editorConfig.get<boolean>('insertSpaces', true);

    // Check if tabSize is explicitly configured (vs just VS Code's built-in default of 4)
    const tabSizeInspect = editorConfig.inspect<number>('tabSize');
    let tabSize: number;

    if (tabSizeInspect && (
      tabSizeInspect.workspaceFolderValue !== undefined ||
      tabSizeInspect.workspaceValue !== undefined ||
      tabSizeInspect.globalValue !== undefined
    )) {
      // User explicitly configured tabSize - respect their value
      tabSize = editorConfig.get<number>('tabSize', 2);
    } else {
      // No explicit configuration - use our modern default of 2 (better for TS/JS)
      tabSize = 2;
    }

    if (insertSpaces === false) {
      return '\t';
    }
    return ' '.repeat(tabSize);
  }

  /**
   * Legacy mode indentation - matches old TypeScript Hero exactly.
   * ALWAYS uses spaces (never tabs), default 4 spaces.
   *
   * Priority order (from old extension source code):
   * 1. window.activeTextEditor.options.tabSize (includes EditorConfig!)
   * 2. workspace.getConfiguration('editor').get('tabSize', 4)
   */
  private indentationLegacyMode(resource: Uri): string {
    // Priority 1: Active editor's resolved tabSize (includes EditorConfig!)
    const editor = window.activeTextEditor;
    if (editor && typeof editor.options.tabSize === 'number') {
      return ' '.repeat(editor.options.tabSize);
    }

    // Priority 2: Workspace editor.tabSize with default 4
    const tabSize = workspace.getConfiguration('editor', resource).get<number>('tabSize', 4);
    return ' '.repeat(tabSize); // Legacy: ALWAYS spaces, never tabs
  }

  /**
   * Get indentation from extension-specific settings only.
   * Used when useOnlyExtensionSettings = true.
   *
   * Reads only from miniTypescriptHero.imports.* settings:
   * - insertSpaces (default: true) → spaces vs tabs
   * - tabSize (default: 2) → number of spaces or tab width
   */
  private indentationFromExtensionConfig(resource: Uri): string {
    const config = workspace.getConfiguration(sectionKey, resource);
    const insertSpaces = config.get<boolean>('insertSpaces', true);
    const tabSize = config.get<number>('tabSize', 2);

    if (insertSpaces === false) {
      return '\t';
    }
    return ' '.repeat(tabSize);
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
   * Enable full legacy mode for formatting compatibility with old TypeScript Hero extension.
   *
   * When true, enables old formatting behaviors:
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
   * Migrated users: Automatically set to true for formatting backward compatibility
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
