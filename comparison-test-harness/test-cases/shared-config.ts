/**
 * Shared Configuration for Comparison Test Harness
 *
 * This file defines the DEFAULT configuration used across all comparison tests.
 * Every config option is EXPLICITLY set to match old TypeScript Hero's behavior.
 *
 * WHY: By explicitly setting every option, we ensure tests remain stable even if
 * the new extension changes its production defaults. This makes the test harness
 * a reliable compatibility validator.
 */

/**
 * Default configuration that matches old TypeScript Hero behavior
 *
 * Individual tests can override specific options by passing config overrides.
 */
export const OLD_EXTENSION_COMPATIBLE_CONFIG = {
  /**
   * blankLinesAfterImports: 'legacy'
   *
   * WHY: The old TypeScript Hero has complex blank line behavior:
   * Formula: finalBlanks = blanksBefore + 1 + max(blanksAfter - 1, 0)
   *
   * The 'legacy' mode in the new extension replicates this exact formula.
   * See: README-how-we-handle-blank-lines.md for detailed explanation.
   *
   * PRODUCTION DEFAULT: 'one' (industry standard)
   * TEST HARNESS: 'legacy' (for compatibility testing)
   */
  blankLinesAfterImports: 'legacy' as 'one' | 'two' | 'preserve' | 'legacy',

  /**
   * mergeImportsFromSameModule: false
   *
   * WHY: The old TypeScript Hero does NOT merge imports from the same module.
   *
   * Example with old extension:
   *   import { A } from './lib';
   *   import { B } from './lib';  // Stays separate
   *
   * Example with new extension (default true):
   *   import { A, B } from './lib';  // Merged
   *
   * PRODUCTION DEFAULT: true (better, more concise)
   * TEST HARNESS: false (for compatibility testing)
   */
  mergeImportsFromSameModule: false,

  /**
   * removeTrailingIndex: true
   *
   * WHY: Both old and new extensions remove trailing /index by default.
   *
   * Example: './lib/index' → './lib'
   *
   * BOTH EXTENSIONS: true (same behavior)
   */
  removeTrailingIndex: true,

  /**
   * disableImportsSorting: false
   *
   * WHY: Both extensions sort imports by default.
   *
   * BOTH EXTENSIONS: false (sorting enabled)
   */
  disableImportsSorting: false,

  /**
   * disableImportRemovalOnOrganize: false
   *
   * WHY: Both extensions remove unused imports by default.
   *
   * BOTH EXTENSIONS: false (removal enabled)
   */
  disableImportRemovalOnOrganize: false,

  /**
   * organizeSortsByFirstSpecifier: false
   *
   * WHY: Both extensions sort by library name by default (not by first specifier).
   *
   * When false: Sort by library name
   *   import { zoo } from './a';  // './a' comes first
   *   import { ant } from './z';  // './z' comes second
   *
   * When true: Sort by first specifier name
   *   import { ant } from './z';  // 'ant' comes first
   *   import { zoo } from './a';  // 'zoo' comes second
   *
   * BOTH EXTENSIONS: false (sort by library name)
   */
  organizeSortsByFirstSpecifier: false,

  /**
   * ignoredFromRemoval: ['react']
   *
   * WHY: Both extensions ignore 'react' from removal by default.
   *
   * React is often imported for JSX support even if not explicitly used in code.
   * Example: import React from 'react'; // Needed for JSX, but may appear unused
   *
   * BOTH EXTENSIONS: ['react']
   */
  ignoredFromRemoval: ['react'],

  /**
   * stringQuoteStyle: '\''
   *
   * WHY: Both extensions use single quotes by default.
   *
   * Example: import { A } from './lib';  // Single quotes
   *
   * BOTH EXTENSIONS: '\'' (single quotes)
   */
  stringQuoteStyle: '\'' as '"' | '\'',

  /**
   * insertSemicolons: true
   *
   * WHY: Both extensions add semicolons by default.
   *
   * Example: import { A } from './lib';  // Semicolon at end
   *
   * BOTH EXTENSIONS: true (semicolons enabled)
   */
  insertSemicolons: true,

  /**
   * insertSpaceBeforeAndAfterImportBraces: true
   *
   * WHY: Both extensions add spaces inside import braces by default.
   *
   * Example: import { A } from './lib';  // Spaces around A
   * Not:     import {A} from './lib';    // No spaces
   *
   * BOTH EXTENSIONS: true (spaces enabled)
   */
  insertSpaceBeforeAndAfterImportBraces: true,

  /**
   * multiLineWrapThreshold: 125
   *
   * WHY: Both extensions use 125 characters as the threshold for wrapping to multiline.
   *
   * Example (under 125 chars):
   *   import { A, B, C } from './lib';
   *
   * Example (over 125 chars):
   *   import {
   *     VeryLongName1,
   *     VeryLongName2,
   *   } from './lib';
   *
   * BOTH EXTENSIONS: 125 characters
   */
  multiLineWrapThreshold: 125,

  /**
   * multiLineTrailingComma: true
   *
   * WHY: Both extensions add trailing commas in multiline imports by default.
   *
   * Example:
   *   import {
   *     A,
   *     B,  // <- Trailing comma
   *   } from './lib';
   *
   * BOTH EXTENSIONS: true (trailing comma enabled)
   */
  multiLineTrailingComma: true,

  /**
   * grouping: ['Plains', 'Modules', 'Workspace']
   *
   * WHY: Both extensions use these three default groups.
   *
   * - Plains: String imports like import 'zone.js';
   * - Modules: External packages like import { A } from '@angular/core';
   * - Workspace: Relative imports like import { B } from './my-service';
   *
   * Groups are separated by 1 blank line.
   *
   * BOTH EXTENSIONS: ['Plains', 'Modules', 'Workspace']
   */
  grouping: ['Plains', 'Modules', 'Workspace'],
};

/**
 * Type-safe config for TypeScript
 */
export type ComparisonTestConfig = typeof OLD_EXTENSION_COMPATIBLE_CONFIG;

/**
 * Merge config overrides with the base OLD_EXTENSION_COMPATIBLE_CONFIG
 *
 * Usage:
 *   const config = mergeConfig({ stringQuoteStyle: '"' });
 *   // Results in: { ...OLD_EXTENSION_COMPATIBLE_CONFIG, stringQuoteStyle: '"' }
 */
export function mergeConfig(overrides: Partial<ComparisonTestConfig>): ComparisonTestConfig {
  return { ...OLD_EXTENSION_COMPATIBLE_CONFIG, ...overrides };
}
