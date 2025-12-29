import { basename } from 'path';

import { ExternalModuleImport, Import, NamedImport, NamespaceImport, StringImport, SymbolSpecifier } from './import-types';
import { ImportGroup, RegexImportGroup } from './import-grouping';

/**
 * String-Sort function.
 */
export function stringSort(strA: string, strB: string, order: 'asc' | 'desc' = 'asc'): number {
  let result: number = 0;
  if (strA < strB) {
    result = -1;
  } else if (strA > strB) {
    result = 1;
  }
  if (order === 'desc') {
    result *= -1;
  }
  return result;
}

/**
 * Locale-sensitive ("Human-compatible") String-Sort function.
 */
function localeStringSort(strA: string, strB: string, order: 'asc' | 'desc' = 'asc'): number {
  let result: number = strA.localeCompare(strB);
  if (order === 'desc') {
    result *= -1;
  }
  return result;
}

/**
 * Order imports by library name.
 */
export function importSort(i1: Import, i2: Import, order: 'asc' | 'desc' = 'asc'): number {
  const strA = i1.libraryName.toLowerCase();
  const strB = i2.libraryName.toLowerCase();

  return stringSort(strA, strB, order);
}

/**
 * Order imports by first specifier name.
 */
export function importSortByFirstSpecifier(i1: Import, i2: Import, order: 'asc' | 'desc' = 'asc'): number {
  const strA = getImportFirstSpecifier(i1);
  const strB = getImportFirstSpecifier(i2);

  return localeStringSort(strA, strB, order);
}

/**
 * Computes the first specifier/alias of an import.
 */
function getImportFirstSpecifier(imp: Import): string {
  if (imp instanceof NamespaceImport || imp instanceof ExternalModuleImport) {
    return imp.alias;
  }

  if (imp instanceof StringImport) {
    return basename(imp.libraryName);
  }

  if (imp instanceof NamedImport) {
    const namedSpecifiers = imp.specifiers
      .map(s => s.alias || s.specifier)
      .filter(Boolean);
    const marker = namedSpecifiers[0] || imp.defaultAlias;
    if (marker) {
      return marker;
    }
  }

  return basename(imp.libraryName);
}

/**
 * Order specifiers by name.
 * Uses stringSort (not localeStringSort) to match old TypeScript Hero behavior.
 */
export function specifierSort(i1: SymbolSpecifier, i2: SymbolSpecifier): number {
  return stringSort(i1.specifier, i2.specifier);
}

/**
 * Orders import groups by matching precedence (regex first).
 * This ensures regex groups can capture imports before keyword groups,
 * even if they appear later in the configuration.
 *
 * Used internally by ImportManager when assigning imports to groups.
 */
export function importGroupSortForPrecedence(importGroups: ImportGroup[]): ImportGroup[] {
  const regexGroups: ImportGroup[] = [];
  const otherGroups: ImportGroup[] = [];
  for (const ig of importGroups) {
    (ig instanceof RegexImportGroup ? regexGroups : otherGroups).push(ig);
  }
  return regexGroups.concat(otherGroups);
}
