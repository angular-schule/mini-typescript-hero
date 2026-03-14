import { Import } from '../import-types';
import { ImportGroupOrder } from './import-group-order';

/**
 * Interface for an import group. A group contains a list of imports that are grouped and sorted
 * together on organizing all imports and inserting new imports.
 */
export interface ImportGroup {
  /**
   * The readonly list of imports for this group.
   */
  readonly imports: Import[];

  /**
   * A sorted list of the imports of this group.
   */
  readonly sortedImports: Import[];

  /**
   * The order of the imports (asc / desc).
   */
  order: ImportGroupOrder;

  /**
   * Adds the given import to itself if it is the correct group for the import. Does return true if the import is
   * handled, otherwise it must return false.
   */
  processImport(tsImport: Import): boolean;

  /**
   * Resets the import group (clears the imports).
   */
  reset(): void;
}
