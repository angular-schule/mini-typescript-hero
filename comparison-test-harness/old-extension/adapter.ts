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
import { Uri, TextDocument, TextEdit, window, TextEditor, workspace, WorkspaceEdit } from 'vscode';
import { ImportManager } from '../old-typescript-hero/src/imports/import-manager';
import { Configuration } from '../old-typescript-hero/src/configuration';
import { ImportsConfig } from '../old-typescript-hero/src/configuration/imports-config';
import { TypescriptCodeGeneratorFactory } from '../old-typescript-hero/src/ioc-symbols';
import { getScriptKind } from '../old-typescript-hero/src/utilities/utility-functions';
import { ImportGroupSettingParser } from '../old-typescript-hero/src/imports/import-grouping/import-group-setting-parser';
import { ImportGroup, KeywordImportGroup, RegexImportGroup, RemainImportGroup } from '../old-typescript-hero/src/imports/import-grouping';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Create a REAL temporary file and open it as a TextDocument
 * This allows us to use workspace.applyEdit() which requires real files
 */
async function createTempDocument(content: string): Promise<TextDocument> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `test-${Date.now()}-${Math.random()}.ts`);
  fs.writeFileSync(tempFile, content, 'utf-8');

  const doc = await workspace.openTextDocument(Uri.file(tempFile));
  return doc;
}

/**
 * Clean up temporary file after test completes
 */
async function deleteTempDocument(doc: TextDocument): Promise<void> {
  try {
    fs.unlinkSync(doc.uri.fsPath);
  } catch (e) {
    // Ignore errors (file might not exist)
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
  public readonly imports = new MockImportsConfig();

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
 * IMPORTANT: Does NOT extend ImportsConfig to avoid calling workspace.getConfiguration()
 */
class MockImportsConfig {
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
 * Organize imports using OLD TypeScript Hero extension
 *
 * This uses the REAL old extension code with REAL VSCode APIs.
 */
export async function organizeImportsOld(
  sourceCode: string,
  configOverrides: any = {}
): Promise<string> {
  // Register custom generators for ImportGroup types (one-time setup)
  extendCodeGenerator();

  // Create REAL temp file (NOT mocked TextDocument!)
  const doc = await createTempDocument(sourceCode);

  try {
    // Parse with typescript-parser - use REAL document text and fileName!
    const parser = new TypescriptParser();
    const parsedDocument: File = await parser.parseSource(doc.getText(), getScriptKind(doc.fileName));

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
