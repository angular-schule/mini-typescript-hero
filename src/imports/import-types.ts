/**
 * Simplified import types for mini-typescript-hero.
 * These replace the typescript-parser types with simpler representations
 * that work with ts-morph.
 */

/**
 * Base interface for all import types.
 */
export interface Import {
  libraryName: string;
  attributes?: string; // Import attributes/assertions (e.g., "assert { type: 'json' }")
}

/**
 * String-only import (e.g., import 'reflect-metadata')
 */
export class StringImport implements Import {
  constructor(
    public readonly libraryName: string,
    public readonly attributes?: string,
  ) {}
}

/**
 * Named import (e.g., import { foo, bar } from 'lib')
 */
export class NamedImport implements Import {
  constructor(
    public readonly libraryName: string,
    public readonly specifiers: SymbolSpecifier[] = [],
    public readonly defaultAlias?: string,
    public readonly isTypeOnly: boolean = false,
    public readonly attributes?: string,
  ) {}
}

/**
 * Namespace import (e.g., import * as foo from 'lib')
 * Also handles combined default + namespace: import Default, * as foo from 'lib'
 */
export class NamespaceImport implements Import {
  constructor(
    public readonly libraryName: string,
    public readonly alias: string,
    public readonly defaultAlias?: string,
    public readonly isTypeOnly: boolean = false,
    public readonly attributes?: string,
  ) {}
}

/**
 * External module import (e.g., import foo = require('lib'))
 */
export class ExternalModuleImport implements Import {
  constructor(
    public readonly libraryName: string,
    public readonly alias: string,
    public readonly attributes?: string,
  ) {}
}

/**
 * Symbol specifier for named imports.
 */
export interface SymbolSpecifier {
  specifier: string;
  alias?: string;
  isTypeOnly?: boolean;
  leadingComment?: string;  // Block or line comment before the specifier
  trailingComment?: string; // Line comment after the specifier
}
