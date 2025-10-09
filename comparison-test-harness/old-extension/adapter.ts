/**
 * Adapter for Old TypeScript Hero
 *
 * This adapter provides a standalone function interface to the old extension.
 * It uses the REAL production code from ../old-typescript-hero/src/ with mocked VSCode dependencies.
 *
 * APPROACH:
 * - Import actual ImportManager from ../old-typescript-hero/src/
 * - Create minimal mock implementations of required dependencies
 * - Reference real code via relative paths (no copying!)
 */

import 'reflect-metadata';
import { TypescriptParser, TypescriptCodeGenerator, File } from 'typescript-parser';
import { Uri, Position, Range, TextDocument, TextEdit } from 'vscode';
import { ImportManager } from '../old-typescript-hero/src/imports/import-manager';
import { Configuration } from '../old-typescript-hero/src/configuration';
import { ImportsConfig } from '../old-typescript-hero/src/configuration/imports-config';
import { TypescriptCodeGeneratorFactory } from '../old-typescript-hero/src/ioc-symbols';
import { getScriptKind } from '../old-typescript-hero/src/utilities/utility-functions';
import { ImportGroupSettingParser } from '../old-typescript-hero/src/imports/import-grouping/import-group-setting-parser';
import { ImportGroup } from '../old-typescript-hero/src/imports/import-grouping';

/**
 * Mock TextDocument for old extension
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
    this.eol = eol;
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
      offset += lines[i].length + 1;
    }
    offset += position.character;
    return offset;
  }

  positionAt(offset: number): Position {
    const lines = this.content.split('\n');
    let currentOffset = 0;
    for (let line = 0; line < lines.length; line++) {
      const lineLength = lines[line].length + 1;
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
 * Mock Logger for old extension
 */
class MockLogger {
  debug(..._args: any[]): void {
    // Silent logging
  }
  info(..._args: any[]): void {}
  warn(..._args: any[]): void {}
  error(..._args: any[]): void {}
}

/**
 * Mock Configuration for old extension
 */
class MockConfiguration extends Configuration {
  public readonly imports: ImportsConfig = new MockImportsConfig() as any;

  constructor() {
    // Create minimal ExtensionContext mock
    const mockContext = {
      subscriptions: []
    };
    super(mockContext as any);
  }

  typescriptGeneratorOptions(resource: Uri): any {
    return {
      eol: this.imports.insertSemicolons(resource) ? ';' : '',
      insertSpaces: true,
      multiLineTrailingComma: this.imports.multiLineTrailingComma(resource),
      multiLineWrapThreshold: this.imports.multiLineWrapThreshold(resource),
      spaceBraces: this.imports.insertSpaceBeforeAndAfterImportBraces(resource),
      stringQuoteStyle: this.imports.stringQuoteStyle(resource),
      tabSize: 2,
      wrapMethod: 1, // MultiLineImportRule.oneImportPerLineOnlyAfterThreshold
    };
  }
}

/**
 * Mock ImportsConfig for old extension
 */
class MockImportsConfig extends ImportsConfig {
  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return true;
  }

  insertSemicolons(_resource: Uri): boolean {
    return true;
  }

  removeTrailingIndex(_resource: Uri): boolean {
    return true;
  }

  stringQuoteStyle(_resource: Uri): '"' | '\'' {
    return '\'';
  }

  multiLineWrapThreshold(_resource: Uri): number {
    return 125;
  }

  multiLineTrailingComma(_resource: Uri): boolean {
    return true;
  }

  disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return false; // Enable merging and removal - parser correctly detects usages
  }

  disableImportsSorting(_resource: Uri): boolean {
    return false;
  }

  organizeOnSave(_resource: Uri): boolean {
    return false;
  }

  organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return false;
  }

  ignoredFromRemoval(_resource: Uri): string[] {
    return ['react'];
  }

  grouping(_resource: Uri): ImportGroup[] {
    // Return default grouping: Plains, Modules, Workspace, Remain
    return ImportGroupSettingParser.default;
  }
}

/**
 * Helper function to apply TextEdits to a string
 */
function applyEdits(content: string, edits: TextEdit[]): string {
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
      const line = lines[startLine] || '';
      lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
    } else {
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
 * Organize imports using OLD TypeScript Hero extension
 *
 * This uses the REAL old extension code with mocked VSCode dependencies.
 */
export async function organizeImportsOld(
  sourceCode: string,
  _config: any = {}
): Promise<string> {
  // Parse with typescript-parser
  const parser = new TypescriptParser();
  const parsedDocument: File = await parser.parseSource(sourceCode, getScriptKind('test.ts'));

  // Create mocks
  const doc = new MockTextDocument('test.ts', sourceCode);
  const config = new MockConfiguration();
  const logger = new MockLogger() as any;

  // Create generator factory
  const generatorFactory: TypescriptCodeGeneratorFactory = (resource: Uri) => {
    return new TypescriptCodeGenerator(config.typescriptGeneratorOptions(resource));
  };

  // Create ImportManager (using REAL old extension code)
  const manager = new ImportManager(
    doc,
    parsedDocument,
    parser,
    config,
    logger,
    generatorFactory
  );

  // Organize imports
  manager.organizeImports();

  // WORKAROUND: The old extension has a bug in calculateTextEdits() where it tries to
  // generate ImportGroup objects instead of Import objects. We manually generate the
  // output here to work around the bug.
  const generator = generatorFactory(doc.uri);
  const importGroups = (manager as any).importGroups;
  const groupOutputs: string[] = [];

  for (const group of importGroups) {
    const importsInGroup = group.sortedImports;
    if (importsInGroup.length > 0) {
      const generatedImports = importsInGroup
        .map((imp: any) => generator.generate(imp))
        .filter(Boolean);
      if (generatedImports.length > 0) {
        groupOutputs.push(generatedImports.join('\n'));
      }
    }
  }

  const organizedImports = groupOutputs.join('\n\n');

  // Find import region in original source
  let importStart = sourceCode.length;
  let importEnd = 0;

  for (const imp of parsedDocument.imports) {
    if (imp.start !== undefined && imp.start < importStart) {
      importStart = imp.start;
    }
    if (imp.end !== undefined && imp.end > importEnd) {
      importEnd = imp.end;
    }
  }

  // Replace imports region
  if (parsedDocument.imports.length > 0) {
    // Find the line after imports to preserve spacing
    const lines = sourceCode.split('\n');
    const importEndPos = doc.positionAt(importEnd);
    let endLine = importEndPos.line + 1;

    // Skip empty lines after imports
    while (endLine < lines.length && lines[endLine].trim() === '') {
      endLine++;
    }

    const beforeImports = sourceCode.substring(0, importStart);
    const afterImports = lines.slice(endLine).join('\n');

    return beforeImports + organizedImports + '\n\n' + afterImports;
  }

  return organizedImports + '\n\n' + sourceCode;
}
