/**
 * Shared pipeline functions for import organization.
 *
 * These functions are called by both the modern and legacy pipelines.
 * Instead of reading `legacyMode` from config, they accept option flags
 * that control behavior differences between modes.
 */

import {
  ExternalModuleImport,
  Import,
  NamedImport,
  NamespaceImport,
  StringImport,
  SymbolSpecifier,
} from './import-types';
import { importSort, importSortByFirstSpecifier, specifierSort } from './import-utilities';
import { FilterOptions, MergeOptions, OrganizePipelineInput, ResolvedConfig } from './organize-pipeline';

/**
 * Filter unused imports and sort specifiers within each import.
 *
 * Behavior differences controlled by FilterOptions:
 * - preserveTypeOnly: false → strips isTypeOnly flags (legacy mode)
 * - aggressiveDefaultRetention: true → keeps default alias when any specifier exists (legacy mode)
 */
export function filterUnused(
  input: OrganizePipelineInput,
  config: ResolvedConfig,
  options: FilterOptions,
): Import[] {
  const { imports, usedIdentifiers } = input;

  if (config.disableImportRemovalOnOrganize) {
    // Import removal disabled - keep all imports but still sort specifiers
    return imports.map(imp => {
      if (imp instanceof NamedImport && imp.specifiers.length > 0) {
        const specs = options.preserveTypeOnly
          ? imp.specifiers
          : imp.specifiers.map(s => ({ ...s, isTypeOnly: false }));
        const sortedSpecifiers = [...specs].sort(specifierSort);
        return new NamedImport(
          imp.libraryName,
          sortedSpecifiers,
          imp.defaultAlias,
          options.preserveTypeOnly ? imp.isTypeOnly : false,
          imp.attributes,
        );
      }
      return imp;
    });
  }

  const keep: Import[] = [];

  for (const imp of imports) {
    // Check if import is in the ignore list
    if (config.ignoredFromRemoval.includes(imp.libraryName)) {
      if (imp instanceof NamedImport && imp.specifiers.length > 0) {
        const specs = options.preserveTypeOnly
          ? imp.specifiers
          : imp.specifiers.map(s => ({ ...s, isTypeOnly: false }));
        const sortedSpecifiers = [...specs].sort(specifierSort);
        keep.push(new NamedImport(
          imp.libraryName,
          sortedSpecifiers,
          imp.defaultAlias,
          options.preserveTypeOnly ? imp.isTypeOnly : false,
          imp.attributes,
        ));
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

    // Check external module imports
    if (imp instanceof ExternalModuleImport) {
      if (usedIdentifiers.has(imp.alias)) {
        keep.push(imp);
      }
      continue;
    }

    // Check namespace imports (may also have a default alias)
    if (imp instanceof NamespaceImport) {
      const nsUsed = usedIdentifiers.has(imp.alias);
      const defaultUsed = !!imp.defaultAlias && usedIdentifiers.has(imp.defaultAlias);
      if (nsUsed || defaultUsed) {
        if (imp.defaultAlias && !defaultUsed) {
          // Strip unused default, keep namespace
          keep.push(new NamespaceImport(
            imp.libraryName, imp.alias, undefined, imp.isTypeOnly, imp.attributes,
          ));
        } else if (!nsUsed && defaultUsed) {
          // Strip unused namespace, convert to default-only import
          keep.push(new NamedImport(
            imp.libraryName, [], imp.defaultAlias, imp.isTypeOnly, imp.attributes,
          ));
        } else {
          keep.push(imp);
        }
      }
      continue;
    }

    // Check named imports
    if (imp instanceof NamedImport) {
      const usedSpecifiers = imp.specifiers.filter(spec =>
        usedIdentifiers.has(spec.alias || spec.specifier),
      );

      const defaultUsed = imp.defaultAlias && usedIdentifiers.has(imp.defaultAlias);

      if (usedSpecifiers.length || defaultUsed) {
        usedSpecifiers.sort(specifierSort);

        // Legacy: Keep default even if unused, as long as ANY specifiers exist
        // Modern: Only keep default if it's actually used
        const keepDefault = options.aggressiveDefaultRetention
          ? (usedSpecifiers.length > 0 && imp.defaultAlias) || defaultUsed
          : defaultUsed;

        keep.push(new NamedImport(
          imp.libraryName,
          usedSpecifiers,
          keepDefault ? imp.defaultAlias : undefined,
          imp.isTypeOnly,
          imp.attributes,
        ));
      }
    }
  }

  return keep;
}

/**
 * Sort imports by library name or first specifier.
 * StringImports are always sorted separately and placed first.
 */
export function sortImports(imports: Import[], config: ResolvedConfig): Import[] {
  if (config.disableImportsSorting) {
    return imports;
  }

  const sorter = config.organizeSortsByFirstSpecifier
    ? importSortByFirstSpecifier
    : importSort;

  return [
    ...imports.filter(o => o instanceof StringImport).sort(sorter),
    ...imports.filter(o => !(o instanceof StringImport)).sort(sorter),
  ];
}

/**
 * Merge imports from the same module.
 *
 * Behavior differences controlled by MergeOptions:
 * - separateTypeOnly: true → type-only and value imports from same module stay separate (modern)
 * - deduplicateSpecifiers: true → removes duplicate specifiers, value subsumes type (modern)
 */
export function mergeImports(imports: Import[], options: MergeOptions): Import[] {
  const merged: Import[] = [];

  // Group imports by library name (and optionally isTypeOnly)
  const byLibrary = new Map<string, Import[]>();

  for (const imp of imports) {
    // In modern mode (separateTypeOnly), include isTypeOnly in the grouping key
    // This prevents merging type-only imports with value imports
    const isTypeOnlyImport = options.separateTypeOnly && (
      (imp instanceof NamedImport && imp.isTypeOnly) ||
      (imp instanceof NamespaceImport && imp.isTypeOnly)
    );
    const typePrefix = isTypeOnlyImport ? 'type:' : '';
    // Include attributes in grouping key so imports with different attributes
    // (e.g., `with { type: 'json' }` vs no attributes) are NOT merged together
    const attrSuffix = imp.attributes ? `|${imp.attributes}` : '';
    const groupKey = typePrefix + imp.libraryName + attrSuffix;

    if (!byLibrary.has(groupKey)) {
      byLibrary.set(groupKey, []);
    }
    byLibrary.get(groupKey)!.push(imp);
  }

  // Merge each group
  for (const [, groupImports] of byLibrary) {
    if (groupImports.length === 1) {
      const imp = groupImports[0];
      // When NOT preserving type-only (legacy), strip flags from single NamedImports
      if (!options.separateTypeOnly && imp instanceof NamedImport && imp.isTypeOnly) {
        const specs = imp.specifiers.map(s => ({ ...s, isTypeOnly: false }));
        merged.push(new NamedImport(imp.libraryName, specs, imp.defaultAlias, false, imp.attributes));
      } else {
        merged.push(imp);
      }
      continue;
    }

    // Multiple imports from same module
    const namedImports = groupImports.filter(i => i instanceof NamedImport) as NamedImport[];

    let mergedNamed: NamedImport | null = null;
    if (namedImports.length > 0) {
      const allSpecifiers: SymbolSpecifier[] = [];
      let mergedDefault: string | undefined;

      for (const namedImp of namedImports) {
        // In legacy mode (not preserving type-only), strip isTypeOnly from specifiers
        const specs = options.separateTypeOnly
          ? namedImp.specifiers
          : namedImp.specifiers.map(s => ({ ...s, isTypeOnly: false }));
        allSpecifiers.push(...specs);

        // Handle duplicate defaults: Keep LAST default (matches old TypeScript Hero)
        if (namedImp.defaultAlias) {
          mergedDefault = namedImp.defaultAlias;
        }
      }

      // Deduplicate specifiers (modern mode only)
      let finalSpecifiers = allSpecifiers;
      if (options.deduplicateSpecifiers) {
        const specMap = new Map<string, SymbolSpecifier>();
        for (const spec of allSpecifiers) {
          const key = spec.specifier + (spec.alias ? `:${spec.alias}` : '');
          const existing = specMap.get(key);
          if (!existing) {
            specMap.set(key, spec);
          } else if (existing.isTypeOnly && !spec.isTypeOnly) {
            // Value import subsumes type import
            specMap.set(key, spec);
          }
        }
        finalSpecifiers = Array.from(specMap.values());
      }

      finalSpecifiers.sort(specifierSort);

      mergedNamed = new NamedImport(
        namedImports[0].libraryName,
        finalSpecifiers,
        mergedDefault,
        options.separateTypeOnly ? namedImports[0].isTypeOnly : false,
        namedImports[0].attributes,
      );
    }

    // Add imports in ORIGINAL order, replacing all NamedImports with the merged one
    let namedAdded = false;
    for (const imp of groupImports) {
      if (imp instanceof NamedImport) {
        if (!namedAdded && mergedNamed) {
          merged.push(mergedNamed);
          namedAdded = true;
        }
      } else {
        merged.push(imp);
      }
    }
  }

  return merged;
}

/**
 * Remove trailing /index from import library names.
 * Creates new Import objects instead of mutating readonly properties.
 */
export function removeTrailingIndex(imports: Import[]): Import[] {
  return imports.map(imp => {
    if (!imp.libraryName.endsWith('/index')) {
      return imp;
    }
    const newLibraryName = imp.libraryName.replace(/\/index$/, '');

    if (imp instanceof NamedImport) {
      return new NamedImport(newLibraryName, imp.specifiers, imp.defaultAlias, imp.isTypeOnly, imp.attributes);
    } else if (imp instanceof NamespaceImport) {
      return new NamespaceImport(newLibraryName, imp.alias, imp.defaultAlias, imp.isTypeOnly, imp.attributes);
    } else if (imp instanceof ExternalModuleImport) {
      return new ExternalModuleImport(newLibraryName, imp.alias, imp.attributes);
    } else if (imp instanceof StringImport) {
      return new StringImport(newLibraryName, imp.attributes);
    }
    return imp;
  });
}
