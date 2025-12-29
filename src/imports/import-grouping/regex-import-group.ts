import { Import, StringImport } from '../import-types';
import { importSort } from '../import-utilities';
import { ImportGroup } from './import-group';
import { ImportGroupOrder } from './import-group-order';

/**
 * Detects potentially dangerous regex patterns that could cause catastrophic backtracking (ReDoS).
 * Checks for nested quantifiers like (a+)+, (a*)+, etc.
 */
function isPotentiallyDangerousRegex(pattern: string): boolean {
  // Detect nested quantifiers: (pattern)+ or (pattern)* where pattern contains + or *
  // This is a simple heuristic, not comprehensive
  const nestedQuantifierPattern = /\([^)]*[+*][^)]*\)[+*]/;
  return nestedQuantifierPattern.test(pattern);
}

/**
 * Import group that processes all imports that match a certain regex (the lib name).
 */
export class RegexImportGroup implements ImportGroup {
  public readonly imports: Import[] = [];
  private readonly compiledRegex: RegExp;

  public get sortedImports(): Import[] {
    // IMPORTANT: Copy array before sorting to avoid mutating the original
    const sorted = [...this.imports].sort((i1, i2) =>
      importSort(i1, i2, this.order),
    );
    return [
      ...sorted.filter(i => i instanceof StringImport),
      ...sorted.filter(i => !(i instanceof StringImport)),
    ];
  }

  /**
   * Creates an instance of RegexImportGroup.
   *
   * @param regex The regex that is matched against the imports library name.
   * @param order Sort order (asc/desc)
   */
  constructor(
    public readonly regex: string,
    public readonly order: ImportGroupOrder = ImportGroupOrder.Asc,
  ) {
    // Compile regex once in constructor for performance
    // Strip surrounding slashes if present (e.g., '/^@angular/' -> '^@angular')
    let regexString = this.regex;
    regexString = regexString.startsWith('/')
      ? regexString.substring(1)
      : regexString;
    regexString = regexString.endsWith('/')
      ? regexString.substring(0, regexString.length - 1)
      : regexString;

    // Check for potentially dangerous regex patterns (ReDoS protection)
    // Note: We just log to debug console, which is visible in Extension Development Host
    if (isPotentiallyDangerousRegex(regexString)) {
      // eslint-disable-next-line no-console
      console.warn(`[RegexImportGroup] Warning: Potentially dangerous regex pattern detected: ${this.regex}`);
    }

    // Try to compile regex, use fallback if invalid
    try {
      this.compiledRegex = new RegExp(regexString);
    } catch {
      // Invalid regex - use a pattern that never matches
      // eslint-disable-next-line no-console
      console.error(`[RegexImportGroup] Invalid regex pattern: ${this.regex}`);
      this.compiledRegex = /(?!)/; // Never matches
    }
  }

  public reset(): void {
    this.imports.length = 0;
  }

  public processImport(tsImport: Import): boolean {
    if (this.compiledRegex.test(tsImport.libraryName)) {
      this.imports.push(tsImport);
      return true;
    }
    return false;
  }
}
