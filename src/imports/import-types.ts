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
}

/**
 * String-only import (e.g., import 'reflect-metadata')
 */
export class StringImport implements Import {
  constructor(public readonly libraryName: string) {}
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
  ) {}
}

/**
 * Namespace import (e.g., import * as foo from 'lib')
 */
export class NamespaceImport implements Import {
  constructor(
    public readonly libraryName: string,
    public readonly alias: string,
  ) {}
}

/**
 * External module import (e.g., import foo = require('lib'))
 */
export class ExternalModuleImport implements Import {
  constructor(
    public readonly libraryName: string,
    public readonly alias: string,
  ) {}
}

/**
 * Symbol specifier for named imports.
 */
export interface SymbolSpecifier {
  specifier: string;
  alias?: string;
  isTypeOnly?: boolean;
}
