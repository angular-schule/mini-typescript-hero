import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import { EndOfLine, Position, Range, TextDocument, TextEdit } from 'vscode';

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
      // Must check for ABSENCE of import clause, not just empty arrays
      // import {} from 'lib' has a named imports clause (even though empty)
      // import 'lib' has NO import clause
      if (!importDecl.getImportClause()) {
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
   * Helper method to remove trailing /index from import library names.
   * Creates new Import objects instead of mutating readonly properties.
   */
  private removeTrailingIndexFromImports(imports: Import[]): Import[] {
    return imports.map(imp => {
      if (!imp.libraryName.endsWith('/index')) {
        return imp;
      }
      const newLibraryName = imp.libraryName.replace(/\/index$/, '');

      // Create new import object instead of mutating readonly property
      if (imp instanceof NamedImport) {
        return new NamedImport(newLibraryName, imp.specifiers, imp.defaultAlias);
      } else if (imp instanceof NamespaceImport) {
        return new NamespaceImport(newLibraryName, imp.alias);
      } else if (imp instanceof ExternalModuleImport) {
        return new ExternalModuleImport(newLibraryName, imp.alias);
      } else if (imp instanceof StringImport) {
        return new StringImport(newLibraryName);
      }
      return imp;
    });
  }

  /**
   * Organize imports: remove unused, sort, and group.
   * Returns TextEdits to apply the changes.
   */
  public organizeImports(): TextEdit[] {
    let keep: Import[] = [];

    // Filter unused imports (unless disabled)
    if (this.config.disableImportRemovalOnOrganize(this.document.uri)) {
      // In legacy mode, TypeScript Hero ALWAYS sorted specifiers, even with removal disabled
      // In modern mode, preserve imports exactly as-is (including unsorted specifiers)
      if (this.config.legacyMode(this.document.uri)) {
        // Legacy: Sort specifiers within each import
        keep = this.imports.map(imp => {
          if (imp instanceof NamedImport && imp.specifiers.length > 0) {
            const sortedSpecifiers = [...imp.specifiers].sort(specifierSort);
            return new NamedImport(imp.libraryName, sortedSpecifiers, imp.defaultAlias);
          }
          return imp;
        });
      } else {
        // Modern: Preserve everything as-is
        keep = this.imports;
      }
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

            // OLD extension behavior (legacy mode): Keep default even if unused, as long as ANY specifiers exist
            // NEW extension behavior (modern mode): Only keep default if it's actually used
            const keepDefault = this.config.legacyMode(this.document.uri)
              ? (usedSpecifiers.length > 0 && imp.defaultAlias) || defaultUsed  // Legacy: Keep if specifiers OR used
              : defaultUsed;  // Modern: Keep only if used

            keep.push(new NamedImport(
              imp.libraryName,
              usedSpecifiers,
              keepDefault ? imp.defaultAlias : undefined,
            ));
          }
          // else: Remove the import entirely (no used specifiers or default)
          // Both old and new extensions remove empty imports like `import {} from './lib'`
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

    // Remove trailing /index BEFORE merging (modern mode only)
    // In modern mode, /index removal happens first so imports like './lib/index' and './lib' can merge
    // In legacy mode, we do it after merging to replicate the old extension's bug
    if (this.config.removeTrailingIndex(this.document.uri) && !this.config.legacyMode(this.document.uri)) {
      keep = this.removeTrailingIndexFromImports(keep);
    }

    //  Merge imports from same module (configurable)
    // Default: true (new users) | false (migrated users who had disableImportRemovalOnOrganize: true)
    //
    // ORDER MATTERS for removeTrailingIndex:
    // - OLD extension: merges FIRST, then removes /index (wrong order!)
    //   Result: './lib/index' and './lib' are different libraries, don't merge
    // - NEW extension (modern mode): removes /index FIRST, then merges (correct!)
    //   Result: Both become './lib', DO merge
    // - NEW extension (legacy mode): merge FIRST to match old extension bug
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
        const namedImports = imports.filter(i => i instanceof NamedImport) as NamedImport[];

        // Merge ONLY named imports - keep others in original order
        let mergedNamed: NamedImport | null = null;
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
          // BUT: In legacy mode, keep duplicates (old extension behavior)
          let finalSpecifiers = allSpecifiers;
          if (!this.config.legacyMode(this.document.uri)) {
            finalSpecifiers = allSpecifiers.filter((spec, index, self) =>
              index === self.findIndex(s =>
                s.specifier === spec.specifier && s.alias === spec.alias
              )
            );
          }

          // Sort specifiers
          finalSpecifiers.sort(specifierSort);

          mergedNamed = new NamedImport(
            namedImports[0].libraryName,
            finalSpecifiers,
            mergedDefault,
          );
        }

        // Now go through in ORIGINAL order and add imports
        // Replace all NamedImports with the merged one (first occurrence)
        let namedAdded = false;
        for (const imp of imports) {
          if (imp instanceof NamedImport) {
            if (!namedAdded && mergedNamed) {
              merged.push(mergedNamed);
              namedAdded = true;
            }
            // Skip other NamedImports (already merged)
          } else {
            // String or Namespace - cannot merge, keep as-is
            merged.push(imp);
          }
        }
      }

      keep = merged;
    }
    // else: Keep imports as-is (no merging)

    // Remove trailing /index AFTER merging (legacy mode only)
    // In legacy mode, we replicate the old extension's bug where /index removal happens after merging
    // This means './lib/index' and './lib' won't merge because they're different at merge time
    if (this.config.removeTrailingIndex(this.document.uri) && this.config.legacyMode(this.document.uri)) {
      keep = this.removeTrailingIndexFromImports(keep);
    }

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
    const { blankLinesBefore, hasHeader, hasLeadingBlanks, headerStartLine } = this.getImportInsertPosition();

    // Delete leading blank lines before header (if any) as a separate edit
    if (hasLeadingBlanks && headerStartLine > 0) {
      const leadingBlanksRange = new Range(
        new Position(0, 0),
        new Position(headerStartLine, 0),
      );
      edits.push(TextEdit.delete(leadingBlanksRange));
    }

    // Calculate the full range of imports to replace (excluding any header)
    const firstImport = allImports[0];
    const lastImport = allImports[allImports.length - 1];

    let importSectionStartLine = firstImport.getStartLineNumber() - 1; // Convert to 0-indexed
    let importSectionEndLine = lastImport.getEndLineNumber() - 1;

    // Extract comments between imports (old TypeScript Hero moves them after imports)
    const commentsBetweenImports: string[] = [];
    for (let i = importSectionStartLine; i <= importSectionEndLine; i++) {
      const lineText = this.document.lineAt(i).text;
      const trimmedText = lineText.trim();
      // Check if line is a comment (and not an import statement)
      // Check the trimmed version but preserve the original with indentation
      if ((trimmedText.startsWith('//') || trimmedText.startsWith('/*') || trimmedText.startsWith('*')) &&
          !trimmedText.includes('import ')) {
        commentsBetweenImports.push(lineText);
      }
    }

    // Include blank lines before first import (but not header)
    if (blankLinesBefore > 0) {
      importSectionStartLine = Math.max(0, importSectionStartLine - blankLinesBefore);
    }

    // Count and include blank lines after last import in the range
    let existingBlankLinesAfter = 0;
    let scanLine = importSectionEndLine + 1;
    while (scanLine < this.document.lineCount) {
      const line = this.document.lineAt(scanLine);
      if (line.text.trim() === '') {
        existingBlankLinesAfter++;
        importSectionEndLine = scanLine; // Extend range to include these blanks
        scanLine++;
      } else {
        break;
      }
    }

    // Calculate how many blank lines to insert after imports based on mode
    const hasCodeAfter = scanLine < this.document.lineCount;
    const finalBlankLinesAfter = hasCodeAfter ? this.calculateBlankLinesAfter(
      existingBlankLinesAfter,
      blankLinesBefore,
      hasHeader,
      importGroups
    ) : 0;

    // Now we'll replace the entire import section with the new organized imports

    // Generate new import text
    const importLines: string[] = [];
    const useSorting = !this.config.disableImportsSorting(this.document.uri);
    const useFirstSpecifierSort = this.config.organizeSortsByFirstSpecifier(this.document.uri);
    const useLegacyWithinGroupSorting = this.config.legacyWithinGroupSorting(this.document.uri);

    for (const group of importGroups) {
      if (group.imports.length === 0) {
        continue;
      }

      // Choose which import list to use:
      //
      // LEGACY MODE (replicates old TypeScript Hero bug):
      // - Always use group.sortedImports (sorted by library name)
      // - Ignores disableImportsSorting and organizeSortsByFirstSpecifier
      // - This is the "Level 2 sorting" bug from the old extension
      //
      // MODERN MODE (correct behavior):
      // - If sorting is DISABLED: use pre-sorted order (group.imports)
      // - If sorting by FIRST SPECIFIER: use pre-sorted order (group.imports) - sorted in organizeImports()
      // - If sorting by LIBRARY NAME: re-sort within group (group.sortedImports)
      const importsToUse = useLegacyWithinGroupSorting
        ? group.sortedImports // Legacy: always sort within groups (bug!)
        : (useSorting && !useFirstSpecifierSort)
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

      // Legacy mode: Remove blank lines between header and imports (old TypeScript Hero behavior)
      // Modern modes: Preserve blank lines between header and imports
      if (!this.config.legacyMode(this.document.uri) && hasHeader && blankLinesBefore > 0) {
        importText += this.eol.repeat(blankLinesBefore);
      }

      // Add the imports themselves
      importText += importLines.join(this.eol);

      // Add one newline to end the last import line
      importText += this.eol;

      // Add blank lines after imports according to the configured mode
      if (finalBlankLinesAfter > 0) {
        importText += this.eol.repeat(finalBlankLinesAfter);
      }

      // Add comments that were between imports (move them after imports)
      if (commentsBetweenImports.length > 0) {
        importText += commentsBetweenImports.join(this.eol);
        importText += this.eol;
      }

      // Create the replace edit
      const replaceRange = new Range(
        this.document.lineAt(importSectionStartLine).range.start,
        this.document.lineAt(importSectionEndLine).rangeIncludingLineBreak.end,
      );
      edits.push(TextEdit.replace(replaceRange, importText));
    } else {
      // No imports to insert, just delete the old import section
      const deleteRange = new Range(
        this.document.lineAt(importSectionStartLine).range.start,
        this.document.lineAt(importSectionEndLine).rangeIncludingLineBreak.end,
      );
      edits.push(TextEdit.delete(deleteRange));
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
    headerStartLine: number;
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
    let headerStartLine = -1;

    // Step 1: Find the end of the header section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for header lines (comments, shebang, 'use strict')
      if (REGEX_IGNORED_LINE.test(line)) {
        if (!hasHeader) {
          headerStartLine = i; // First header line
        }
        hasHeader = true;
        lastHeaderLine = i;
        continue;
      }

      // Blank line handling:
      // - Leading blank lines (before any header): count them, will be removed
      // - Blank lines after header: skip, will be counted separately
      if (line.trim() === '') {
        // Track if we see blank lines before any header
        if (!hasHeader) {
          hasLeadingBlanks = true;
          blankLinesBefore++; // Use blankLinesBefore to count leading blanks when no header
        }
        continue;
      }

      // Found first non-comment, non-blank line (imports or code)
      insertLine = i;
      break;
    }

    // Step 2: Count blank lines between header and imports
    // IMPORTANT: Reset blankLinesBefore if we found a header
    // Leading blanks before the header should NOT be deleted
    if (hasHeader && lastHeaderLine >= 0) {
      blankLinesBefore = 0; // Reset - we only care about blanks AFTER header
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
      hasLeadingBlanks,
      headerStartLine
    };
  }

  /**
   * Calculate the number of blank lines to insert after imports based on the configured mode.
   *
   * Modes:
   * - "one": Always exactly 1 blank line (Google/ESLint standard)
   * - "two": Always exactly 2 blank lines
   * - "preserve": Keep the existing number of blank lines
   *
   * Legacy Mode Override:
   * When legacyMode is true, TypeScript Hero's behavior is:
   * - With header AND blank line before imports: Remove blank before, add 2 blanks after
   * - With header but NO blank line before imports: Use 'preserve' mode
   * - Without header: Use 'preserve' mode
   */
  private calculateBlankLinesAfter(
    existingBlankLinesAfter: number,
    blankLinesBefore: number,
    hasHeader: boolean,
    _importGroups: ImportGroup[]
  ): number {
    // Legacy mode: TypeScript Hero's behavior
    if (this.config.legacyMode(this.document.uri)) {
      // With header AND blank line before imports: Remove blank before, add 2 blanks after
      if (hasHeader && blankLinesBefore > 0) {
        return 2;
      }

      // Without header but WITH leading blanks: Add blankLinesBefore + existingBlankLinesAfter
      // This is a quirk of the old extension - it adds extra blank lines
      if (!hasHeader && blankLinesBefore > 0) {
        return blankLinesBefore + existingBlankLinesAfter;
      }
    }

    const mode = this.config.blankLinesAfterImports(this.document.uri);

    switch (mode) {
      case 'one':
        return 1;

      case 'two':
        return 2;

      case 'preserve':
        return existingBlankLinesAfter;

      default:
        return 1; // Fallback to standard
    }
  }
}
