import { Import, StringImport } from '../import-types';
import { importSort } from '../import-utilities';
import { ImportGroup } from './import-group';
import { ImportGroupOrder } from './import-group-order';

/**
 * Import group that processes all imports that match a certain regex (the lib name).
 *
 * NOTE: User-provided regex patterns are trusted without validation.
 * This is a core configuration value - users are responsible for providing valid patterns.
 */
export class RegexImportGroup implements ImportGroup {
  public readonly imports: Import[] = [];
  private readonly compiledRegex: RegExp;

  public get sortedImports(): Import[] {
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
    // Parse /pattern/flags syntax (e.g., '/^@angular/i' -> pattern='^@angular', flags='i')
    try {
      const slashMatch = this.regex.match(/^\/(.+)\/([dgimsuyv]*)$/);
      if (slashMatch) {
        this.compiledRegex = new RegExp(slashMatch[1], slashMatch[2]);
      } else {
        this.compiledRegex = new RegExp(this.regex);
      }
    } catch {
      // Invalid regex pattern from user config — use a never-matching regex as fallback
      this.compiledRegex = /(?!)/;
    }
  }

  public reset(): void {
    this.imports.length = 0;
  }

  public processImport(tsImport: Import): boolean {
    // Reset lastIndex to avoid stateful behavior with g/y flags
    this.compiledRegex.lastIndex = 0;
    if (this.compiledRegex.test(tsImport.libraryName)) {
      this.imports.push(tsImport);
      return true;
    }
    return false;
  }
}
