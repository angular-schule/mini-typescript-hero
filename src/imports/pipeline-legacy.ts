/**
 * Legacy mode pipeline for import organization.
 *
 * Replicates the old TypeScript Hero extension's behavior.
 *
 * Pipeline order: filter → sort → merge (no dedup) → removeTrailingIndex
 *
 * Key behaviors:
 * - Strips all type-only flags (old extension doesn't know about import type)
 * - Merges BEFORE removeTrailingIndex (replicates old extension's bug:
 *   './lib/index' and './lib' stay separate because they differ at merge time)
 * - Keeps duplicate specifiers (old extension doesn't deduplicate)
 * - Keeps default alias aggressively (if any specifiers exist)
 */

import { Import } from './import-types';
import { OrganizePipelineInput, ResolvedConfig } from './organize-pipeline';
import { filterUnused, mergeImports, removeTrailingIndex, sortImports } from './pipeline-shared';

export function legacyPipeline(input: OrganizePipelineInput, config: ResolvedConfig): Import[] {
  // Step 1: Filter unused imports (strip type-only flags, aggressive default retention)
  let result = filterUnused(input, config, {
    preserveTypeOnly: false,
    aggressiveDefaultRetention: true,
  });

  // Step 2: Sort imports
  result = sortImports(result, config);

  // Step 3: Merge imports from same module (no dedup, merge type-only with value)
  // NOTE: This happens BEFORE removeTrailingIndex to replicate old extension's bug
  if (config.mergeImportsFromSameModule) {
    result = mergeImports(result, {
      separateTypeOnly: false,
      deduplicateSpecifiers: false,
    });
  }

  // Step 4: Remove trailing /index AFTER merging (legacy timing)
  if (config.removeTrailingIndex) {
    result = removeTrailingIndex(result);
  }

  return result;
}
