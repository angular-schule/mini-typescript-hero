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

import { Uri, Position, Range, TextEdit, TextDocument, OutputChannel } from 'vscode';
import { ImportManager } from '../../src/imports/import-manager';
import { ImportsConfig } from '../../src/configuration';
import { ImportGroup, ImportGroupSettingParser, RemainImportGroup } from '../../src/imports/import-grouping';

/**
 * Mock TextDocument (same as in existing tests)
 */
class MockTextDocument implements TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled = false;
  languageId = 'typescript';
  version = 1;
  isDirty = false;
  isClosed = false;
  eol: number;
  encoding: string = 'utf-8';
  lineCount: number;

  constructor(fileName: string, private content: string, eol: number = 1) {
    this.fileName = fileName;
    this.uri = Uri.file(fileName);
    this.eol = eol; // 1 = LF, 2 = CRLF
    this.lineCount = content.split('\n').length;
  }

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  getText(range?: Range): string {
    if (range) {
      const lines = this.content.split('\n');
      const result: string[] = [];
      for (let i = range.start.line; i <= range.end.line; i++) {
        if (i < lines.length) {
          let line = lines[i];
          if (i === range.start.line && i === range.end.line) {
            line = line.substring(range.start.character, range.end.character);
          } else if (i === range.start.line) {
            line = line.substring(range.start.character);
          } else if (i === range.end.line) {
            line = line.substring(0, range.end.character);
          }
          result.push(line);
        }
      }
      return result.join('\n');
    }
    return this.content;
  }

  lineAt(position: number | Position): any {
    const lineNumber = typeof position === 'number' ? position : position.line;
    const lines = this.content.split('\n');
    const text = lines[lineNumber] || '';
    return {
      lineNumber,
      text,
      range: new Range(lineNumber, 0, lineNumber, text.length),
      rangeIncludingLineBreak: new Range(lineNumber, 0, lineNumber + 1, 0),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0
    };
  }

  offsetAt(position: Position): number {
    const lines = this.content.split('\n');
    let offset = 0;
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    offset += position.character;
    return offset;
  }

  positionAt(offset: number): Position {
    const lines = this.content.split('\n');
    let currentOffset = 0;
    for (let line = 0; line < lines.length; line++) {
      const lineLength = lines[line].length + 1; // +1 for newline
      if (currentOffset + lineLength > offset) {
        return new Position(line, offset - currentOffset);
      }
      currentOffset += lineLength;
    }
    return new Position(lines.length - 1, lines[lines.length - 1].length);
  }

  getWordRangeAtPosition(_position: Position): Range | undefined {
    return undefined;
  }

  validateRange(range: Range): Range {
    return range;
  }

  validatePosition(position: Position): Position {
    return position;
  }
}

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
    if (value === undefined) throw new Error('insertSpaceBeforeAndAfterImportBraces must be explicitly configured in tests');
    return value;
  }

  insertSemicolons(_resource: Uri): boolean {
    const value = this.mockConfig.get('insertSemicolons');
    if (value === undefined) throw new Error('insertSemicolons must be explicitly configured in tests');
    return value;
  }

  removeTrailingIndex(_resource: Uri): boolean {
    const value = this.mockConfig.get('removeTrailingIndex');
    if (value === undefined) throw new Error('removeTrailingIndex must be explicitly configured in tests');
    return value;
  }

  stringQuoteStyle(_resource: Uri): '"' | '\'' {
    const value = this.mockConfig.get('stringQuoteStyle');
    if (value === undefined) throw new Error('stringQuoteStyle must be explicitly configured in tests');
    return value;
  }

  multiLineWrapThreshold(_resource: Uri): number {
    const value = this.mockConfig.get('multiLineWrapThreshold');
    if (value === undefined) throw new Error('multiLineWrapThreshold must be explicitly configured in tests');
    return value;
  }

  multiLineTrailingComma(_resource: Uri): boolean {
    const value = this.mockConfig.get('multiLineTrailingComma');
    if (value === undefined) throw new Error('multiLineTrailingComma must be explicitly configured in tests');
    return value;
  }

  disableImportRemovalOnOrganize(_resource: Uri): boolean {
    const value = this.mockConfig.get('disableImportRemovalOnOrganize');
    if (value === undefined) throw new Error('disableImportRemovalOnOrganize must be explicitly configured in tests');
    return value;
  }

  mergeImportsFromSameModule(_resource: Uri): boolean {
    const value = this.mockConfig.get('mergeImportsFromSameModule');
    if (value === undefined) throw new Error('mergeImportsFromSameModule must be explicitly configured in tests');
    return value;
  }

  disableImportsSorting(_resource: Uri): boolean {
    const value = this.mockConfig.get('disableImportsSorting');
    if (value === undefined) throw new Error('disableImportsSorting must be explicitly configured in tests');
    return value;
  }

  organizeOnSave(_resource: Uri): boolean {
    const value = this.mockConfig.get('organizeOnSave');
    if (value === undefined) throw new Error('organizeOnSave must be explicitly configured in tests');
    return value;
  }

  organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    const value = this.mockConfig.get('organizeSortsByFirstSpecifier');
    if (value === undefined) throw new Error('organizeSortsByFirstSpecifier must be explicitly configured in tests');
    return value;
  }

  ignoredFromRemoval(_resource: Uri): string[] {
    const value = this.mockConfig.get('ignoredFromRemoval');
    if (value === undefined) throw new Error('ignoredFromRemoval must be explicitly configured in tests');
    return value;
  }

  blankLinesAfterImports(_resource: Uri): 'one' | 'two' | 'preserve' | 'legacy' {
    const value = this.mockConfig.get('blankLinesAfterImports');
    if (value === undefined) throw new Error('blankLinesAfterImports must be explicitly configured in tests');
    return value;
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
 * Helper function to apply TextEdits to a string (same as in existing tests)
 */
function applyEdits(content: string, edits: TextEdit[]): string {
  // Sort edits by position (descending) to apply them without affecting positions
  const sortedEdits = [...edits].sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  const lines = content.split('\n');

  for (const edit of sortedEdits) {
    const startLine = edit.range.start.line;
    const startChar = edit.range.start.character;
    const endLine = edit.range.end.line;
    const endChar = edit.range.end.character;

    if (startLine === endLine) {
      // Single line edit
      const line = lines[startLine] || '';
      lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
    } else {
      // Multi-line edit
      const firstLine = (lines[startLine] || '').substring(0, startChar);
      const lastLine = (lines[endLine] || '').substring(endChar);
      const newLines = edit.newText.split('\n');

      lines.splice(
        startLine,
        endLine - startLine + 1,
        firstLine + newLines[0],
        ...newLines.slice(1, -1),
        newLines[newLines.length - 1] + lastLine
      );
    }
  }

  return lines.join('\n');
}

/**
 * Organize imports using the NEW Mini TypeScript Hero extension
 *
 * This uses the REAL production code with mocked VSCode dependencies.
 *
 * IMPORTANT: All config options must be explicitly provided. The adapter has NO defaults.
 * Tests should use OLD_EXTENSION_COMPATIBLE_CONFIG from shared-config.ts as the base,
 * then override specific options as needed for the test.
 */
export function organizeImportsNew(
  sourceCode: string,
  configOverrides: any = {}
): string {
  const doc = new MockTextDocument('test.ts', sourceCode);
  const config = new MockImportsConfig();
  const logger = new MockOutputChannel();

  // Apply all config values (no defaults!)
  Object.keys(configOverrides).forEach(key => {
    config.setConfig(key, configOverrides[key]);
  });

  const manager = new ImportManager(doc, config, logger);
  const edits = manager.organizeImports();
  const result = applyEdits(sourceCode, edits);

  return result;
}
