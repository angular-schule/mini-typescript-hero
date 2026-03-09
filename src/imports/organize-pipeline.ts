/**
 * Types and interfaces for the import organization pipeline.
 *
 * The pipeline is split into two modes:
 * - Modern: Preserves type-only semantics, deduplicates specifiers, correct merge timing
 * - Legacy: Strips type-only flags, no dedup, replicates old TypeScript Hero merge timing
 *
 * Both modes share the same parsing, grouping, and rendering infrastructure.
 */

import { Import } from './import-types';

/**
 * Input data for the organize imports pipeline.
 * Prepared by ImportManager constructor (shared parsing).
 */
export interface OrganizePipelineInput {
  /** All parsed imports from the document */
  readonly imports: Import[];
  /** Identifiers actually used in the code body */
  readonly usedIdentifiers: ReadonlySet<string>;
}

/**
 * Configuration values resolved once before pipeline execution.
 * Avoids repeated config.xyz(uri) calls throughout the pipeline.
 */
export interface ResolvedConfig {
  readonly disableImportRemovalOnOrganize: boolean;
  readonly ignoredFromRemoval: string[];
  readonly disableImportsSorting: boolean;
  readonly organizeSortsByFirstSpecifier: boolean;
  readonly removeTrailingIndex: boolean;
  readonly mergeImportsFromSameModule: boolean;
}

/**
 * Options controlling how unused imports are filtered.
 */
export interface FilterOptions {
  /** Whether to preserve isTypeOnly flags on imports/specifiers (modern: true, legacy: false) */
  readonly preserveTypeOnly: boolean;
  /** Whether to keep default alias when any specifier exists, even if default is unused (legacy: true, modern: false) */
  readonly aggressiveDefaultRetention: boolean;
}

/**
 * Options controlling how imports from the same module are merged.
 */
export interface MergeOptions {
  /** Whether to keep type-only imports separate from value imports (modern: true, legacy: false) */
  readonly separateTypeOnly: boolean;
  /** Whether to deduplicate specifiers with same name+alias (modern: true, legacy: false) */
  readonly deduplicateSpecifiers: boolean;
}

/**
 * Options for the text rendering phase (generateTextEdits / generateImportStatement).
 */
export interface RenderOptions {
  /** Whether to render 'type' keywords in import statements (modern: true, legacy: false) */
  readonly renderTypeKeywords: boolean;
  /** Whether to always sort within groups regardless of config flags (legacy: true, modern: false) */
  readonly alwaysSortWithinGroups: boolean;
  /** Whether to preserve blank lines between header and imports (modern: true, legacy: false) */
  readonly preserveBlankLinesBeforeImports: boolean;
}

/**
 * Pipeline function signature.
 * Takes parsed imports + config, returns organized (filtered, sorted, merged) imports.
 */
export type OrganizePipeline = (
  input: OrganizePipelineInput,
  config: ResolvedConfig,
) => Import[];
