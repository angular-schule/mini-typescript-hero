import { Project, SourceFile, Node, SyntaxKind, ImportDeclaration, ImportEqualsDeclaration, ExportDeclaration } from 'ts-morph';
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
import { importGroupSortForPrecedence } from './import-utilities';
import { ImportGroup } from './import-grouping';
import { ResolvedConfig, RenderOptions } from './organize-pipeline';
import { legacyPipeline } from './pipeline-legacy';
import { modernPipeline } from './pipeline-modern';

/**
 * Management class for the imports of a document.
 * Can organize imports (sort, group, remove unused) and generate TextEdits.
 *
 * 🌟 GOLDEN RULE 🌟
 * Our job is to ORGANIZE imports, not to DELETE what the user wrote!
 * - DO preserve comments in modern mode (user's intent matters)
 * - DO preserve import attributes/assertions (TypeScript syntax)
 * - DO preserve type-only modifiers (semantic meaning)
 * - ONLY strip these in legacy mode to match old TypeScript Hero behavior
 *
 * The extension should NEVER delete user-written content unless:
 * 1. It's an unused import AND removal is enabled
 * 2. It's legacy mode trying to match old extension behavior
 */
export class ImportManager {
  private sourceFile!: SourceFile;
  private imports: Import[] = [];
  private reExports: string[] = []; // Store re-export statements to preserve them
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

    // For untitled documents (no file extension), ts-morph needs a file extension
    // to determine the script kind. Map languageId to the correct extension.
    let fileName = this.document.fileName;
    if (!/\.(m?tsx?|[cm]?jsx?|cts)$/i.test(fileName)) {
      const extMap: Record<string, string> = {
        'typescript': '.ts',
        'typescriptreact': '.tsx',
        'javascript': '.js',
        'javascriptreact': '.jsx',
      };
      fileName += extMap[this.document.languageId] ?? '.ts';
    }

    this.sourceFile = project.createSourceFile(
      fileName,
      this.document.getText(),
    );

    // Extract imports
    this.extractImports();

    // Find used identifiers
    this.findUsedIdentifiers();
  }

  /**
   * Extract import attributes/assertions from an import declaration.
   * Returns the raw text of the attributes (e.g., "with { type: 'json' }")
   * Uses ts-morph's getAttributes() API for proper parsing (handles nested braces, comments, etc.)
   */
  private extractImportAttributes(importDecl: ImportDeclaration): string | undefined {
    try {
      const attributes = importDecl.getAttributes();
      if (!attributes) {
        return undefined;
      }

      // Return the full text including the "with" or "assert" keyword
      return attributes.getText();
    } catch (error) {
      // If extraction fails, return undefined
      return undefined;
    }
  }

  /**
   * Extract all imports from the source file.
   */
  private extractImports(): void {
    const importDeclarations = this.sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Extract import attributes/assertions (e.g., assert { type: 'json' } or with { type: 'json' })
      const attributes = this.extractImportAttributes(importDecl);

      // String-only import (e.g., import 'reflect-metadata')
      // Must check for ABSENCE of import clause, not just empty arrays
      // import {} from 'lib' has a named imports clause (even though empty)
      // import 'lib' has NO import clause
      if (!importDecl.getImportClause()) {
        this.imports.push(new StringImport(moduleSpecifier, attributes));
        continue;
      }

      // Namespace import (e.g., import * as foo from 'lib')
      // Also handles combined: import Default, * as foo from 'lib'
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        const isTypeOnly = importDecl.isTypeOnly();
        const defaultImportForNs = importDecl.getDefaultImport();
        this.imports.push(new NamespaceImport(
          moduleSpecifier,
          namespaceImport.getText(),
          defaultImportForNs?.getText(),
          isTypeOnly,
          attributes,
        ));
        continue;
      }

      // Named import (e.g., import { foo, bar} from 'lib')
      const defaultImport = importDecl.getDefaultImport();
      const namedImports = importDecl.getNamedImports();
      const isTypeOnly = importDecl.isTypeOnly();

      // Extract comments from the full import declaration text
      // ts-morph's getLeadingCommentRanges/getTrailingCommentRanges don't work reliably
      // for import specifiers, so we parse the full text manually
      const fullText = importDecl.getText();
      const specifierComments = this.extractSpecifierComments(
        fullText,
        namedImports.map(n => {
          const alias = n.getAliasNode()?.getText();
          return alias ? `${n.getName()}:${alias}` : n.getName();
        }),
      );

      const specifiers: SymbolSpecifier[] = namedImports.map(named => {
        const name = named.getName();
        const alias = named.getAliasNode()?.getText();
        const commentKey = alias ? `${name}:${alias}` : name;
        const comments = specifierComments.get(commentKey);

        return {
          specifier: name,
          alias: named.getAliasNode()?.getText(),
          isTypeOnly: named.isTypeOnly(),
          leadingComment: comments?.leading,
          trailingComment: comments?.trailing,
        };
      });

      this.imports.push(new NamedImport(
        moduleSpecifier,
        specifiers,
        defaultImport?.getText(),
        isTypeOnly,
        attributes,
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
            // Note: ExternalModuleImport (require syntax) doesn't support attributes
            this.imports.push(new ExternalModuleImport(
              moduleSpecifier,
              stmt.getName(),
              undefined  // No attributes for require() syntax
            ));
          }
        }
      }
    }

    // Extract re-export statements (export { X } from './m' or export * as ns from './m')
    // These should be preserved and placed AFTER imports
    //
    // KNOWN LIMITATION: Re-exports are preserved in original file order, not sorted/grouped.
    // Sorting re-exports could be added in a future version if there's demand.
    const exportDeclarations = this.sourceFile.getExportDeclarations();
    for (const exportDecl of exportDeclarations) {
      // Only capture re-exports (those with moduleSpecifier)
      // export { X } without 'from' is a local export, not a re-export
      const moduleSpecifier = exportDecl.getModuleSpecifier();
      if (moduleSpecifier) {
        // Preserve the full re-export statement
        this.reExports.push(exportDecl.getText());
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

    // Step 2: Handle locally re-exported symbols (export { Foo } or export default Foo)
    // These must be kept even if not used in the file itself.
    // Only mark names from LOCAL exports (no moduleSpecifier). Re-exports like
    // `export { Foo } from './bar'` reference symbols from the other module,
    // not local identifiers — they must not prevent removal of unrelated local imports.
    this.sourceFile.getExportDeclarations().forEach(exportDecl => {
      if (exportDecl.getModuleSpecifier()) {
        return;
      }
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

      // Skip if this identifier is part of a re-export (export { ... } from '...')
      // Re-exports reference symbols from the other module, not local identifiers.
      // Local exports (export { Foo }) are handled by Step 2.
      const ancestorExportDecl = identifier.getFirstAncestorByKind(SyntaxKind.ExportDeclaration);
      if (ancestorExportDecl?.getModuleSpecifier()) {
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
   * Extract comments associated with each import specifier from the full import text.
   *
   * This is necessary because ts-morph's getLeadingCommentRanges/getTrailingCommentRanges
   * don't work reliably for import specifiers embedded in import lists.
   *
   * @param fullImportText The full text of the import declaration
   * @param specifierNames Array of specifier names to look for
   * @returns Map of specifier name to { leading, trailing } comments
   */
  private extractSpecifierComments(
    fullImportText: string,
    specifierNames: string[]
  ): Map<string, { leading?: string; trailing?: string }> {
    const result = new Map<string, { leading?: string; trailing?: string }>();

    // Extract the part between first { and first } (non-greedy to avoid matching import attributes)
    const match = fullImportText.match(/\{(.+?)\}/s);
    if (!match) {
      return result;
    }

    const importList = match[1];

    // Split by commas, but we need to be careful about commas in comments
    // Simple approach: split by lines first, then process each line
    const lines = importList.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === ',') {
        continue;
      }

      // Helper: build a composite key matching what the caller uses (name or name:alias)
      const buildKey = (name: string, alias?: string): string => alias ? `${name}:${alias}` : name;

      // Check for leading block comment: /* comment */ specifier
      const leadingBlockMatch = trimmed.match(/^(\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)\s*(.+)/);
      if (leadingBlockMatch) {
        const comment = leadingBlockMatch[1];
        const rest = leadingBlockMatch[2];

        // Extract specifier name and optional alias from rest
        // Use \p{ID_Continue} to match all valid ECMAScript identifier characters (including Unicode)
        const specMatch = rest.match(/^(?:type\s+)?([\p{ID_Continue}$]+)(?:\s+as\s+([\p{ID_Continue}$]+))?/u);
        if (specMatch) {
          const key = buildKey(specMatch[1], specMatch[2]);
          if (specifierNames.includes(key)) {
            const existing = result.get(key) || {};
            existing.leading = comment;
            result.set(key, existing);
          }
        }
        continue;
      }

      // Check for trailing line comment: specifier // comment
      // Use \p{ID_Continue} to match all valid ECMAScript identifier characters (including Unicode)
      const trailingLineMatch = trimmed.match(/^(?:type\s+)?([\p{ID_Continue}$]+)(?:\s+as\s+([\p{ID_Continue}$]+))?\s*,?\s*(\/\/.*?)$/u);
      if (trailingLineMatch) {
        const key = buildKey(trailingLineMatch[1], trailingLineMatch[2]);
        const comment = trailingLineMatch[3];

        if (specifierNames.includes(key)) {
          const existing = result.get(key) || {};
          existing.trailing = comment;
          result.set(key, existing);
        }
        continue;
      }

      // Regular specifier without comments
      // Use \p{ID_Continue} to match all valid ECMAScript identifier characters (including Unicode)
      const regularMatch = trimmed.match(/^(?:type\s+)?([\p{ID_Continue}$]+)(?:\s+as\s+([\p{ID_Continue}$]+))?/u);
      if (regularMatch) {
        const key = buildKey(regularMatch[1], regularMatch[2]);
        if (specifierNames.includes(key) && !result.has(key)) {
          result.set(key, {});
        }
      }
    }

    return result;
  }

  /**
   * Organize imports: remove unused, sort, and group.
   * Returns TextEdits to apply the changes.
   *
   * Dispatches to the appropriate pipeline (modern or legacy) for filtering,
   * sorting, and merging. Grouping and text generation are shared.
   */
  public async organizeImports(): Promise<TextEdit[]> {
    const isLegacy = this.config.legacyMode(this.document.uri);

    // Resolve config values once (avoid repeated config.xyz(uri) calls in pipeline)
    const resolvedConfig: ResolvedConfig = {
      disableImportRemovalOnOrganize: this.config.disableImportRemovalOnOrganize(this.document.uri),
      ignoredFromRemoval: this.config.ignoredFromRemoval(this.document.uri),
      disableImportsSorting: this.config.disableImportsSorting(this.document.uri),
      organizeSortsByFirstSpecifier: this.config.organizeSortsByFirstSpecifier(this.document.uri),
      removeTrailingIndex: this.config.removeTrailingIndex(this.document.uri),
      mergeImportsFromSameModule: this.config.mergeImportsFromSameModule(this.document.uri),
    };

    const input = {
      imports: this.imports,
      usedIdentifiers: this.usedIdentifiers,
    };

    // Dispatch to appropriate pipeline
    const organized = isLegacy
      ? legacyPipeline(input, resolvedConfig)
      : modernPipeline(input, resolvedConfig);

    // Group imports (shared logic)
    const importGroups = this.config.grouping(this.document.uri);
    for (const group of importGroups) {
      group.reset();
    }

    const groupsWithPrecedence = importGroupSortForPrecedence(importGroups);
    for (const imp of organized) {
      for (const group of groupsWithPrecedence) {
        if (group.processImport(imp)) {
          break;
        }
      }
    }

    // Generate text edits (shared, parameterized by mode)
    const renderOptions: RenderOptions = {
      renderTypeKeywords: !isLegacy,
      alwaysSortWithinGroups: isLegacy,
      preserveBlankLinesBeforeImports: !isLegacy,
    };

    return await this.generateTextEdits(importGroups, renderOptions);
  }

  /**
   * Generate TextEdits to replace the old imports with the new organized imports.
   */
  private async generateTextEdits(importGroups: ImportGroup[], renderOptions: RenderOptions): Promise<TextEdit[]> {
    const edits: TextEdit[] = [];

    // Get the range of all import declarations (both modern and old-style)
    const importDeclarations = this.sourceFile.getImportDeclarations();
    const importEquals = this.sourceFile.getStatements()
      .filter(stmt => Node.isImportEqualsDeclaration(stmt)) as ImportEqualsDeclaration[];

    // Build list of actual imports (without re-exports)
    const actualImports: Array<ImportDeclaration | ImportEqualsDeclaration> = [
      ...importDeclarations,
      ...importEquals,
    ];

    // If there are no actual imports, nothing to organize.
    // Re-exports alone (e.g., barrel files) don't need sorting/grouping.
    if (actualImports.length === 0) {
      return edits;
    }

    // Get re-export declarations (export { X } from './m')
    const exportDeclarations = this.sourceFile.getExportDeclarations()
      .filter(exportDecl => exportDecl.getModuleSpecifier() !== undefined);

    // Only include re-exports that are contiguous with the import block
    // (no code lines between them - only blank lines and comments allowed).
    // This prevents accidentally deleting code between imports and distant re-exports.
    const adjacentExports = this.findAdjacentExports(actualImports, exportDeclarations);

    // Filter re-exports to only include adjacent ones (non-adjacent stay in place).
    // Derive directly from adjacentExports by position to avoid duplicating
    // non-adjacent re-exports that happen to have identical text.
    let reExportsToOutput = this.reExports;
    if (adjacentExports.length < exportDeclarations.length) {
      reExportsToOutput = adjacentExports.map(e => e.getText());
    }

    // Combine imports and adjacent re-exports for range calculation
    const allImports: Array<ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration> = [
      ...actualImports,
      ...adjacentExports,
    ];

    if (allImports.length === 0) {
      return edits;
    }

    // Sort by position to find first and last
    allImports.sort((a, b) => a.getStart() - b.getStart());

    // Get the position info including blank lines before imports
    const { blankLinesBefore, hasHeader, hasLeadingBlanks, headerStartLine } = this.getImportInsertPosition();

    // Calculate the full range of imports to replace (excluding any header)
    const firstImport = allImports[0];
    const lastImport = allImports[allImports.length - 1];

    let importSectionStartLine = firstImport.getStartLineNumber() - 1; // Convert to 0-indexed
    let importSectionEndLine = lastImport.getEndLineNumber() - 1;

    // Delete leading blank lines before header or imports (if any) as a separate edit.
    // IMPORTANT: Only delete actual blank lines! Non-header content between leading blanks
    // and imports (e.g., 'use client', 'use server') must be preserved.
    if (hasLeadingBlanks) {
      const deleteToLine = headerStartLine > 0 ? headerStartLine : importSectionStartLine;
      if (deleteToLine > 0) {
        // Find the contiguous block of blank lines starting from line 0
        let lastBlankLine = -1;
        for (let i = 0; i < deleteToLine; i++) {
          if (this.document.lineAt(i).text.trim() === '') {
            lastBlankLine = i;
          } else {
            break; // Stop at first non-blank line
          }
        }
        if (lastBlankLine >= 0) {
          const leadingBlanksRange = new Range(
            new Position(0, 0),
            new Position(lastBlankLine + 1, 0),
          );
          edits.push(TextEdit.delete(leadingBlanksRange));
        }
      }
    }

    // Extract comments and non-import code between imports.
    // Old TypeScript Hero deletes imports individually (preserving everything else).
    // We replace the entire range, so we MUST extract and preserve all non-import content.
    //
    // GOLDEN RULE: NEVER delete user code or comments!
    //
    // KNOWN LIMITATION: Comments INSIDE multiline import braces are not preserved.
    // Example: `import { Foo, /* comment */ Bar } from 'lib'` - the comment is lost.
    // This is complex to fix and is an edge case. Standalone comments between imports ARE preserved.
    const commentsBetweenImports: string[] = [];
    const codeBetweenImports: string[] = [];
    let insideBlockComment = false;
    for (let i = importSectionStartLine; i <= importSectionEndLine; i++) {
      const lineNumber = i + 1; // Convert to 1-indexed for comparison with ts-morph

      // Check if this line is within any import declaration
      const isWithinImport = allImports.some(imp => {
        const start = imp.getStartLineNumber();
        const end = imp.getEndLineNumber();
        return lineNumber >= start && lineNumber <= end;
      });

      // Only check for standalone comments/code if the line is NOT within an import
      if (!isWithinImport) {
        const lineText = this.document.lineAt(i).text;
        const trimmedText = lineText.trim();

        // Track multi-line block comments (/* ... */ spanning multiple lines)
        if (insideBlockComment) {
          commentsBetweenImports.push(lineText);
          if (trimmedText.includes('*/')) {
            insideBlockComment = false;
          }
          continue;
        }

        // Check for standalone comments
        // Match block comment continuation lines (* or */) but not code starting with * (e.g., generator calls)
        const isBlockCommentContinuation = trimmedText.startsWith('*') &&
          (trimmedText.length === 1 || trimmedText[1] === ' ' || trimmedText[1] === '/' || trimmedText[1] === '*');
        const isStandaloneComment = trimmedText.startsWith('//') ||
                                     trimmedText.startsWith('/*') ||
                                     isBlockCommentContinuation;

        if (isStandaloneComment) {
          commentsBetweenImports.push(lineText);
          if (trimmedText.startsWith('/*') && !trimmedText.includes('*/')) {
            insideBlockComment = true;
          }
        } else if (trimmedText.length > 0) {
          // GOLDEN RULE: Preserve non-import code between imports!
          // This handles side-effect calls, variable declarations, etc.
          // The old TypeScript Hero also preserves these (it deletes imports individually).
          codeBetweenImports.push(lineText);
        }
      }
    }

    // Include blank lines before first import (but not header) in the replace range.
    // When hasLeadingBlanks is true AND there's no header, the leading blank deletion range
    // goes up to importSectionStartLine, so extending backwards would create overlapping ranges.
    // But when hasLeadingBlanks is true AND there IS a header, the leading blank deletion only
    // covers lines before the header, so blanks between header and imports are safe to include.
    if (blankLinesBefore > 0 && (!hasLeadingBlanks || hasHeader)) {
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
    // Only add blank lines if there's code after the imports
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

    // Cache formatting config values once (avoid repeated lookups per import)
    const quote = await this.config.stringQuoteStyle(this.document.uri);
    const semi = (await this.config.insertSemicolons(this.document.uri)) ? ';' : '';
    const spaceInBraces = this.config.insertSpaceBeforeAndAfterImportBraces(this.document.uri);
    const indent = this.config.indentation(this.document.uri);

    for (const group of importGroups) {
      if (group.imports.length === 0) {
        continue;
      }

      // Choose which import list to use:
      //
      // LEGACY MODE (alwaysSortWithinGroups = true):
      // - Always use group.sortedImports (sorted by library name)
      // - Ignores disableImportsSorting and organizeSortsByFirstSpecifier
      // - This replicates the old TypeScript Hero's "Level 2 sorting" bug
      //
      // MODERN MODE (alwaysSortWithinGroups = false):
      // - If sorting is DISABLED: use pre-sorted order (group.imports)
      // - If sorting by FIRST SPECIFIER: use pre-sorted order (group.imports) - sorted in pipeline
      // - If sorting by LIBRARY NAME: re-sort within group (group.sortedImports)
      const importsToUse = renderOptions.alwaysSortWithinGroups
        ? group.sortedImports
        : (useSorting && !useFirstSpecifierSort)
          ? group.sortedImports
          : group.imports;
      const groupLines = await Promise.all(importsToUse.map(imp =>
        this.generateImportStatement(imp, quote, semi, spaceInBraces, indent, renderOptions.renderTypeKeywords),
      ));
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
      // Modern mode: Preserve blank lines between header and imports
      if (renderOptions.preserveBlankLinesBeforeImports && hasHeader && blankLinesBefore > 0) {
        importText += this.eol.repeat(blankLinesBefore);
      }

      // Add the imports themselves
      importText += importLines.join(this.eol);

      // Add one newline to end the last import line
      importText += this.eol;

      // Determine if there's inter-import content (comments or code between imports).
      // When there IS inter-import content, blank lines must go AFTER all preserved content
      // (including re-exports) to prevent re-exports from being glued to subsequent code.
      // When there's NO inter-import content, keep blank lines BEFORE re-exports (old behavior).
      const hasInterImportContent = codeBetweenImports.length > 0;

      if (!hasInterImportContent) {
        // Standard case: blank lines between imports and re-exports (matches old extension)
        if (finalBlankLinesAfter > 0) {
          importText += this.eol.repeat(finalBlankLinesAfter);
        }
      }

      // Add comments that were between imports (move them after imports)
      if (commentsBetweenImports.length > 0) {
        importText += commentsBetweenImports.join(this.eol);
        importText += this.eol;
      }

      // GOLDEN RULE: Preserve non-import code that was between imports
      // (e.g., side-effect calls like `config.init()`, variable declarations)
      if (codeBetweenImports.length > 0) {
        importText += codeBetweenImports.join(this.eol);
        importText += this.eol;
      }

      // Add re-export statements after imports (preserves export { X } from './m')
      if (reExportsToOutput.length > 0) {
        importText += reExportsToOutput.join(this.eol);
        importText += this.eol;
      }

      if (hasInterImportContent) {
        // Inter-import content present: blank lines AFTER all preserved content.
        // This ensures re-exports aren't glued to subsequent code.
        if (finalBlankLinesAfter > 0) {
          importText += this.eol.repeat(finalBlankLinesAfter);
        }
      }

      // Create the replace edit
      const replaceRange = new Range(
        this.document.lineAt(importSectionStartLine).range.start,
        this.document.lineAt(importSectionEndLine).rangeIncludingLineBreak.end,
      );
      edits.push(TextEdit.replace(replaceRange, importText));
    } else if (reExportsToOutput.length > 0 || commentsBetweenImports.length > 0) {
      // No imports, but re-exports and/or comments need to be preserved
      let replacementText = '';
      if (commentsBetweenImports.length > 0) {
        replacementText += commentsBetweenImports.join(this.eol);
        replacementText += this.eol;
      }
      if (reExportsToOutput.length > 0) {
        replacementText += reExportsToOutput.join(this.eol);
        replacementText += this.eol;
      }
      if (finalBlankLinesAfter > 0) {
        replacementText += this.eol.repeat(finalBlankLinesAfter);
      }
      const replaceRange = new Range(
        this.document.lineAt(importSectionStartLine).range.start,
        this.document.lineAt(importSectionEndLine).rangeIncludingLineBreak.end,
      );
      edits.push(TextEdit.replace(replaceRange, replacementText));
    } else {
      // Truly nothing to keep — delete the old import section
      const deleteRange = new Range(
        this.document.lineAt(importSectionStartLine).range.start,
        this.document.lineAt(importSectionEndLine).rangeIncludingLineBreak.end,
      );
      edits.push(TextEdit.delete(deleteRange));
    }

    return edits;
  }

  /**
   * Find re-export declarations that are adjacent to the import block.
   * A re-export is "adjacent" if there are only blank lines and comments
   * between it and the import section (no code).
   */
  private findAdjacentExports(
    actualImports: Array<ImportDeclaration | ImportEqualsDeclaration>,
    exportDeclarations: ExportDeclaration[],
  ): ExportDeclaration[] {
    if (exportDeclarations.length === 0) {
      return [];
    }

    const sortedImports = [...actualImports].sort((a, b) => a.getStart() - b.getStart());
    const sortedExports = [...exportDeclarations].sort((a, b) => a.getStart() - b.getStart());

    const lastImportLine = sortedImports[sortedImports.length - 1].getEndLineNumber(); // 1-indexed

    const adjacent: ExportDeclaration[] = [];

    for (const exportDecl of sortedExports) {
      const exportStartLine = exportDecl.getStartLineNumber(); // 1-indexed

      if (exportStartLine <= lastImportLine) {
        // Re-export is within or before the import block - always include
        adjacent.push(exportDecl);
        continue;
      }

      // Re-export is after the import block.
      // Check if there's only blank lines/comments between the section end and this re-export.
      const sectionEndLine = adjacent.length > 0
        ? Math.max(lastImportLine, ...adjacent.map(e => e.getEndLineNumber()))
        : lastImportLine;

      let isAdjacent = true;
      for (let line1 = sectionEndLine + 1; line1 < exportStartLine; line1++) {
        const lineText = this.document.lineAt(line1 - 1).text.trim(); // lineAt is 0-indexed
        if (lineText !== '' && !lineText.startsWith('//') && !lineText.startsWith('/*') && !lineText.startsWith('*')) {
          isAdjacent = false;
          break;
        }
      }

      if (isAdjacent) {
        adjacent.push(exportDecl);
      } else {
        break; // Non-adjacent → all subsequent re-exports are also non-adjacent
      }
    }

    return adjacent;
  }

  /**
   * Generate a single import statement string.
   * @param quote Quote style (' or ")
   * @param semi Semicolon string (';' or '')
   * @param spaceInBraces Whether to insert spaces in braces
   * @param indent Indentation string for multiline imports (e.g., '  ' or '\t')
   */
  private async generateImportStatement(
    imp: Import,
    quote: '"' | '\'',
    semi: string,
    spaceInBraces: boolean,
    indent: string,
    renderTypeKeywords: boolean,
  ): Promise<string> {
    const attrs = imp.attributes ? ` ${imp.attributes}` : '';

    if (imp instanceof StringImport) {
      return `import ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
    }

    if (imp instanceof NamespaceImport) {
      const typeKeyword = imp.isTypeOnly && renderTypeKeywords ? 'type ' : '';
      const defaultPart = imp.defaultAlias ? `${imp.defaultAlias}, ` : '';
      return `import ${typeKeyword}${defaultPart}* as ${imp.alias} from ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
    }

    if (imp instanceof ExternalModuleImport) {
      return `import ${imp.alias} = require(${quote}${imp.libraryName}${quote})${attrs}${semi}`;
    }

    if (imp instanceof NamedImport) {
      // Handle empty NamedImport (import {} from 'lib') — render as side-effect import
      // This can happen when disableImportRemovalOnOrganize is true or library is in ignoredFromRemoval
      if (!imp.defaultAlias && imp.specifiers.length === 0) {
        return `import ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
      }

      const parts: string[] = [];

      // Add 'type' keyword for type-only imports (TS 3.8+)
      const typeKeyword = imp.isTypeOnly && renderTypeKeywords ? 'type ' : '';

      // Default import
      if (imp.defaultAlias) {
        parts.push(imp.defaultAlias);
      }

      // Named imports
      if (imp.specifiers.length > 0) {
        // Check if any specifiers have comments (forces multiline)
        const hasComments = imp.specifiers.some(s => s.leadingComment || s.trailingComment);

        const specifierStrings = imp.specifiers.map(spec => {
          const baseSpec = spec.alias ? `${spec.specifier} as ${spec.alias}` : spec.specifier;
          const isSpecTypeOnly = spec.isTypeOnly && renderTypeKeywords;
          const typePrefix = isSpecTypeOnly ? 'type ' : '';
          let result = `${typePrefix}${baseSpec}`;

          // Preserve comments (in both modes — GOLDEN RULE: never delete user content)
          if (spec.leadingComment) {
            result = `${spec.leadingComment} ${result}`;
          }
          if (spec.trailingComment) {
            result = `${result} ${spec.trailingComment}`;
          }

          return result;
        });

        const specifiersText = specifierStrings.join(', ');
        const braceOpen = spaceInBraces ? '{ ' : '{';
        const braceClose = spaceInBraces ? ' }' : '}';

        // Check if it should be multiline
        // Measure the FULL import line length (not just the brace part) against threshold
        const threshold = this.config.multiLineWrapThreshold(this.document.uri);
        const defaultPart = imp.defaultAlias ? `${imp.defaultAlias}, ` : '';
        const bracePart = `${braceOpen}${specifiersText}${braceClose}`;
        const fromPart = ` from ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
        const fullLine = `import ${typeKeyword}${defaultPart}${bracePart}${fromPart}`;

        // Force multiline if there are comments
        if (hasComments || (fullLine.length > threshold && imp.specifiers.length > 1)) {
          // Multiline
          const trailingComma = this.config.multiLineTrailingComma(this.document.uri) ? ',' : '';

          // When we have trailing comments, we need to place the comma BEFORE the comment
          // e.g., "B, // end" not "B // end,"
          const formattedSpecifiers = imp.specifiers.map((spec, index) => {
            const baseSpec = spec.alias ? `${spec.specifier} as ${spec.alias}` : spec.specifier;
            const isSpecTypeOnly = spec.isTypeOnly && renderTypeKeywords;
            const typePrefix = isSpecTypeOnly ? 'type ' : '';
            let result = `${typePrefix}${baseSpec}`;

            // Preserve comments with proper comma placement (GOLDEN RULE: never delete user content)
            if (spec.leadingComment) {
              result = `${spec.leadingComment} ${result}`;
            }

            // Add comma before trailing comment
            const needsComma = index < imp.specifiers.length - 1 || trailingComma;
            if (needsComma) {
              result = `${result},`;
            }

            // Add trailing comment after the comma
            if (spec.trailingComment) {
              result = `${result} ${spec.trailingComment}`;
            }

            return result;
          });

          const namedPart = `{${this.eol}${indent}${formattedSpecifiers.join(this.eol + indent)}${this.eol}}`;
          parts.push(namedPart);
        } else {
          parts.push(bracePart);
        }
      }

      return `import ${typeKeyword}${parts.join(', ')} from ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
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
    let insideBlockComment = false;

    // Step 1: Find the end of the header section
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track block comment state: lines inside /* ... */ are header lines
      // even if they don't start with * (e.g., plain text continuation lines)
      if (insideBlockComment) {
        if (!hasHeader) {
          headerStartLine = i;
        }
        hasHeader = true;
        lastHeaderLine = i;
        if (trimmed.includes('*/')) {
          insideBlockComment = false;
        }
        continue;
      }

      // Check for header lines (comments, shebang, 'use strict')
      if (REGEX_IGNORED_LINE.test(line)) {
        if (!hasHeader) {
          headerStartLine = i; // First header line
        }
        hasHeader = true;
        lastHeaderLine = i;
        // Detect block comment start without close on the same line
        if (trimmed.includes('/*') && !trimmed.includes('*/')) {
          insideBlockComment = true;
        }
        continue;
      }

      // Blank line handling:
      // - Leading blank lines (before any header): count them, will be removed
      // - Blank lines after header: skip, will be counted separately
      if (trimmed === '') {
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
    // When a header exists, we only care about blank lines AFTER the header (before imports).
    // Leading blanks BEFORE the header are handled separately via hasLeadingBlanks.
    if (hasHeader && lastHeaderLine >= 0) {
      blankLinesBefore = 0; // Reset to count only blanks between header and imports
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
