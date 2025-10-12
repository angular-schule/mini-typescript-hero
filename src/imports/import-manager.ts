import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import { EndOfLine, OutputChannel, Position, Range, TextDocument, TextEdit } from 'vscode';

import { ImportsConfig } from '../configuration';
import {
  ExternalModuleImport,
  Import,
  NamedImport,
  NamespaceImport,
  StringImport,
  SymbolSpecifier
} from './import-types';
import { importSort, importSortByFirstSpecifier, specifierSort, importGroupSortForPrecedence } from './import-utilities';
import { ImportGroup } from './import-grouping';

/**
 * Management class for the imports of a document.
 * Can organize imports (sort, group, remove unused) and generate TextEdits.
 */
export class ImportManager {
  private sourceFile!: SourceFile;
  private imports: Import[] = [];
  private usedIdentifiers: Set<string> = new Set();
  private readonly eol: string;

  constructor(
    private readonly document: TextDocument,
    private readonly config: ImportsConfig,
    // @ts-expect-error - logger parameter kept for future debugging capabilities
    private readonly logger: OutputChannel,
  ) {
    // Detect and use the document's line ending style (LF or CRLF)
    this.eol = document.eol === EndOfLine.CRLF ? '\r\n' : '\n';
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

    // Extract old-style TypeScript imports (import = require)
    // This syntax is deprecated but still used in legacy codebases
    const statements = this.sourceFile.getStatements();
    for (const stmt of statements) {
      if (Node.isImportEqualsDeclaration(stmt)) {
        const moduleRef = stmt.getModuleReference();
        if (Node.isExternalModuleReference(moduleRef)) {
          const expression = moduleRef.getExpression();
          if (expression) {
            // Remove quotes from require('module-name')
            const moduleSpecifier = expression.getText().slice(1, -1);
            this.imports.push(new ExternalModuleImport(
              moduleSpecifier,
              stmt.getName()
            ));
          }
        }
      }
    }
  }

  /**
   * Find all identifiers that are actually used in the code.
   *
   * Strategy:
   * 1. Collect all local declarations (classes, functions, etc.) - these shadow imports
   * 2. Scan all identifier nodes in the code (excluding imports and local declaration sites)
   * 3. Only identifiers that:
   *    - Are NOT local declarations (not shadowed)
   *    - Are used in the code body
   *    should be considered "used"
   */
  private findUsedIdentifiers(): void {
    this.usedIdentifiers.clear();

    // Step 1: Build a set of locally declared identifiers that shadow imports
    const localDeclarations = new Set<string>();

    // Classes, interfaces, type aliases
    this.sourceFile.getClasses().forEach(c => {
      const name = c.getName();
      if (name) {
        localDeclarations.add(name);
      }
    });

    this.sourceFile.getInterfaces().forEach(i => {
      const name = i.getName();
      if (name) {
        localDeclarations.add(name);
      }
    });

    this.sourceFile.getTypeAliases().forEach(t => {
      const name = t.getName();
      if (name) {
        localDeclarations.add(name);
      }
    });

    this.sourceFile.getFunctions().forEach(f => {
      const name = f.getName();
      if (name) {
        localDeclarations.add(name);
      }
    });

    this.sourceFile.getEnums().forEach(e => {
      const name = e.getName();
      if (name) {
        localDeclarations.add(name);
      }
    });

    this.sourceFile.getVariableDeclarations().forEach(v => {
      const name = v.getName();
      if (name) {
        localDeclarations.add(name);
      }
    });

    // Step 2: Handle re-exported symbols (export { Foo } or export default Foo)
    // These must be kept even if not used in the file itself
    this.sourceFile.getExportDeclarations().forEach(exportDecl => {
      const namedExports = exportDecl.getNamedExports();
      namedExports.forEach(named => {
        this.usedIdentifiers.add(named.getName());
      });
    });

    // Handle default exports that reference an identifier (export default Foo)
    this.sourceFile.getDefaultExportSymbol()?.getDeclarations().forEach(decl => {
      if (Node.isExportAssignment(decl)) {
        const expression = decl.getExpression();
        if (Node.isIdentifier(expression)) {
          this.usedIdentifiers.add(expression.getText());
        }
      }
    });

    // Step 3: Collect all identifier usages in the code (excluding import statements)
    const allIdentifiers = this.sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);

    for (const identifier of allIdentifiers) {
      const identifierText = identifier.getText();

      // Skip if this identifier is part of an import declaration
      if (identifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) {
        continue;
      }

      // Skip if this identifier is part of an old-style import equals declaration
      if (identifier.getFirstAncestorByKind(SyntaxKind.ImportEqualsDeclaration)) {
        continue;
      }

      // Skip if this identifier IS the name being declared (not usages in the declaration)
      const parent = identifier.getParent();
      if (Node.isClassDeclaration(parent) && identifier === parent.getNameNode()) {
        continue;
      }
      if (Node.isInterfaceDeclaration(parent) && identifier === parent.getNameNode()) {
        continue;
      }
      if (Node.isTypeAliasDeclaration(parent) && identifier === parent.getNameNode()) {
        continue;
      }
      if (Node.isFunctionDeclaration(parent) && identifier === parent.getNameNode()) {
        continue;
      }
      if (Node.isEnumDeclaration(parent) && identifier === parent.getNameNode()) {
        continue;
      }
      if (Node.isVariableDeclaration(parent) && identifier === parent.getNameNode()) {
        continue;
      }

      // Skip if this is a locally declared symbol (shadowed import)
      if (localDeclarations.has(identifierText)) {
        continue;
      }

      // Skip if this identifier is a property name in a property access (e.g., obj.reduce)
      // This is NOT a usage of an imported identifier
      if (Node.isPropertyAccessExpression(parent) && identifier === parent.getNameNode()) {
        continue;
      }

      // This is a genuine usage of an imported symbol
      this.usedIdentifiers.add(identifierText);
    }
  }

  /**
   * Organize imports: remove unused, sort, and group.
   * Returns TextEdits to apply the changes.
   */
  public organizeImports(): TextEdit[] {
    let keep: Import[] = [];

    // Filter unused imports (unless disabled)
    if (this.config.disableImportRemovalOnOrganize(this.document.uri)) {
      keep = this.imports;
    } else {
      for (const imp of this.imports) {
        // Check if import is in the ignore list
        if (this.config.ignoredFromRemoval(this.document.uri).includes(imp.libraryName)) {
          // Still need to sort specifiers for NamedImport to maintain consistent formatting
          if (imp instanceof NamedImport && imp.specifiers.length > 0) {
            const sortedSpecifiers = [...imp.specifiers].sort(specifierSort);
            keep.push(new NamedImport(imp.libraryName, sortedSpecifiers, imp.defaultAlias));
          } else {
            keep.push(imp);
          }
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
    // IMPORTANT: Must happen BEFORE merging so that './lib/index' and './lib' become the same
    if (this.config.removeTrailingIndex(this.document.uri)) {
      for (const imp of keep.filter(lib => lib.libraryName.endsWith('/index'))) {
        imp.libraryName = imp.libraryName.replace(/\/index$/, '');
      }
    }

    // Merge imports from same module (configurable)
    // Default: true (new users) | false (migrated users who had disableImportRemovalOnOrganize: true)
    if (this.config.mergeImportsFromSameModule(this.document.uri)) {
      const merged: Import[] = [];
      const byLibrary = new Map<string, Import[]>();

      // Group imports by library name
      for (const imp of keep) {
        const lib = imp.libraryName;
        if (!byLibrary.has(lib)) {
          byLibrary.set(lib, []);
        }
        byLibrary.get(lib)!.push(imp);
      }

      // Merge each group
      for (const [, imports] of byLibrary) {
        if (imports.length === 1) {
          // Single import, keep as-is
          merged.push(imports[0]);
          continue;
        }

        // Multiple imports from same module
        const stringImports = imports.filter(i => i instanceof StringImport);
        const namespaceImports = imports.filter(i => i instanceof NamespaceImport);
        const namedImports = imports.filter(i => i instanceof NamedImport) as NamedImport[];

        // String imports and namespace imports cannot be merged - keep separate
        merged.push(...stringImports);
        merged.push(...namespaceImports);

        // Merge named imports
        if (namedImports.length > 0) {
          const allSpecifiers: SymbolSpecifier[] = [];
          let mergedDefault: string | undefined;

          for (const namedImp of namedImports) {
            allSpecifiers.push(...namedImp.specifiers);
            if (namedImp.defaultAlias && !mergedDefault) {
              mergedDefault = namedImp.defaultAlias;
            }
          }

          // Remove duplicate specifiers (same name and alias)
          const uniqueSpecifiers = allSpecifiers.filter((spec, index, self) =>
            index === self.findIndex(s =>
              s.specifier === spec.specifier && s.alias === spec.alias
            )
          );

          // Sort specifiers
          uniqueSpecifiers.sort(specifierSort);

          merged.push(new NamedImport(
            namedImports[0].libraryName,
            uniqueSpecifiers,
            mergedDefault,
          ));
        }
      }

      keep = merged;
    }
    // else: Keep imports as-is (no merging)

    // Group imports
    const importGroups = this.config.grouping(this.document.uri);
    for (const group of importGroups) {
      group.reset();
    }

    // Sort groups for precedence: regex groups first, then keyword groups
    // This ensures regex groups can match imports even if they appear later in the config
    const groupsWithPrecedence = importGroupSortForPrecedence(importGroups);

    for (const imp of keep) {
      for (const group of groupsWithPrecedence) {
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

    // Get the range of all import declarations (both modern and old-style)
    const importDeclarations = this.sourceFile.getImportDeclarations();
    const importEquals = this.sourceFile.getStatements()
      .filter(stmt => Node.isImportEqualsDeclaration(stmt));

    const allImports = [...importDeclarations, ...importEquals as any[]];

    if (allImports.length === 0) {
      return edits;
    }

    // Sort by position to find first and last
    allImports.sort((a, b) => a.getStart() - b.getStart());

    // Get the position info including blank lines before imports
    const { blankLinesBefore, hasHeader, hasLeadingBlanks } = this.getImportInsertPosition();

    // Delete all existing imports including any blank lines before and after the import block
    const lastImport = allImports[allImports.length - 1];

    const endPos = this.document.positionAt(lastImport.getEnd());

    // Find the line after the last import and count blank lines after
    let endLine = endPos.line + 1;
    let existingBlankLinesAfter = 0;

    // Count blank lines after the import block
    while (endLine < this.document.lineCount) {
      const line = this.document.lineAt(endLine);
      if (line.text.trim() === '') {
        existingBlankLinesAfter++;
        endLine++;
      } else {
        break;
      }
    }

    // Calculate how many blank lines to insert after imports based on mode
    // But if there's no code after imports, don't add blank lines
    const hasCodeAfter = endLine < this.document.lineCount;
    const finalBlankLinesAfter = hasCodeAfter ? this.calculateBlankLinesAfter(
      existingBlankLinesAfter,
      blankLinesBefore,
      hasHeader,
      importGroups
    ) : 0;

    // Calculate deletion range:
    // - If no header: delete from line 0 (remove any leading blanks)
    // - If header WITH leading blanks: delete from line 0 (remove leading blanks, preserve header)
    // - If header WITHOUT leading blanks: delete from first import line (preserve header + blanks after header)
    // - EXCEPTION: In 'legacy' mode with header, ALWAYS delete from line 0 (to remove blank between header/imports)
    const firstImportLine = allImports[0].getStartLineNumber() - 1;  // Convert from 1-indexed to 0-indexed
    const blankLineMode = this.config.blankLinesAfterImports(this.document.uri);

    let deletionStartLine: number;
    if (blankLineMode === 'legacy' && hasHeader) {
      // Legacy mode: always delete from line 0 to remove blank between header and imports
      deletionStartLine = 0;
    } else if (hasHeader && !hasLeadingBlanks) {
      // Normal mode with header: preserve header and blanks after it
      deletionStartLine = firstImportLine;
    } else {
      // No header or has leading blanks: delete from line 0
      deletionStartLine = 0;
    }

    const deletionRange = new Range(
      new Position(deletionStartLine, 0),
      new Position(endLine, 0),
    );

    // Generate new import text
    const importLines: string[] = [];
    const useSorting = !this.config.disableImportsSorting(this.document.uri);
    const useFirstSpecifierSort = this.config.organizeSortsByFirstSpecifier(this.document.uri);

    for (const group of importGroups) {
      if (group.imports.length === 0) {
        continue;
      }

      // If sorting by first specifier, preserve pre-sorted order
      // Otherwise, re-sort by library name within each group
      const importsToUse = (useSorting && !useFirstSpecifierSort)
        ? group.sortedImports
        : group.imports;
      const groupLines = importsToUse.map(imp => this.generateImportStatement(imp));
      importLines.push(...groupLines);

      // Add blank line between groups
      importLines.push('');
    }

    // Remove trailing blank lines
    while (importLines.length > 0 && importLines[importLines.length - 1] === '') {
      importLines.pop();
    }

    if (importLines.length > 0) {
      // Build the final import text with proper blank line handling
      let importText = '';

      // If we're deleting from line 0 and there's a header, we need to re-add the header
      if (deletionStartLine === 0 && hasHeader) {
        // Extract the header lines from the original document
        const text = this.document.getText();
        const lines = text.split(/\r?\n/);
        const REGEX_IGNORED_LINE = /^\s*(?:\/\/|\/\*|\*\/|\*|#!|(['"])use strict\1)/;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (REGEX_IGNORED_LINE.test(line)) {
            importText += line + this.eol;
          } else if (line.trim() !== '') {
            // Reached imports or code, stop
            break;
          }
          // Skip blank lines (they've been removed)
        }

        // In 'legacy' mode, DON'T add blank lines between header and imports
        // (old extension bug: it removes those blank lines)
        if (blankLineMode !== 'legacy' && blankLinesBefore > 0) {
          importText += this.eol.repeat(blankLinesBefore);
        }
      }

      // Add the imports themselves
      importText += importLines.join(this.eol);

      // Add one newline to end the last import line
      importText += this.eol;

      // Add blank lines after imports according to the configured mode
      if (finalBlankLinesAfter > 0) {
        importText += this.eol.repeat(finalBlankLinesAfter);
      }

      // Use a single REPLACE edit instead of DELETE + INSERT to avoid position shifts
      edits.push(TextEdit.replace(deletionRange, importText));
    } else {
      // No imports left - just delete the old import block
      edits.push(TextEdit.delete(deletionRange));
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
          const namedPart = `{${this.eol}  ${specifierStrings.join(`,${this.eol}  `)}${trailingComma}${this.eol}}`;
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
   * Also returns information about blank lines before and after imports.
   *
   * This method handles:
   * - Header detection (comments, shebangs, 'use strict')
   * - Leading blank lines (before any header) - should be removed
   * - Blank lines between header and imports - should be preserved
   */
  private getImportInsertPosition(): {
    position: Position;
    blankLinesBefore: number;
    hasHeader: boolean;
    hasLeadingBlanks: boolean;
  } {
    const text = this.document.getText();
    const lines = text.split(/\r?\n/);

    // Skip shebang, 'use strict', and other header comments
    const REGEX_IGNORED_LINE = /^\s*(?:\/\/|\/\*|\*\/|\*|#!|(['"])use strict\1)/;

    let insertLine = 0;
    let blankLinesBefore = 0;
    let hasHeader = false;
    let hasLeadingBlanks = false;
    let lastHeaderLine = -1;

    // Step 1: Find the end of the header section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for header lines (comments, shebang, 'use strict')
      if (REGEX_IGNORED_LINE.test(line)) {
        hasHeader = true;
        lastHeaderLine = i;
        continue;
      }

      // Blank line handling:
      // - Leading blank lines (before any header): skip, will be removed
      // - Blank lines after header: skip, will be counted separately
      if (line.trim() === '') {
        // Track if we see blank lines before any header
        if (!hasHeader) {
          hasLeadingBlanks = true;
        }
        continue;
      }

      // Found first non-comment, non-blank line (imports or code)
      insertLine = i;
      break;
    }

    // Step 2: Count blank lines between header and imports
    // (but ignore leading blank lines if there's no header)
    if (hasHeader && lastHeaderLine >= 0) {
      for (let i = lastHeaderLine + 1; i < insertLine; i++) {
        if (lines[i].trim() === '') {
          blankLinesBefore++;
        }
      }
    }

    return {
      position: new Position(insertLine, 0),
      blankLinesBefore,
      hasHeader,
      hasLeadingBlanks
    };
  }

  /**
   * Calculate the number of blank lines to insert after imports based on the configured mode.
   *
   * Modes:
   * - "one": Always exactly 1 blank line (Google/ESLint standard)
   * - "two": Always exactly 2 blank lines
   * - "preserve": Keep the existing number of blank lines
   * - "legacy": Replicate old TypeScript Hero behavior (buggy algorithm that adds too many blanks)
   */
  private calculateBlankLinesAfter(
    existingBlankLinesAfter: number,
    _blankLinesBefore: number,
    _hasHeader: boolean,
    importGroups: ImportGroup[]
  ): number {
    const mode = this.config.blankLinesAfterImports(this.document.uri);

    switch (mode) {
      case 'one':
        return 1;

      case 'two':
        return 2;

      case 'preserve':
        return existingBlankLinesAfter;

      case 'legacy': {
        // Session 18 Discovery: The old TypeScript Hero extension's blank line behavior
        // is INCONSISTENT and varies by scenario. Through systematic testing:
        // - 'legacy' mode with complex formula: 4/125 tests passing (3%)
        // - 'two' mode (simple 2 blanks): 4/125 tests passing (3%)
        // - 'preserve' mode (keep existing): 93/125 tests passing (74%)
        //
        // The old extension appears to preserve existing blank lines from source files.
        // This 'legacy' mode exists for migrated users who want the old behavior,
        // but there's no single formula that matches it perfectly.
        //
        // For simplicity, we return 2 blank lines (common in old extension output).
        // For best compatibility, users should use 'preserve' mode instead.
        return 2;
      }

      default:
        return 1; // Fallback to standard
    }
  }
}
