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
import { TypescriptParser, TypescriptCodeGenerator, File, Generatable, GENERATORS, TypescriptGenerationOptions } from 'typescript-parser';
import { Uri, Position, Range, TextDocument, TextEdit, window, TextEditor, workspace, WorkspaceEdit } from 'vscode';
import { ImportManager } from '../old-typescript-hero/src/imports/import-manager';
import { Configuration } from '../old-typescript-hero/src/configuration';
import { ImportsConfig } from '../old-typescript-hero/src/configuration/imports-config';
import { TypescriptCodeGeneratorFactory } from '../old-typescript-hero/src/ioc-symbols';
import { getScriptKind } from '../old-typescript-hero/src/utilities/utility-functions';
import { ImportGroupSettingParser } from '../old-typescript-hero/src/imports/import-grouping/import-group-setting-parser';
import { ImportGroup, KeywordImportGroup, RegexImportGroup, RemainImportGroup } from '../old-typescript-hero/src/imports/import-grouping';

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
  private mockConfig: Map<string, any> = new Map();

  setConfig(key: string, value: any): void {
    this.mockConfig.set(key, value);
  }

  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    return this.mockConfig.get('insertSpaceBeforeAndAfterImportBraces') ?? true;
  }

  insertSemicolons(_resource: Uri): boolean {
    return this.mockConfig.get('insertSemicolons') ?? true;
  }

  removeTrailingIndex(_resource: Uri): boolean {
    return this.mockConfig.get('removeTrailingIndex') ?? true;
  }

  stringQuoteStyle(_resource: Uri): '"' | '\'' {
    return this.mockConfig.get('stringQuoteStyle') ?? '\'';
  }

  multiLineWrapThreshold(_resource: Uri): number {
    return this.mockConfig.get('multiLineWrapThreshold') ?? 125;
  }

  multiLineTrailingComma(_resource: Uri): boolean {
    return this.mockConfig.get('multiLineTrailingComma') ?? true;
  }

  disableImportRemovalOnOrganize(_resource: Uri): boolean {
    return this.mockConfig.get('disableImportRemovalOnOrganize') ?? false;
  }

  disableImportsSorting(_resource: Uri): boolean {
    return this.mockConfig.get('disableImportsSorting') ?? false;
  }

  organizeOnSave(_resource: Uri): boolean {
    return this.mockConfig.get('organizeOnSave') ?? false;
  }

  organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    return this.mockConfig.get('organizeSortsByFirstSpecifier') ?? false;
  }

  ignoredFromRemoval(_resource: Uri): string[] {
    return this.mockConfig.get('ignoredFromRemoval') ?? ['react'];
  }

  grouping(_resource: Uri): ImportGroup[] {
    const customGrouping = this.mockConfig.get('grouping');
    if (customGrouping) {
      // If it's an array of strings, parse each into ImportGroup objects
      if (Array.isArray(customGrouping) && customGrouping.length > 0 && typeof customGrouping[0] === 'string') {
        // Filter out any undefined/null values and parse each string
        const cleanGrouping: string[] = customGrouping.filter(g => g !== undefined && g !== null);
        return cleanGrouping.map(setting => ImportGroupSettingParser.parseSetting(setting));
      }
      // Otherwise it's already an array of ImportGroup objects
      return customGrouping;
    }
    // Return default grouping: Plains, Modules, Workspace, Remain
    return ImportGroupSettingParser.default;
  }
}

/**
 * Register custom generators for ImportGroup types
 * (Copied from old-typescript-hero/src/typescript-hero.ts:extendCodeGenerator)
 */
let generatorsExtended = false;
function extendCodeGenerator(): void {
  if (generatorsExtended) return;
  generatorsExtended = true;

  function simpleGenerator(
    generatable: Generatable,
    options: TypescriptGenerationOptions,
  ): string {
    const gen = new TypescriptCodeGenerator(options);
    const group = generatable as KeywordImportGroup;
    if (!group.imports.length) {
      return '';
    }
    return (
      group.sortedImports.map(imp => gen.generate(imp)).join('\n') + '\n'
    );
  }

  GENERATORS[KeywordImportGroup.name] = simpleGenerator;
  GENERATORS[RegexImportGroup.name] = simpleGenerator;
  GENERATORS[RemainImportGroup.name] = simpleGenerator;
}

/**
 * Helper function to apply TextEdits using VSCode's REAL workspace.applyEdit API
 *
 * This uses VSCode's actual implementation instead of our buggy homegrown version!
 */
async function applyEditsUsingVSCode(doc: TextDocument, edits: TextEdit[]): Promise<string> {
  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.set(doc.uri, edits);

  // Apply edits using VSCode's real implementation
  const success = await workspace.applyEdit(workspaceEdit);

  if (!success) {
    throw new Error('Failed to apply edits');
  }

  // Return the updated document text
  return doc.getText();
}

/**
 * Organize imports using OLD TypeScript Hero extension
 *
 * This uses the REAL old extension code with mocked VSCode dependencies.
 */
export async function organizeImportsOld(
  sourceCode: string,
  configOverrides: any = {}
): Promise<string> {
  // Register custom generators for ImportGroup types (one-time setup)
  extendCodeGenerator();

  // Parse with typescript-parser
  const parser = new TypescriptParser();
  const parsedDocument: File = await parser.parseSource(sourceCode, getScriptKind('test.ts'));

  // Create mocks
  const doc = new MockTextDocument('test.ts', sourceCode);
  const config = new MockConfiguration();
  const logger = new MockLogger() as any;

  // Apply config overrides
  Object.keys(configOverrides).forEach(key => {
    (config.imports as MockImportsConfig).setConfig(key, configOverrides[key]);
  });

  // Create generator factory
  const generatorFactory: TypescriptCodeGeneratorFactory = (resource: Uri) => {
    return new TypescriptCodeGenerator(config.typescriptGeneratorOptions(resource));
  };

  // Mock window.activeTextEditor (needed by getImportInsertPosition)
  const mockEditor = { document: doc } as unknown as TextEditor;
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'activeTextEditor');
  Object.defineProperty(window, 'activeTextEditor', {
    get: () => mockEditor,
    configurable: true
  });

  // Create ImportManager (using REAL old extension code)
  const manager = new ImportManager(
    doc,
    parsedDocument,
    parser,
    config,
    logger,
    generatorFactory
  );

  // Organize imports and get text edits (using REAL old extension API)
  const edits = manager.organizeImports().calculateTextEdits();

  // Restore original descriptor
  if (originalDescriptor) {
    Object.defineProperty(window, 'activeTextEditor', originalDescriptor);
  } else {
    delete (window as any).activeTextEditor;
  }

  // Apply the text edits using VSCode's REAL implementation
  const result = await applyEditsUsingVSCode(doc, edits);

  return result;
}
