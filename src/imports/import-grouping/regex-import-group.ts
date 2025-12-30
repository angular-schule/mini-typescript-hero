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
    const sorted = this.imports.sort((i1, i2) =>
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
    this.compiledRegex = new RegExp(regexString);
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
