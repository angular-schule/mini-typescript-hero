/**
 * Modern mode pipeline for import organization.
 *
 * Pipeline order: filter → sort → removeTrailingIndex → merge (with dedup)
 *
 * Key behaviors:
 * - Preserves type-only semantics (import type stays separate from import)
 * - Removes /index BEFORE merging (correct order: './lib/index' and './lib' merge)
 * - Deduplicates specifiers when merging (value subsumes type)
 * - Only keeps default alias if actually used in code
 */

import { Import } from './import-types';
import { OrganizePipelineInput, ResolvedConfig } from './organize-pipeline';
import { filterUnused, mergeImports, removeTrailingIndex, sortImports } from './pipeline-shared';

export function modernPipeline(input: OrganizePipelineInput, config: ResolvedConfig): Import[] {
  // Step 1: Filter unused imports (preserve type-only flags, strict default retention)
  let result = filterUnused(input, config, {
    preserveTypeOnly: true,
    aggressiveDefaultRetention: false,
  });

  // Step 2: Sort imports
  result = sortImports(result, config);

  // Step 3: Remove trailing /index BEFORE merging
  // This allows './lib/index' and './lib' to normalize and merge
  if (config.removeTrailingIndex) {
    result = removeTrailingIndex(result);
  }

  // Step 4: Merge imports from same module (with dedup, type-only separation)
  if (config.mergeImportsFromSameModule) {
    result = mergeImports(result, {
      separateTypeOnly: true,
      deduplicateSpecifiers: true,
    });
  }

  return result;
}
