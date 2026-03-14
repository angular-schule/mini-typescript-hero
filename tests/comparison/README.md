# Comparison Tests

Verifies behavioral compatibility between old TypeScript Hero and new Mini TypeScript Hero.

---

## Structure

```
tests/comparison/
├── old-typescript-hero/     # Git submodule to buehler/typescript-hero
├── old-extension/adapter.ts # Wrapper for old extension
├── new-extension/adapter.ts # Wrapper for new extension
├── test-cases/              # Test files
└── out/                     # Compiled TypeScript
```

---

## Test Assertion Pattern

Every test MUST validate against explicit expected output.

### ❌ NEVER:

```typescript
const oldResult = await organizeImportsOld(input);
const newResult = await organizeImportsNew(input);
assert.equal(newResult, oldResult);  // WRONG - doesn't validate correctness
```

### ✅ ALWAYS:

```typescript
const input = `import { B, A } from './lib';`;
const expected = `import { A, B } from './lib';`;  // From REAL extension output

const oldResult = await organizeImportsOld(input);
const newResult = await organizeImportsNew(input);

assert.equal(oldResult, expected);
assert.equal(newResult, expected);
```

### For Different Outputs:

```typescript
const expectedOld = `import { MyType, MyValue } from './lib';`;
const expectedNew = `import type { MyType } from './lib';
import { MyValue } from './lib';`;

const oldResult = await organizeImportsOld(input);
const newResult = await organizeImportsNew(input, { legacyMode: false });

assert.equal(oldResult, expectedOld);
assert.equal(newResult, expectedNew);
```

---

## Type-Only Imports (TS 3.8+)

**Modern Mode** (`legacyMode: false`):
- Preserves `import type { Type }` declarations
- Keeps type-only and value imports separate
- Preserves per-specifier `type` modifiers: `import { type A, B }`

**Legacy Mode** (`legacyMode: true`):
- Strips `import type` keywords (matches old extension)
- Merges type-only and value imports

---

## Import Merging

Both extensions merge imports from the same module when `disableImportRemovalOnOrganize: false` (default).

**Merge Timing**:
- **Old extension**: Merges BEFORE `removeTrailingIndex`
  - `./lib/index` and `./lib` = different modules (don't merge)
- **New extension (legacy)**: Same as old
- **New extension (modern)**: Applies `removeTrailingIndex` FIRST, then merges
  - `./lib/index` and `./lib` both become `./lib` (do merge)

**Configuration**:
- **Old**: `disableImportRemovalOnOrganize` controls removal AND merging (coupled)
- **New**: Separate `disableImportRemovalOnOrganize` and `mergeImportsFromSameModule` settings

---

## Usage

```bash
npm install
npm test

# Specific category
npm test -- --grep "sorting"

# Watch mode
npm run watch-tests
```
