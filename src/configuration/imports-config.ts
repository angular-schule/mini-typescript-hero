import { Uri, workspace } from 'vscode';

import { ImportGroup, ImportGroupSetting, ImportGroupSettingParser, RemainImportGroup } from '../imports/import-grouping';

const sectionKey = 'miniTypescriptHero.imports';

export class ImportsConfig {
  public insertSpaceBeforeAndAfterImportBraces(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('insertSpaceBeforeAndAfterImportBraces', true);
  }

  public insertSemicolons(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('insertSemicolons', true);
  }

  public removeTrailingIndex(resource: Uri): boolean {
    return workspace
      .getConfiguration(sectionKey, resource)
      .get('removeTrailingIndex', true);
  }

  public stringQuoteStyle(resource: Uri): '"' | '\'' {
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
   *
   * When false (default), uses modern best practices:
   * - Sorting: Respects all sorting configs correctly
   * - Blank lines: Exactly 1 blank line (Google/ESLint/Prettier standard)
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
