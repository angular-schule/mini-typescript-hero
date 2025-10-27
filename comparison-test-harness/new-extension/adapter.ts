/**
 * Adapter for Mini TypeScript Hero (New Extension)
 *
 * This adapter provides a standalone function interface to the new extension.
 * It uses the REAL production code from ../../src/ with mocked VSCode dependencies.
 *
 * APPROACH:
 * - Import actual ImportManager from ../../src/imports/import-manager
 * - Use mock implementations of VSCode types (same pattern as existing tests)
 * - Reference real code via relative paths (no copying!)
 */

import { Uri, TextEdit, TextDocument, OutputChannel, workspace, WorkspaceEdit } from 'vscode';
import { ImportManager } from '../../src/imports/import-manager';
import { ImportsConfig } from '../../src/configuration';
import { ImportGroup, ImportGroupSettingParser, RemainImportGroup } from '../../src/imports/import-grouping';
import { createTempDocument, deleteTempDocument } from '../../src/test/test-helpers';

/**
 * Mock OutputChannel (same as in existing tests)
 */
class MockOutputChannel implements OutputChannel {
  name = 'Test';
  private lines: string[] = [];

  append(value: string): void {
    this.lines.push(value);
  }

  appendLine(value: string): void {
    this.lines.push(value + '\n');
  }

  replace(value: string): void {
    this.lines = [value];
  }

  clear(): void {
    this.lines = [];
  }

  show(): void {}
  hide(): void {}
  dispose(): void {}

  getOutput(): string {
    return this.lines.join('');
  }
}

/**
 * Mock ImportsConfig (same as in existing tests)
 */
class MockImportsConfig extends ImportsConfig {
  private mockConfig: Map<string, any> = new Map();

  setConfig(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    // Config MUST be provided by tests (no defaults in adapter)
    const value = this.mockConfig.get('insertSpaceBeforeAndAfterImportBraces');
    if (value === undefined) {throw new Error('insertSpaceBeforeAndAfterImportBraces must be explicitly configured in tests');}
    return value;
  }

  insertSemicolons(_resource: Uri): boolean {
    const value = this.mockConfig.get('insertSemicolons');
    if (value === undefined) {throw new Error('insertSemicolons must be explicitly configured in tests');}
    return value;
  }

  removeTrailingIndex(_resource: Uri): boolean {
    const value = this.mockConfig.get('removeTrailingIndex');
    if (value === undefined) {throw new Error('removeTrailingIndex must be explicitly configured in tests');}
    return value;
  }

  stringQuoteStyle(_resource: Uri): '"' | '\'' {
    const value = this.mockConfig.get('stringQuoteStyle');
    if (value === undefined) {throw new Error('stringQuoteStyle must be explicitly configured in tests');}
    return value;
  }

  multiLineWrapThreshold(_resource: Uri): number {
    const value = this.mockConfig.get('multiLineWrapThreshold');
    if (value === undefined) {throw new Error('multiLineWrapThreshold must be explicitly configured in tests');}
    return value;
  }

  multiLineTrailingComma(_resource: Uri): boolean {
    const value = this.mockConfig.get('multiLineTrailingComma');
    if (value === undefined) {throw new Error('multiLineTrailingComma must be explicitly configured in tests');}
    return value;
  }

  disableImportRemovalOnOrganize(_resource: Uri): boolean {
    const value = this.mockConfig.get('disableImportRemovalOnOrganize');
    if (value === undefined) {throw new Error('disableImportRemovalOnOrganize must be explicitly configured in tests');}
    return value;
  }

  mergeImportsFromSameModule(_resource: Uri): boolean {
    const value = this.mockConfig.get('mergeImportsFromSameModule');
    if (value === undefined) {throw new Error('mergeImportsFromSameModule must be explicitly configured in tests');}
    return value;
  }

  disableImportsSorting(_resource: Uri): boolean {
    const value = this.mockConfig.get('disableImportsSorting');
    if (value === undefined) {throw new Error('disableImportsSorting must be explicitly configured in tests');}
    return value;
  }

  organizeOnSave(_resource: Uri): boolean {
    const value = this.mockConfig.get('organizeOnSave');
    if (value === undefined) {throw new Error('organizeOnSave must be explicitly configured in tests');}
    return value;
  }

  organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    const value = this.mockConfig.get('organizeSortsByFirstSpecifier');
    if (value === undefined) {throw new Error('organizeSortsByFirstSpecifier must be explicitly configured in tests');}
    return value;
  }

  ignoredFromRemoval(_resource: Uri): string[] {
    const value = this.mockConfig.get('ignoredFromRemoval');
    if (value === undefined) {throw new Error('ignoredFromRemoval must be explicitly configured in tests');}
    return value;
  }

  legacyMode(_resource: Uri): boolean {
    const value = this.mockConfig.get('legacyMode');
    if (value === undefined) {throw new Error('legacyMode must be explicitly configured in tests');}
    return value;
  }

  blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' {
    // Check legacy mode first
    if (this.legacyMode(_resource)) {
      return 'preserve'; // Old extension behavior
    }

    const value = this.mockConfig.get('blankLinesAfterImports');
    if (value === undefined) {throw new Error('blankLinesAfterImports must be explicitly configured in tests');}
    return value;
  }

  legacyWithinGroupSorting(_resource: Uri): boolean {
    // Always controlled by legacyMode - not separately configurable
    return this.legacyMode(_resource);
  }

  grouping(_resource: Uri): ImportGroup[] {
    const groupSettings = this.mockConfig.get('grouping') ?? ['Plains', 'Modules', 'Workspace'];
    let importGroups: ImportGroup[] = [];

    try {
      importGroups = groupSettings.map((setting: any) => ImportGroupSettingParser.parseSetting(setting));
    } catch (e) {
      // Fall back to default on invalid config
      importGroups = ImportGroupSettingParser.default;
    }

    // Ensure RemainImportGroup is always present
    if (!importGroups.some(i => i instanceof RemainImportGroup)) {
      importGroups.push(new RemainImportGroup());
    }

    return importGroups;
  }
}

/**
 * Default configuration that matches the old TypeScript Hero extension's defaults
 *
 * Simply enable legacyMode: true to replicate ALL old behaviors:
 * - Within-group sorting bug (always sorts by library name)
 * - Blank line preservation (keeps existing blank lines)
 * - Wrong merge order (merges BEFORE removeTrailingIndex)
 */
const DEFAULT_CONFIG = {
  insertSpaceBeforeAndAfterImportBraces: true,
  insertSemicolons: true,
  removeTrailingIndex: true,
  stringQuoteStyle: '\'',
  multiLineWrapThreshold: 125,
  multiLineTrailingComma: true,
  disableImportRemovalOnOrganize: false,
  mergeImportsFromSameModule: true,  // OLD extension DOES merge, but BEFORE removeTrailingIndex
  disableImportsSorting: false,
  organizeOnSave: false,
  organizeSortsByFirstSpecifier: false,
  ignoredFromRemoval: ['react'],
  legacyMode: true,  // 🎯 SINGLE FLAG to replicate ALL old behaviors!
  blankLinesAfterImports: 'one',  // Ignored when legacyMode=true
  grouping: ['Plains', 'Modules', 'Workspace'],
};

/**
 * Organize imports using the NEW Mini TypeScript Hero extension
 *
 * This uses the REAL production code with REAL VSCode APIs.
 *
 * Config options can be provided to override the defaults.
 * The defaults match the old TypeScript Hero extension's behavior.
 */
export async function organizeImportsNew(
  sourceCode: string,
  configOverrides: any = {}
): Promise<string> {
  // Create REAL temp file (NOT mocked TextDocument!)
  const doc = await createTempDocument(sourceCode);

  try {
    const config = new MockImportsConfig();
    const logger = new MockOutputChannel();

    // Merge defaults with overrides
    const finalConfig = { ...DEFAULT_CONFIG, ...configOverrides };

    // Apply all config values
    Object.keys(finalConfig).forEach(key => {
      config.setConfig(key, finalConfig[key]);
    });

    const manager = new ImportManager(doc, config);
    const edits = manager.organizeImports();

    // If no edits (empty file or no imports), return original content
    if (!edits || edits.length === 0) {
      return doc.getText();
    }

    // Use REAL workspace.applyEdit (this is the key!)
    const workspaceEdit = new WorkspaceEdit();
    workspaceEdit.set(doc.uri, edits);
    const success = await workspace.applyEdit(workspaceEdit);

    if (!success) {
      throw new Error('Failed to apply edits');
    }

    // Get result from REAL document
    return doc.getText();
  } finally {
    // Clean up temp file
    await deleteTempDocument(doc);
  }
}
