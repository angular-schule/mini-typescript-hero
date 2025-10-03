import { Project, SourceFile, Node } from 'ts-morph';
import { OutputChannel, Position, Range, TextDocument, TextEdit } from 'vscode';

import { ImportsConfig } from '../configuration';
import {
  ExternalModuleImport,
  Import,
  NamedImport,
  NamespaceImport,
  StringImport,
  SymbolSpecifier
} from './import-types';
import { importSort, importSortByFirstSpecifier, specifierSort } from './import-utilities';
import { ImportGroup } from './import-grouping';

/**
 * Management class for the imports of a document.
 * Can organize imports (sort, group, remove unused) and generate TextEdits.
 */
export class ImportManager {
  private sourceFile!: SourceFile;
  private imports: Import[] = [];
  private usedIdentifiers: Set<string> = new Set();

  constructor(
    private readonly document: TextDocument,
    private readonly config: ImportsConfig,
    private readonly logger: OutputChannel,
  ) {
    this.logger.appendLine(`[ImportManager] Create import manager for ${document.fileName}`);
    this.parseDocument();
  }

  /**
   * Parse the document with ts-morph.
   */
  private parseDocument(): void {
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        jsx: 2, // React JSX
      },
    });

    this.sourceFile = project.createSourceFile(
      this.document.fileName,
      this.document.getText(),
    );

    // Extract imports
    this.extractImports();

    // Find used identifiers
    this.findUsedIdentifiers();
  }

  /**
   * Extract all imports from the source file.
   */
  private extractImports(): void {
    const importDeclarations = this.sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // String-only import (e.g., import 'reflect-metadata')
      if (!importDecl.getNamedImports().length &&
          !importDecl.getDefaultImport() &&
          !importDecl.getNamespaceImport()) {
        this.imports.push(new StringImport(moduleSpecifier));
        continue;
      }

      // Namespace import (e.g., import * as foo from 'lib')
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        this.imports.push(new NamespaceImport(
          moduleSpecifier,
          namespaceImport.getText(),
        ));
        continue;
      }

      // Named import (e.g., import { foo, bar } from 'lib')
      const defaultImport = importDecl.getDefaultImport();
      const namedImports = importDecl.getNamedImports();

      const specifiers: SymbolSpecifier[] = namedImports.map(named => ({
        specifier: named.getName(),
        alias: named.getAliasNode()?.getText(),
      }));

      this.imports.push(new NamedImport(
        moduleSpecifier,
        specifiers,
        defaultImport?.getText(),
      ));
    }
  }

  /**
   * Find all identifiers that are actually used in the code.
   * Uses ts-morph's reference tracking to distinguish between:
   * - Imported symbols that are used (should keep)
   * - Imported symbols that are shadowed by local declarations (should remove)
   * - Locally declared symbols (not relevant for import removal)
   */
  private findUsedIdentifiers(): void {
    this.usedIdentifiers.clear();

    const importDeclarations = this.sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      // Check default import (e.g., import React from 'react')
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        const references = defaultImport.findReferencesAsNodes();
        // If referenced anywhere besides the import itself, it's used
        if (references.length > 0) {
          this.usedIdentifiers.add(defaultImport.getText());
        }
      }

      // Check namespace import (e.g., import * as React from 'react')
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        const references = namespaceImport.findReferencesAsNodes();
        if (references.length > 0) {
          this.usedIdentifiers.add(namespaceImport.getText());
        }
      }

      // Check named imports (e.g., import { Component, OnInit } from '@angular/core')
      const namedImports = importDecl.getNamedImports();
      for (const namedImport of namedImports) {
        const name = namedImport.getName();
        const alias = namedImport.getAliasNode()?.getText();

        // The identifier we need to check is the alias if present, otherwise the name
        const identifierToCheck = alias || name;

        // For aliased imports, check the alias node; otherwise check the name node
        const nodeToCheck = alias ? namedImport.getAliasNode() : namedImport.getNameNode();

        if (nodeToCheck && Node.isIdentifier(nodeToCheck)) {
          const references = nodeToCheck.findReferencesAsNodes();

          // If there are any references (findReferencesAsNodes returns usage sites),
          // the import is used
          if (references.length > 0) {
            this.usedIdentifiers.add(identifierToCheck);
          }
        }
      }
    }
  }

  /**
   * Organize imports: remove unused, sort, and group.
   * Returns TextEdits to apply the changes.
   */
  public organizeImports(): TextEdit[] {
    this.logger.appendLine(`[ImportManager] Organizing imports`);

    let keep: Import[] = [];

    // Filter unused imports (unless disabled)
    if (this.config.disableImportRemovalOnOrganize(this.document.uri)) {
      keep = this.imports;
    } else {
      for (const imp of this.imports) {
        // Check if import is in the ignore list
        if (this.config.ignoredFromRemoval(this.document.uri).includes(imp.libraryName)) {
          keep.push(imp);
          continue;
        }

        // String imports are always kept
        if (imp instanceof StringImport) {
          keep.push(imp);
          continue;
        }

        // Check namespace/external module imports
        if (imp instanceof NamespaceImport || imp instanceof ExternalModuleImport) {
          if (this.usedIdentifiers.has(imp.alias)) {
            keep.push(imp);
          }
          continue;
        }

        // Check named imports
        if (imp instanceof NamedImport) {
          const usedSpecifiers = imp.specifiers.filter(spec =>
            this.usedIdentifiers.has(spec.alias || spec.specifier)
          );

          const defaultUsed = imp.defaultAlias && this.usedIdentifiers.has(imp.defaultAlias);

          if (usedSpecifiers.length || defaultUsed) {
            // Sort specifiers
            usedSpecifiers.sort(specifierSort);

            keep.push(new NamedImport(
              imp.libraryName,
              usedSpecifiers,
              defaultUsed ? imp.defaultAlias : undefined,
            ));
          }
        }
      }
    }

    // Sort imports (unless disabled)
    if (!this.config.disableImportsSorting(this.document.uri)) {
      const sorter = this.config.organizeSortsByFirstSpecifier(this.document.uri)
        ? importSortByFirstSpecifier
        : importSort;

      keep = [
        ...keep.filter(o => o instanceof StringImport).sort(sorter),
        ...keep.filter(o => !(o instanceof StringImport)).sort(sorter),
      ];
    }

    // Remove trailing /index (if configured)
    if (this.config.removeTrailingIndex(this.document.uri)) {
      for (const imp of keep.filter(lib => lib.libraryName.endsWith('/index'))) {
        imp.libraryName = imp.libraryName.replace(/\/index$/, '');
      }
    }

    // Group imports
    const importGroups = this.config.grouping(this.document.uri);
    for (const group of importGroups) {
      group.reset();
    }

    for (const imp of keep) {
      for (const group of importGroups) {
        if (group.processImport(imp)) {
          break;
        }
      }
    }

    // Generate import text
    return this.generateTextEdits(importGroups);
  }

  /**
   * Generate TextEdits to replace the old imports with the new organized imports.
   */
  private generateTextEdits(importGroups: ImportGroup[]): TextEdit[] {
    const edits: TextEdit[] = [];

    // Get the range of all import declarations
    const importDeclarations = this.sourceFile.getImportDeclarations();
    if (importDeclarations.length === 0) {
      return edits;
    }

    // Delete all existing imports
    for (const importDecl of importDeclarations) {
      const start = importDecl.getStart();
      const end = importDecl.getEnd();

      const startPos = this.document.positionAt(start);
      const endPos = this.document.positionAt(end);

      // Include the whole line
      const range = new Range(
        new Position(startPos.line, 0),
        new Position(endPos.line + 1, 0),
      );

      edits.push(TextEdit.delete(range));
    }

    // Generate new import text
    const importLines: string[] = [];

    for (const group of importGroups) {
      if (group.imports.length === 0) {
        continue;
      }

      const groupLines = group.sortedImports.map(imp => this.generateImportStatement(imp));
      importLines.push(...groupLines);

      // Add blank line between groups
      importLines.push('');
    }

    // Remove trailing blank lines
    while (importLines.length > 0 && importLines[importLines.length - 1] === '') {
      importLines.pop();
    }

    if (importLines.length > 0) {
      // Insert at the beginning (or after 'use strict', shebang, etc.)
      const insertPosition = this.getImportInsertPosition();
      edits.push(TextEdit.insert(insertPosition, importLines.join('\n') + '\n\n'));
    }

    return edits;
  }

  /**
   * Generate a single import statement string.
   */
  private generateImportStatement(imp: Import): string {
    const quote = this.config.stringQuoteStyle(this.document.uri);
    const semi = this.config.insertSemicolons(this.document.uri) ? ';' : '';
    const spaceInBraces = this.config.insertSpaceBeforeAndAfterImportBraces(this.document.uri);

    if (imp instanceof StringImport) {
      return `import ${quote}${imp.libraryName}${quote}${semi}`;
    }

    if (imp instanceof NamespaceImport) {
      return `import * as ${imp.alias} from ${quote}${imp.libraryName}${quote}${semi}`;
    }

    if (imp instanceof ExternalModuleImport) {
      return `import ${imp.alias} = require(${quote}${imp.libraryName}${quote})${semi}`;
    }

    if (imp instanceof NamedImport) {
      const parts: string[] = [];

      // Default import
      if (imp.defaultAlias) {
        parts.push(imp.defaultAlias);
      }

      // Named imports
      if (imp.specifiers.length > 0) {
        const specifierStrings = imp.specifiers.map(spec =>
          spec.alias ? `${spec.specifier} as ${spec.alias}` : spec.specifier
        );

        const specifiersText = specifierStrings.join(', ');
        const braceOpen = spaceInBraces ? '{ ' : '{';
        const braceClose = spaceInBraces ? ' }' : '}';

        // Check if it should be multiline
        const threshold = this.config.multiLineWrapThreshold(this.document.uri);
        const singleLine = `${braceOpen}${specifiersText}${braceClose}`;

        if (singleLine.length > threshold && imp.specifiers.length > 1) {
          // Multiline
          const trailingComma = this.config.multiLineTrailingComma(this.document.uri) ? ',' : '';
          const namedPart = `{\n  ${specifierStrings.join(',\n  ')}${trailingComma}\n}`;
          parts.push(namedPart);
        } else {
          parts.push(singleLine);
        }
      }

      return `import ${parts.join(', ')} from ${quote}${imp.libraryName}${quote}${semi}`;
    }

    return '';
  }

  /**
   * Get the position where imports should be inserted.
   */
  private getImportInsertPosition(): Position {
    const text = this.document.getText();
    const lines = text.split('\n');

    // Skip shebang, 'use strict', and other header comments
    const REGEX_IGNORED_LINE = /^\s*(?:\/\/|\/\*|\*\/|\*|#!|(['"])use strict\1)/;

    let insertLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!REGEX_IGNORED_LINE.test(lines[i])) {
        insertLine = i;
        break;
      }
    }

    return new Position(insertLine, 0);
  }
}
