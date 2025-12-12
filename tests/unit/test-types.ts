/**
 * Type definitions for test utilities
 *
 * This file provides strongly-typed interfaces for test mocks and utilities,
 * eliminating the need for `any` types in tests.
 */

/**
 * Configuration override values for MockImportsConfig.
 *
 * This type defines all possible configuration options that can be overridden
 * in tests. It ensures type safety when setting config values in mocks.
 */
export interface ConfigOverrides {
  // Formatting options
  insertSpaceBeforeAndAfterImportBraces?: boolean;
  insertSemicolons?: boolean;
  stringQuoteStyle?: '"' | "'";
  removeTrailingIndex?: boolean;
  multiLineWrapThreshold?: number;
  multiLineTrailingComma?: boolean;

  // Grouping and sorting
  grouping?: string[];
  disableImportsSorting?: boolean;
  organizeSortsByFirstSpecifier?: boolean;

  // Removal and merging
  disableImportRemovalOnOrganize?: boolean;
  ignoredFromRemoval?: string[];
  mergeImportsFromSameModule?: boolean;

  // Blank lines
  blankLinesAfterImports?: 'one' | 'two' | 'preserve';

  // Behavior and compatibility
  organizeOnSave?: boolean;
  legacyMode?: boolean;
  excludePatterns?: string[];

  // Indentation (modern mode)
  tabSize?: number;
  insertSpaces?: boolean;
  useOnlyExtensionSettings?: boolean;
}

/**
 * Helper type to ensure all config keys are valid
 */
export type ConfigKey = keyof ConfigOverrides;

/**
 * Helper type to get the value type for a given config key
 */
export type ConfigValue<K extends ConfigKey> = ConfigOverrides[K];

/**
 * Type definition for package.json structure (subset used in tests)
 */
export interface PackageJson {
  name: string;
  displayName: string;
  publisher: string;
  activationEvents?: string[];
  contributes?: {
    commands?: Array<{
      command: string;
      title: string;
    }>;
    configuration?: {
      properties?: Record<string, {
        type?: string;
        default?: unknown;
        description?: string;
        scope?: string;
        enum?: unknown[];
      }>;
    };
  };
}
