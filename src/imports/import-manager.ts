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
import { importSort, importSortByFirstSpecifier, specifierSort, importGroupSortForPrecedence } from './import-utilities';
import { ImportGroup } from './import-grouping';

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
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        const isTypeOnly = importDecl.isTypeOnly();
        this.imports.push(new NamespaceImport(
          moduleSpecifier,
          namespaceImport.getText(),
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
      const specifierComments = this.extractSpecifierComments(fullText, namedImports.map(n => n.getName()));

      const specifiers: SymbolSpecifier[] = namedImports.map(named => {
        const name = named.getName();
        const comments = specifierComments.get(name);

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

    // Extract the part between { and }
    const match = fullImportText.match(/\{([^}]+)\}/s);
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

      // Check for leading block comment: /* comment */ specifier
      const leadingBlockMatch = trimmed.match(/^(\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)\s*(.+)/);
      if (leadingBlockMatch) {
        const comment = leadingBlockMatch[1];
        const rest = leadingBlockMatch[2];

        // Extract specifier name from rest (might be "A," or "A as B," etc.)
        const specMatch = rest.match(/^(?:type\s+)?(\w+)/);
        if (specMatch) {
          const specName = specMatch[1];
          if (specifierNames.includes(specName)) {
            const existing = result.get(specName) || {};
            existing.leading = comment;
            result.set(specName, existing);
          }
        }
        continue;
      }

      // Check for trailing line comment: specifier // comment
      const trailingLineMatch = trimmed.match(/^(?:type\s+)?(\w+)(?:\s+as\s+\w+)?\s*,?\s*(\/\/.*?)$/);
      if (trailingLineMatch) {
        const specName = trailingLineMatch[1];
        const comment = trailingLineMatch[2];

        if (specifierNames.includes(specName)) {
          const existing = result.get(specName) || {};
          existing.trailing = comment;
          result.set(specName, existing);
        }
        continue;
      }

      // Regular specifier without comments
      const regularMatch = trimmed.match(/^(?:type\s+)?(\w+)/);
      if (regularMatch) {
        const specName = regularMatch[1];
        if (specifierNames.includes(specName) && !result.has(specName)) {
          result.set(specName, {});
        }
      }
    }

    return result;
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
        return new NamedImport(newLibraryName, imp.specifiers, imp.defaultAlias, imp.isTypeOnly, imp.attributes);
      } else if (imp instanceof NamespaceImport) {
        return new NamespaceImport(newLibraryName, imp.alias, imp.isTypeOnly, imp.attributes);
      } else if (imp instanceof ExternalModuleImport) {
        return new ExternalModuleImport(newLibraryName, imp.alias, imp.attributes);
      } else if (imp instanceof StringImport) {
        return new StringImport(newLibraryName, imp.attributes);
      }
      return imp;
    });
  }

  /**
   * Organize imports: remove unused, sort, and group.
   * Returns TextEdits to apply the changes.
   */
  public async organizeImports(): Promise<TextEdit[]> {
    let keep: Import[] = [];

    // Filter unused imports (unless disabled)
    if (this.config.disableImportRemovalOnOrganize(this.document.uri)) {
      // Import removal disabled - keep all imports but still sort specifiers
      // Specifier sorting is independent from import sorting (disableImportsSorting)
      const isLegacy = this.config.legacyMode(this.document.uri);
      keep = this.imports.map(imp => {
        if (imp instanceof NamedImport && imp.specifiers.length > 0) {
          // In legacy mode, strip isTypeOnly from individual specifiers
          const specs = isLegacy
            ? imp.specifiers.map(s => ({ ...s, isTypeOnly: false }))
            : imp.specifiers;
          const sortedSpecifiers = [...specs].sort(specifierSort);
          return new NamedImport(imp.libraryName, sortedSpecifiers, imp.defaultAlias, imp.isTypeOnly, imp.attributes);
        }
        return imp;
      });
    } else {
      for (const imp of this.imports) {
        // Check if import is in the ignore list
        if (this.config.ignoredFromRemoval(this.document.uri).includes(imp.libraryName)) {
          // Still need to sort specifiers for NamedImport to maintain consistent formatting
          if (imp instanceof NamedImport && imp.specifiers.length > 0) {
            const sortedSpecifiers = [...imp.specifiers].sort(specifierSort);
            keep.push(new NamedImport(imp.libraryName, sortedSpecifiers, imp.defaultAlias, imp.isTypeOnly, imp.attributes));
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
              imp.isTypeOnly,
              imp.attributes,
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
      const isLegacy = this.config.legacyMode(this.document.uri);

      // Group imports by library name (and isTypeOnly in modern mode)
      // In modern mode, type-only and value imports from the same library should NOT be merged
      const byLibrary = new Map<string, Import[]>();

      for (const imp of keep) {
        // In modern mode, include isTypeOnly in the grouping key
        // This prevents merging type-only imports with value imports
        // Check both NamedImport and NamespaceImport for isTypeOnly flag
        const isTypeOnlyImport = !isLegacy && (
          (imp instanceof NamedImport && imp.isTypeOnly) ||
          (imp instanceof NamespaceImport && imp.isTypeOnly)
        );
        const typePrefix = isTypeOnlyImport ? 'type:' : '';
        const groupKey = typePrefix + imp.libraryName;

        if (!byLibrary.has(groupKey)) {
          byLibrary.set(groupKey, []);
        }
        byLibrary.get(groupKey)!.push(imp);
      }

      // Merge each group
      for (const [, imports] of byLibrary) {
        if (imports.length === 1) {
          // Single import, keep as-is
          // BUT: In legacy mode, strip type-only flag from NamedImports
          const imp = imports[0];
          if (isLegacy && imp instanceof NamedImport && imp.isTypeOnly) {
            // Strip isTypeOnly flag, individual specifier flags, and comments (legacy mode)
            const specs = imp.specifiers.map(s => ({
              ...s,
              isTypeOnly: false,
              leadingComment: undefined,
              trailingComment: undefined,
            }));
            merged.push(new NamedImport(imp.libraryName, specs, imp.defaultAlias, false, imp.attributes));
          } else if (isLegacy && imp instanceof NamedImport) {
            // In legacy mode, strip comments from all named imports
            const specs = imp.specifiers.map(s => ({
              ...s,
              leadingComment: undefined,
              trailingComment: undefined,
            }));
            merged.push(new NamedImport(imp.libraryName, specs, imp.defaultAlias, imp.isTypeOnly, imp.attributes));
          } else {
            merged.push(imp);
          }
          continue;
        }

        // Multiple imports from same module (already grouped by isTypeOnly in modern mode)
        const namedImports = imports.filter(i => i instanceof NamedImport) as NamedImport[];

        // Merge ONLY named imports - keep others in original order
        let mergedNamed: NamedImport | null = null;
        if (namedImports.length > 0) {
          const allSpecifiers: SymbolSpecifier[] = [];
          let mergedDefault: string | undefined;

          for (const namedImp of namedImports) {
            // In legacy mode, strip isTypeOnly and comments from individual specifiers
            const specs = isLegacy
              ? namedImp.specifiers.map(s => ({
                  ...s,
                  isTypeOnly: false,
                  leadingComment: undefined,
                  trailingComment: undefined,
                }))
              : namedImp.specifiers;
            allSpecifiers.push(...specs);

            // Handle duplicate defaults: Keep LAST default (matches old TypeScript Hero)
            // If multiple default imports from same module exist (invalid TypeScript),
            // we merge them into one import and keep the last default encountered.
            // Earlier defaults are dropped - they would cause TypeScript errors anyway.
            // This matches old TypeScript Hero behavior exactly (see test 63 and comparison test A10).
            if (namedImp.defaultAlias) {
              mergedDefault = namedImp.defaultAlias; // Always overwrite, last wins
            }
          }

          // Remove duplicate specifiers (same name and alias)
          // BUT: In legacy mode, keep duplicates (old extension behavior)
          let finalSpecifiers = allSpecifiers;
          if (!isLegacy) {
            finalSpecifiers = allSpecifiers.filter((spec, index, self) =>
              index === self.findIndex(s =>
                s.specifier === spec.specifier && s.alias === spec.alias
              )
            );
          }

          // Sort specifiers
          finalSpecifiers.sort(specifierSort);

          // Preserve the isTypeOnly flag from the first import in the group
          // BUT: In legacy mode, always strip the flag (old extension behavior)
          mergedNamed = new NamedImport(
            namedImports[0].libraryName,
            finalSpecifiers,
            mergedDefault,
            isLegacy ? false : namedImports[0].isTypeOnly, // Legacy: strip type-only
            namedImports[0].attributes, // Preserve attributes from first import
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
    return await this.generateTextEdits(importGroups);
  }

  /**
   * Generate TextEdits to replace the old imports with the new organized imports.
   */
  private async generateTextEdits(importGroups: ImportGroup[]): Promise<TextEdit[]> {
    const edits: TextEdit[] = [];

    // Get the range of all import declarations (both modern and old-style)
    const importDeclarations = this.sourceFile.getImportDeclarations();
    const importEquals = this.sourceFile.getStatements()
      .filter(stmt => Node.isImportEqualsDeclaration(stmt)) as ImportEqualsDeclaration[];

    // Also include re-export declarations in the range (they'll be moved after imports)
    const exportDeclarations = this.sourceFile.getExportDeclarations()
      .filter(exportDecl => exportDecl.getModuleSpecifier() !== undefined);

    // Combine all declaration types - they all have getStart() and getStartLineNumber() methods
    const allImports: Array<ImportDeclaration | ImportEqualsDeclaration | ExportDeclaration> = [
      ...importDeclarations,
      ...importEquals,
      ...exportDeclarations
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

    // Delete leading blank lines before header or imports (if any) as a separate edit
    // When hasLeadingBlanks is true:
    //   - If headerStartLine > 0: There's a header, delete blanks from line 0 to headerStartLine
    //   - If headerStartLine === -1: No header, delete blanks from line 0 to importSectionStartLine
    if (hasLeadingBlanks) {
      const deleteToLine = headerStartLine > 0 ? headerStartLine : importSectionStartLine;
      if (deleteToLine > 0) {
        const leadingBlanksRange = new Range(
          new Position(0, 0),
          new Position(deleteToLine, 0),
        );
        edits.push(TextEdit.delete(leadingBlanksRange));
      }
    }

    // Extract comments between imports (old TypeScript Hero moves them after imports)
    // Only extract standalone comment lines that are BETWEEN import declarations,
    // not lines that are WITHIN a multi-line import declaration
    //
    // KNOWN LIMITATION: Comments INSIDE multiline import braces are not preserved.
    // Example: `import { Foo, /* comment */ Bar } from 'lib'` - the comment is lost.
    // This is complex to fix and is an edge case. Standalone comments between imports ARE preserved.
    const commentsBetweenImports: string[] = [];
    for (let i = importSectionStartLine; i <= importSectionEndLine; i++) {
      const lineNumber = i + 1; // Convert to 1-indexed for comparison with ts-morph

      // Check if this line is within any import declaration
      const isWithinImport = allImports.some(imp => {
        const start = imp.getStartLineNumber();
        const end = imp.getEndLineNumber();
        return lineNumber >= start && lineNumber <= end;
      });

      // Only check for standalone comments if the line is NOT within an import
      if (!isWithinImport) {
        const lineText = this.document.lineAt(i).text;
        const trimmedText = lineText.trim();
        // GOLDEN RULE - NEVER DELETE USER COMMENTS!
        // We MUST preserve ALL comments, including those with "import" keyword.
        // This includes commented-out imports like "// import { Foo } from './bar';"
        const isStandaloneComment = trimmedText.startsWith('//') ||
                                     trimmedText.startsWith('/*') ||
                                     trimmedText.startsWith('*');

        if (isStandaloneComment) {
          commentsBetweenImports.push(lineText);
        }
      }
    }

    // Include blank lines before first import (but not header) in the replace range.
    // IMPORTANT: Only do this if we did NOT create a separate delete edit for leading blanks!
    // When hasLeadingBlanks is true, we already deleted lines 0 to importSectionStartLine,
    // so we must NOT extend importSectionStartLine backwards (would create overlapping ranges).
    if (blankLinesBefore > 0 && !hasLeadingBlanks) {
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
    const useLegacyWithinGroupSorting = this.config.legacyWithinGroupSorting(this.document.uri);

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
      const groupLines = await Promise.all(importsToUse.map(imp => this.generateImportStatement(imp, quote, semi, spaceInBraces, indent)));
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

      // Add re-export statements after imports (preserves export { X } from './m')
      if (this.reExports.length > 0) {
        importText += this.reExports.join(this.eol);
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
    indent: string
  ): Promise<string> {
    const attrs = imp.attributes ? ` ${imp.attributes}` : '';

    if (imp instanceof StringImport) {
      return `import ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
    }

    if (imp instanceof NamespaceImport) {
      // In legacy mode, always strip 'type' keyword (old extension doesn't support it)
      const useTypeKeyword = imp.isTypeOnly && !this.config.legacyMode(this.document.uri);
      const typeKeyword = useTypeKeyword ? 'type ' : '';
      return `import ${typeKeyword}* as ${imp.alias} from ${quote}${imp.libraryName}${quote}${attrs}${semi}`;
    }

    if (imp instanceof ExternalModuleImport) {
      return `import ${imp.alias} = require(${quote}${imp.libraryName}${quote})${attrs}${semi}`;
    }

    if (imp instanceof NamedImport) {
      const parts: string[] = [];

      // Default import
      if (imp.defaultAlias) {
        parts.push(imp.defaultAlias);
      }

      // Named imports
      if (imp.specifiers.length > 0) {
        const isLegacy = this.config.legacyMode(this.document.uri);

        // Check if any specifiers have comments (forces multiline in modern mode)
        const hasComments = !isLegacy && imp.specifiers.some(s => s.leadingComment || s.trailingComment);

        const specifierStrings = imp.specifiers.map(spec => {
          const baseSpec = spec.alias ? `${spec.specifier} as ${spec.alias}` : spec.specifier;
          const typePrefix = spec.isTypeOnly ? 'type ' : '';
          let result = `${typePrefix}${baseSpec}`;

          // In modern mode, preserve comments
          if (!isLegacy) {
            if (spec.leadingComment) {
              result = `${spec.leadingComment} ${result}`;
            }
            if (spec.trailingComment) {
              result = `${result} ${spec.trailingComment}`;
            }
          }
          // In legacy mode, comments are stripped (old extension behavior)

          return result;
        });

        const specifiersText = specifierStrings.join(', ');
        const braceOpen = spaceInBraces ? '{ ' : '{';
        const braceClose = spaceInBraces ? ' }' : '}';

        // Check if it should be multiline
        const threshold = this.config.multiLineWrapThreshold(this.document.uri);
        const singleLine = `${braceOpen}${specifiersText}${braceClose}`;

        // Force multiline if there are comments
        if (hasComments || (singleLine.length > threshold && imp.specifiers.length > 1)) {
          // Multiline
          const trailingComma = this.config.multiLineTrailingComma(this.document.uri) ? ',' : '';

          // When we have trailing comments, we need to place the comma BEFORE the comment
          // e.g., "B, // end" not "B // end,"
          const formattedSpecifiers = imp.specifiers.map((spec, index) => {
            const baseSpec = spec.alias ? `${spec.specifier} as ${spec.alias}` : spec.specifier;
            const typePrefix = spec.isTypeOnly ? 'type ' : '';
            let result = `${typePrefix}${baseSpec}`;

            // In modern mode, handle comments with proper comma placement
            if (!isLegacy) {
              // Add leading comment before everything
              if (spec.leadingComment) {
                result = `${spec.leadingComment} ${result}`;
              }

              // Add comma before trailing comment (if not the last item or if trailingComma is enabled)
              const needsComma = index < imp.specifiers.length - 1 || trailingComma;
              if (needsComma) {
                result = `${result},`;
              }

              // Add trailing comment after the comma
              if (spec.trailingComment) {
                result = `${result} ${spec.trailingComment}`;
              }
            } else {
              // Legacy mode: no comments, just add comma
              const needsComma = index < imp.specifiers.length - 1 || trailingComma;
              if (needsComma) {
                result = `${result},`;
              }
            }

            return result;
          });

          const namedPart = `{${this.eol}${indent}${formattedSpecifiers.join(this.eol + indent)}${this.eol}}`;
          parts.push(namedPart);
        } else {
          parts.push(singleLine);
        }
      }

      // Add 'type' keyword for type-only imports (TS 3.8+)
      const typeKeyword = imp.isTypeOnly ? 'type ' : '';
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
