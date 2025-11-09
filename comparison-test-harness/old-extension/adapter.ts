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
import { TypescriptParser, TypescriptCodeGenerator, File, Generatable, GENERATORS, TypescriptGenerationOptions, MultiLineImportRule } from 'typescript-parser';
import { Uri, TextDocument, TextEdit, window, TextEditor, workspace, WorkspaceEdit, ExtensionContext } from 'vscode';
import { ImportManager } from '../old-typescript-hero/src/imports/import-manager';
import { Configuration } from '../old-typescript-hero/src/configuration';
import { ImportsConfig } from '../old-typescript-hero/src/configuration/imports-config';
import { TypescriptCodeGeneratorFactory } from '../old-typescript-hero/src/ioc-symbols';
import { getScriptKind } from '../old-typescript-hero/src/utilities/utility-functions';
import { ImportGroupSettingParser } from '../old-typescript-hero/src/imports/import-grouping/import-group-setting-parser';
import { ImportGroup, KeywordImportGroup, RegexImportGroup, RemainImportGroup } from '../old-typescript-hero/src/imports/import-grouping';
import { createTempDocument, deleteTempDocument } from '../../src/test/test-helpers';

/**
 * Mock Logger for old extension that implements the Logger interface
 */
class MockLogger {
  error(_message: string, ..._data: unknown[]): void {
    // Silent logging
  }
  warn(_message: string, ..._data: unknown[]): void {}
  info(_message: string, ..._data: unknown[]): void {}
  debug(_message: string, ..._data: unknown[]): void {}
  profile(_name: string): void {}
  startTimer(): { done: (info: { message: string; [key: string]: unknown }) => void } {
    return { done: () => {} };
  }
}

/**
 * Mock Configuration for old extension
 */
class MockConfiguration extends Configuration {
  public readonly imports = new MockImportsConfig();

  constructor() {
    // Create minimal ExtensionContext mock that implements required properties
    const mockContext: Pick<ExtensionContext, 'subscriptions'> = {
      subscriptions: []
    };
    super(mockContext as ExtensionContext);
  }

  typescriptGeneratorOptions(resource: Uri): TypescriptGenerationOptions {
    // Get tabSize from config if provided, otherwise use the original logic
    let tabSize: number;
    const configTabSize = (this.imports as MockImportsConfig).getConfigValue('tabSize');
    if (typeof configTabSize === 'number') {
      tabSize = configTabSize;
    } else {
      // Match original extension logic: try activeTextEditor.options.tabSize, fallback to editor.tabSize (default: 4)
      tabSize = window.activeTextEditor && typeof window.activeTextEditor.options.tabSize === 'number'
        ? window.activeTextEditor.options.tabSize
        : workspace.getConfiguration('editor', resource).get('tabSize', 4);
    }

    return {
      eol: this.imports.insertSemicolons(resource) ? ';' : '',
      insertSpaces: true, // Old extension ALWAYS uses spaces (never tabs)
      multiLineTrailingComma: this.imports.multiLineTrailingComma(resource),
      multiLineWrapThreshold: this.imports.multiLineWrapThreshold(resource),
      spaceBraces: this.imports.insertSpaceBeforeAndAfterImportBraces(resource),
      stringQuoteStyle: this.imports.stringQuoteStyle(resource),
      tabSize: tabSize,
      wrapMethod: MultiLineImportRule.oneImportPerLineOnlyAfterThreshold,
    };
  }
}

type ConfigValue = string | number | boolean | string[] | ImportGroup[];

/**
 * Mock ImportsConfig for old extension
 * IMPORTANT: Does NOT extend ImportsConfig to avoid calling workspace.getConfiguration()
 */
class MockImportsConfig {
  private mockConfig: Map<string, ConfigValue> = new Map();

  setConfig(key: string, value: ConfigValue): void {
    this.mockConfig.set(key, value);
  }

  getConfigValue(key: string): ConfigValue | undefined {
    return this.mockConfig.get(key);
  }

  insertSpaceBeforeAndAfterImportBraces(_resource: Uri): boolean {
    const value = this.mockConfig.get('insertSpaceBeforeAndAfterImportBraces');
    return typeof value === 'boolean' ? value : true;
  }

  insertSemicolons(_resource: Uri): boolean {
    const value = this.mockConfig.get('insertSemicolons');
    return typeof value === 'boolean' ? value : true;
  }

  removeTrailingIndex(_resource: Uri): boolean {
    const value = this.mockConfig.get('removeTrailingIndex');
    return typeof value === 'boolean' ? value : true;
  }

  stringQuoteStyle(_resource: Uri): '"' | '\'' {
    const value = this.mockConfig.get('stringQuoteStyle');
    return (value === '"' || value === '\'') ? value : '\'';
  }

  multiLineWrapThreshold(_resource: Uri): number {
    const value = this.mockConfig.get('multiLineWrapThreshold');
    return typeof value === 'number' ? value : 125;
  }

  multiLineTrailingComma(_resource: Uri): boolean {
    const value = this.mockConfig.get('multiLineTrailingComma');
    return typeof value === 'boolean' ? value : true;
  }

  disableImportRemovalOnOrganize(_resource: Uri): boolean {
    const value = this.mockConfig.get('disableImportRemovalOnOrganize');
    return typeof value === 'boolean' ? value : false;
  }

  disableImportsSorting(_resource: Uri): boolean {
    const value = this.mockConfig.get('disableImportsSorting');
    return typeof value === 'boolean' ? value : false;
  }

  organizeOnSave(_resource: Uri): boolean {
    const value = this.mockConfig.get('organizeOnSave');
    return typeof value === 'boolean' ? value : false;
  }

  organizeSortsByFirstSpecifier(_resource: Uri): boolean {
    const value = this.mockConfig.get('organizeSortsByFirstSpecifier');
    return typeof value === 'boolean' ? value : false;
  }

  ignoredFromRemoval(_resource: Uri): string[] {
    const value = this.mockConfig.get('ignoredFromRemoval');
    return Array.isArray(value) && value.every(v => typeof v === 'string') ? value : ['react'];
  }

  grouping(_resource: Uri): ImportGroup[] {
    const customGrouping = this.mockConfig.get('grouping');
    if (customGrouping) {
      // If it's an array of strings, parse each into ImportGroup objects
      if (Array.isArray(customGrouping) && customGrouping.length > 0 && typeof customGrouping[0] === 'string') {
        // Filter out any undefined/null values and parse each string
        const cleanGrouping = customGrouping.filter((g): g is string => typeof g === 'string');
        return cleanGrouping.map(setting => ImportGroupSettingParser.parseSetting(setting));
      }
      // Otherwise it's already an array of ImportGroup objects
      if (Array.isArray(customGrouping) && customGrouping.every((g): g is ImportGroup => g instanceof Object)) {
        return customGrouping as ImportGroup[];
      }
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
  configOverrides: Record<string, ConfigValue> = {}
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
    const logger = new MockLogger();

    // Apply config overrides
    Object.keys(configOverrides).forEach(key => {
      (config.imports as MockImportsConfig).setConfig(key, configOverrides[key]);
    });

    // Create generator factory
    const generatorFactory: TypescriptCodeGeneratorFactory = (resource: Uri) => {
      return new TypescriptCodeGenerator(config.typescriptGeneratorOptions(resource));
    };

    // Mock window.activeTextEditor (needed by getImportInsertPosition and tabSize)
    // Only provide the properties that the old extension actually uses
    const mockEditor: Pick<TextEditor, 'document' | 'options'> & { options: { tabSize: number } } = {
      document: doc,
      options: { tabSize: 2 } // Default tabSize for tests
    };
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'activeTextEditor');
    Object.defineProperty(window, 'activeTextEditor', {
      get: () => mockEditor as TextEditor,
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
      // Safe delete using Reflect
      Reflect.deleteProperty(window, 'activeTextEditor');
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
