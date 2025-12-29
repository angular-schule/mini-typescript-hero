import { Import, StringImport } from '../import-types';
import { importSort } from '../import-utilities';
import { ImportGroup } from './import-group';
import { ImportGroupKeyword } from './import-group-keyword';
import { ImportGroupOrder } from './import-group-order';

/**
 * Import group for keywords. Uses "Modules", "Plains", "Workspace" as a keyword and processes the corresponding imports.
 */
export class KeywordImportGroup implements ImportGroup {
  public readonly imports: Import[] = [];

  public get sortedImports(): Import[] {
    // IMPORTANT: Copy array before sorting to avoid mutating the original
    return [...this.imports].sort((i1, i2) => importSort(i1, i2, this.order));
  }

  constructor(
    public readonly keyword: ImportGroupKeyword,
    public readonly order: ImportGroupOrder = ImportGroupOrder.Asc,
  ) {}

  public reset(): void {
    this.imports.length = 0;
  }

  public processImport(tsImport: Import): boolean {
    switch (this.keyword) {
      case ImportGroupKeyword.Modules:
        return this.processModulesImport(tsImport);
      case ImportGroupKeyword.Plains:
        return this.processPlainsImport(tsImport);
      case ImportGroupKeyword.Workspace:
        return this.processWorkspaceImport(tsImport);
      default:
        return false;
    }
  }

  /**
   * Process a library import.
   * @example import ... from 'vscode';
   */
  private processModulesImport(tsImport: Import): boolean {
    if (
      tsImport instanceof StringImport ||
      tsImport.libraryName.startsWith('.') ||
      tsImport.libraryName.startsWith('/')
    ) {
      return false;
    }
    this.imports.push(tsImport);
    return true;
  }

  /**
   * Process a string only import.
   * @example import 'reflect-metadata';
   */
  private processPlainsImport(tsImport: Import): boolean {
    if (!(tsImport instanceof StringImport)) {
      return false;
    }
    this.imports.push(tsImport);
    return true;
  }

  /**
   * Process a workspace import (not string nor lib import).
   * @example import ... from './server';
   */
  private processWorkspaceImport(tsImport: Import): boolean {
    if (
      tsImport instanceof StringImport ||
      (!tsImport.libraryName.startsWith('.') &&
        !tsImport.libraryName.startsWith('/'))
    ) {
      return false;
    }
    this.imports.push(tsImport);
    return true;
  }
}
