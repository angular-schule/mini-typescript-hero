# How Mini TypeScript Hero Handles Blank Lines

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Problem: Old TypeScript Hero Behavior](#the-problem-old-typescript-hero-behavior)
3. [Industry Standards Research](#industry-standards-research)
4. [Our Solution: New Default Behavior](#our-solution-new-default-behavior)
5. [Configuration Options](#configuration-options)
6. [Detailed Specification](#detailed-specification)
7. [Test Case Matrix](#test-case-matrix)

---

## Executive Summary

**TL;DR:**
- **Default**: Always 1 blank line AFTER imports (industry standard)
- **Mandatory**: Always 1 blank line BETWEEN import groups (key feature)
- **Before imports**: Preserve intentional spacing (respect user's header formatting)
- **Leading blanks**: Remove pointless blank lines at file start
- **Trailing whitespace**: Always remove (no spaces at end of lines)

---

## The Problem: Old TypeScript Hero Behavior

### What We Discovered

Through extensive manual testing, we discovered the original TypeScript Hero had **unexpected and confusing behavior** regarding blank lines.

### Old Algorithm (Lines 360-383 in import-manager.ts)

```typescript
// Step 1: Delete all imports
for (const imp of this._parsedDocument.imports) {
  edits.push(TextEdit.delete(importRange(document, imp.start, imp.end)));

  // For EACH import, check next line
  const nextLine = document.lineAt(document.positionAt(imp.end).line + 1);
  if (nextLine.text === '') {
    // If blank, delete it
    edits.push(TextEdit.delete(nextLine.rangeIncludingLineBreak));
  }
}

// Step 2: Generate organized imports
const imports = this.importGroups
  .map(group => this.generator.generate(group as any))  // "import A\nimport B\n"
  .filter(Boolean)
  .join('\n');  // Groups joined with single \n

// Step 3: Insert at position
edits.push(
  TextEdit.insert(
    getImportInsertPosition(window.activeTextEditor),
    `${imports}\n`,
  ),
);
```

### The Insert Position Bug

```typescript
const REGEX_IGNORED_LINE = /^\s*(?:\/\/|\/\*|\*\/|\*|#!|(['"])use strict\1)/;
const index = lines.findIndex(line => !REGEX_IGNORED_LINE.test(line));
return new Position(Math.max(0, index), 0);
```

**Problem:** Blank lines do NOT match `REGEX_IGNORED_LINE`!

**Result:**
```typescript
// Comment
[blank line]  ← Insert position points HERE!
import A
import B
```

The blank line BEFORE imports becomes a blank line AFTER imports when reorganized.

### Manual Test Results

| Lines BEFORE | Lines AFTER (input) | Lines AFTER (output) | What Happened |
|--------------|---------------------|----------------------|---------------|
| 0            | 0                   | 1                    | Added 1 (group separator) |
| 0            | 1                   | 1                    | Deleted 1, added 1 back |
| 0            | 2                   | 2                    | Deleted 1, kept 1 extra |
| 0            | 3                   | 3                    | Deleted 1, kept 2 extra |
| 1            | 0                   | 2                    | Blank moved! (1 moved + 1 group) |
| 1            | 1                   | 2                    | Blank moved! (1 moved + 0 after delete) |
| 1            | 2                   | 3                    | Blank moved! (1 moved + 1 after delete) |
| 1            | 3                   | 4                    | Blank moved! (1 moved + 2 after delete) |

**Pattern:**
```
finalBlanks = blanksBefore + groupSeparatorBlanks + max(blanksAfter - 1, 0)
```

### Why This Was Confusing

1. ❌ **Unpredictable**: Blanks before affect blanks after
2. ❌ **Magic movement**: Users don't expect blanks to relocate
3. ❌ **Inconsistent**: 0→1, 1→1, but 1 before + 0 after → 2
4. ❌ **Not industry standard**: Google/ESLint recommend exactly 1 blank

### Group Generation (The Good Part)

```typescript
// Each group generates (line 38 of test file):
group.sortedImports.map(imp => gen.generate(imp)).join('\n') + '\n'

// Groups joined (line 376):
.join('\n')

// Result with 2 groups:
// "import A\nimport B\n" + "\n" + "import C\n"
//  ^^^^^^^^^^^^^^^^^^^^    ^^^^   ^^^^^^^^^^^
//  Group 1 (ends with \n)  join   Group 2 (ends with \n)
//
// = "import A\nimport B\n\nimport C\n"
//                       ^^
//                       1 blank line between groups ✓
```

**This is a KEY FEATURE we must preserve!** Always 1 blank line between import groups.

---

## Industry Standards Research

### Google TypeScript Style Guide

> **"Exactly one blank line"** separates each section that is present.
>
> Files consist of the following, **in order**:
> 1. Copyright information, if present
> 2. JSDoc with @fileoverview, if present
> 3. Imports, if present
> 4. The file's implementation
>
> **Exactly one blank line** separates each section that is present.

**Source:** https://google.github.io/styleguide/tsguide.html

### ESLint: import/newline-after-import

**Default:** 1 blank line after imports

**Configuration:**
```json
{
  "rules": {
    "import/newline-after-import": ["error", { "count": 1 }]
  }
}
```

**Source:** https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/newline-after-import.md

### Prettier

**Behavior:** Collapses multiple blank lines to maximum 1

**Philosophy:** Preserve up to one blank line between code segments, but never more than one.

### Angular Style Guide

**No specific guidance** on blank lines after imports. Defers to general TypeScript/JavaScript practices.

### Airbnb JavaScript Style Guide

**General rule:** Leave a blank line after blocks and before the next statement.

**No specific requirement** for exact number of blank lines after imports.

### Conclusion

**Industry consensus:** **1 blank line after imports** is the standard.

---

## Our Solution: New Default Behavior

### Design Principles

1. **Industry standard by default**: 1 blank line after imports
2. **Respect user intent**: Don't remove intentional spacing in headers
3. **Predictable**: Same input → same output, always
4. **Configurable**: Support different team preferences
5. **Backward compatible**: Legacy mode for migrated users

### Blank Lines AFTER Imports

**Default: `"one"`** (always normalize to 1 blank line)

**BEFORE organizing:**
```typescript
import { Component } from '@angular/core';
import { BookList } from './components/book-list';


@Component({ selector: 'app-test' })
```

**AFTER organizing (normalized to 1):**
```typescript
import { Component } from '@angular/core';

import { BookList } from './components/book-list';

@Component({ selector: 'app-test' })
//          ^ Exactly 1 blank line
```

**Rationale:**
- ✅ Matches Google TypeScript Style Guide
- ✅ Matches ESLint defaults
- ✅ Consistent across entire codebase
- ✅ No surprises

### Blank Lines BEFORE Imports

**Default: `"preserve"`** (respect user's header formatting)

**BEFORE organizing:**
```typescript
// Copyright 2025
// File description

import { A } from './a';
```

**AFTER organizing:**
```typescript
// Copyright 2025
// File description

import { A } from './a';
//        ^ Blank preserved (intentional separation)
```

**Rationale:**
- ✅ Assumes user formatted header intentionally
- ✅ Common pattern: blank line after copyright/description
- ✅ No industry standard to enforce
- ✅ Respects user preference

**Special case: Leading blank lines**

**BEFORE organizing:**
```typescript

// Comment
import { A } from './a';
```

**AFTER organizing:**
```typescript
// Comment
import { A } from './a';
//        ^ Leading blank removed (pointless)
```

**Rationale:**
- ✅ Blank lines at start of file serve no purpose
- ✅ Most linters flag this as a warning
- ✅ Common git pre-commit hook removes them

### Blank Lines BETWEEN Import Groups

**Always exactly 1 blank line** (non-configurable, mandatory feature)

**BEFORE organizing:**
```typescript
import { Component } from '@angular/core';
import { BookList } from './components/book-list';
import { map } from 'rxjs/operators';
```

**AFTER organizing:**
```typescript
import { Component } from '@angular/core';
import { map } from 'rxjs/operators';

import { BookList } from './components/book-list';
//        ^ Always 1 blank between Modules and Workspace groups
```

**Rationale:**
- ✅ **Key feature** of TypeScript Hero (original and mini)
- ✅ Essential for readability
- ✅ Shows logical separation (external deps vs local files)
- ✅ Standard in Angular community
- ✅ Helps avoid merge conflicts

### Trailing Whitespace

**Always removed** (non-configurable)

**BEFORE organizing:**
```typescript
import { A } from './a';    [4 spaces here]

export class Test {}
```

**AFTER organizing:**
```typescript
import { A } from './a';
[no spaces on blank line]
export class Test {}
```

**Rationale:**
- ✅ Industry standard
- ✅ Prettier removes it
- ✅ Most linters flag it
- ✅ Git shows it as red in diffs
- ✅ No valid use case for trailing whitespace

---

## Configuration Options

### `miniTypescriptHero.imports.blankLinesAfterImports`

**Type:** `string`
**Default:** `"one"`
**Options:**
- `"one"` - Always exactly 1 blank line (Google/ESLint standard) ✅ **RECOMMENDED**
- `"two"` - Always exactly 2 blank lines (for teams preferring more separation)
- `"preserve"` - Keep existing blank lines (0, 1, 2, 3+)
- `"legacy"` - Match original TypeScript Hero behavior (migration only)

**Description:** Number of blank lines after the last import before code starts.

**Examples:**

**Mode `"one"` (default):**
```typescript
import { A } from './a';

export class Test {}
```

**Mode `"two"`:**
```typescript
import { A } from './a';


export class Test {}
```

**Mode `"preserve"` (if file had 3 blank lines):**
```typescript
import { A } from './a';



export class Test {}
```

**Legacy Mode (`legacyMode: true`):**
Uses `'preserve'` behavior automatically. See test matrix for exact behavior (complex formula based on blanks before and after).

### Migration Strategy

**For migrated users** (detected by settings migration):
- Auto-set `legacyMode: true`
- Maintains exact old behavior (uses `'preserve'` mode for blank lines)
- Can manually change to `legacyMode: false` and `blankLinesAfterImports: "one"` anytime

**For new users:**
- Default `legacyMode: false` with `blankLinesAfterImports: "one"` (industry standard)
- Clean, consistent, predictable

---

## Detailed Specification

### Algorithm: Blank Lines BEFORE Imports

#### Step 1: Detect File Header

Scan from line 0 until first non-header line:

**Header lines** (preserve with their blank lines):
- Comments: `//`, `/*`, `*/`, `*`
- Shebang: `#!/...`
- `'use strict'` or `"use strict"`
- Blank lines AFTER any of the above

**First non-header line:**
- Import statement
- Code
- Blank line with no header before it (leading blank)

#### Step 2: Identify Leading Blanks

**CASE 1: Leading blanks (remove)**
```typescript
[blank]  ← Leading blank (no header)
[blank]  ← Leading blank (no header)
import { A } from './a';
```

**CASE 2: Header blanks (preserve)**
```typescript
// Comment
[blank]  ← Header blank (after comment)
import { A } from './a';
```

**CASE 3: No blanks (leave as-is)**
```typescript
// Comment
import { A } from './a';
```

#### Step 3: Preserve Header with Blanks

When organizing imports:
1. Extract header (comments + shebangs + 'use strict')
2. Count blank lines after header (before first import)
3. Delete all old content
4. Insert: header + blank lines + organized imports

**Result:** Header formatting preserved exactly.

### Algorithm: Blank Lines AFTER Imports

#### Mode: "one" (default)

```typescript
getImportInsertPosition() {
  // Find end of header
  let insertLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (isHeaderLine(lines[i])) continue;
    if (isBlankLine(lines[i]) && insertLine === 0) continue; // Skip leading blanks
    insertLine = i;
    break;
  }

  // Track blank lines after header
  let blankLinesAfterHeader = 0;
  while (insertLine < lines.length && isBlankLine(lines[insertLine])) {
    blankLinesAfterHeader++;
    insertLine++;
  }

  return { position: insertLine, blankLinesAfterHeader };
}

organizeImports() {
  const { position, blankLinesAfterHeader } = getImportInsertPosition();

  // Delete old imports + all blank lines after them
  deleteImportsAndBlanksAfter();

  // Generate organized imports with group separators
  const importText = generateOrganizedImports(); // Ends with \n

  // Insert with EXACTLY 1 blank line after
  const finalText = header
    + '\n'.repeat(blankLinesAfterHeader)
    + importText
    + '\n';  // ← Always 1 blank after imports

  insert(position, finalText);
}
```

#### Mode: "two"

Same as "one" but:
```typescript
+ '\n\n';  // ← Always 2 blanks after imports
```

#### Mode: "preserve"

```typescript
organizeImports() {
  // Count existing blank lines after imports
  const existingBlanksAfter = countBlanksAfterLastImport();

  // Generate imports
  const importText = generateOrganizedImports();

  // Preserve exact count
  const finalText = header
    + '\n'.repeat(blankLinesAfterHeader)
    + importText
    + '\n'.repeat(existingBlanksAfter);

  insert(position, finalText);
}
```

#### Mode: "legacy"

```typescript
organizeImports() {
  // Replicate old TypeScript Hero algorithm

  // Step 1: Delete each import + one blank after (if exists)
  for (const imp of imports) {
    deleteImport(imp);
    const nextLine = getLineAfter(imp);
    if (isBlank(nextLine)) {
      deleteLine(nextLine);  // Delete ONE blank
    }
  }

  // Step 2: Find insert position (can be at blank line!)
  const insertPos = findFirstNonCommentLine();  // Blank lines don't match!

  // Step 3: Generate with group separators
  const importText = generateOrganizedImports() + '\n';

  // Step 4: Insert
  insert(insertPos, importText);

  // Result: Blanks before imports end up after imports!
}
```

### Algorithm: Import Group Separation

**Non-configurable** - always 1 blank line between groups.

```typescript
generateOrganizedImports() {
  const groupTexts = [];

  for (const group of importGroups) {
    if (group.imports.length === 0) continue;

    // Each import ends with \n
    const imports = group.sortedImports
      .map(imp => generateImportStatement(imp))  // "import { A } from './a';"
      .join('\n');  // "import A\nimport B"

    groupTexts.push(imports);
  }

  // Join groups with \n (creates blank line between)
  // Group1: "import A\nimport B" + "\n" + Group2: "import C"
  // Result: "import A\nimport B\n\nimport C"
  //                              ^^ blank line
  return groupTexts.join('\n');
}
```

**Example:**
```typescript
// 2 groups: Modules + Workspace
// Modules: ['@angular/core', 'rxjs']
// Workspace: ['./my-service']

// Step 1: Generate each group
const modulesText = `import { Component } from '@angular/core';
import { map } from 'rxjs/operators';`;

const workspaceText = `import { MyService } from './my-service';`;

// Step 2: Join with \n
const result = modulesText + '\n' + workspaceText;

// Result:
// import { Component } from '@angular/core';
// import { map } from 'rxjs/operators';
// [blank line from join]
// import { MyService } from './my-service';
```

### Algorithm: Trailing Whitespace

**Always removed** - no configuration needed.

```typescript
generateImportStatement(imp: Import): string {
  // ... generate import text ...

  // Ensure no trailing whitespace
  return importText.trimEnd();
}

generateOrganizedImports(): string {
  // ... generate all imports ...

  // Each line is trimmed, blank lines are truly blank (no spaces)
  return importLines.map(line => line.trimEnd()).join(eol);
}
```

---

## Test Case Matrix

### Test Group 1: Blank Lines AFTER Imports

#### Mode: "one" (default)

| Input Blanks After | Output Blanks After | Test Case |
|--------------------|---------------------|-----------|
| 0                  | 1                   | TC-001    |
| 1                  | 1                   | TC-002    |
| 2                  | 1                   | TC-003    |
| 3                  | 1                   | TC-004    |
| 5                  | 1                   | TC-005    |

**Verification:** Always exactly 1 blank line, regardless of input.

#### Mode: "two"

| Input Blanks After | Output Blanks After | Test Case |
|--------------------|---------------------|-----------|
| 0                  | 2                   | TC-010    |
| 1                  | 2                   | TC-011    |
| 2                  | 2                   | TC-012    |
| 3                  | 2                   | TC-013    |

**Verification:** Always exactly 2 blank lines, regardless of input.

#### Mode: "preserve"

| Input Blanks After | Output Blanks After | Test Case |
|--------------------|---------------------|-----------|
| 0                  | 0                   | TC-020    |
| 1                  | 1                   | TC-021    |
| 2                  | 2                   | TC-022    |
| 3                  | 3                   | TC-023    |
| 5                  | 5                   | TC-024    |

**Verification:** Output exactly matches input.

#### Mode: "legacy"

| Blanks Before | Blanks After (in) | Blanks After (out) | Test Case | Formula Check |
|---------------|-------------------|--------------------|-----------|-|
| 0             | 0                 | 1                  | TC-030    | 0 + 1 + max(0-1, 0) = 1 ✓ |
| 0             | 1                 | 1                  | TC-031    | 0 + 1 + max(1-1, 0) = 1 ✓ |
| 0             | 2                 | 2                  | TC-032    | 0 + 1 + max(2-1, 0) = 2 ✓ |
| 0             | 3                 | 3                  | TC-033    | 0 + 1 + max(3-1, 0) = 3 ✓ |
| 1             | 0                 | 2                  | TC-034    | 1 + 1 + max(0-1, 0) = 2 ✓ |
| 1             | 1                 | 2                  | TC-035    | 1 + 1 + max(1-1, 0) = 2 ✓ |
| 1             | 2                 | 3                  | TC-036    | 1 + 1 + max(2-1, 0) = 3 ✓ |
| 2             | 0                 | 3                  | TC-037    | 2 + 1 + max(0-1, 0) = 3 ✓ |
| 2             | 1                 | 3                  | TC-038    | 2 + 1 + max(1-1, 0) = 3 ✓ |

**Formula:** `finalBlanks = blanksBefore + 1 (group separator) + max(blanksAfter - 1, 0)`

### Test Group 2: Blank Lines BEFORE Imports

#### Leading Blanks (always removed)

| Input | Output | Test Case |
|-------|--------|-----------|
| `\n\nimport A` | `import A` | TC-100 |
| `\n\n\n// Comment\nimport A` | `// Comment\nimport A` | TC-101 |

#### Header with Blanks (preserved)

| Input | Output | Test Case |
|-------|--------|-----------|
| `// Comment\nimport A` | `// Comment\nimport A` | TC-110 |
| `// Comment\n\nimport A` | `// Comment\n\nimport A` | TC-111 |
| `// Comment\n\n\nimport A` | `// Comment\n\n\nimport A` | TC-112 |
| `// Copyright\n// Info\n\nimport A` | `// Copyright\n// Info\n\nimport A` | TC-113 |

#### Shebang (preserved)

| Input | Output | Test Case |
|-------|--------|-----------|
| `#!/usr/bin/env node\nimport A` | `#!/usr/bin/env node\nimport A` | TC-120 |
| `#!/usr/bin/env node\n\nimport A` | `#!/usr/bin/env node\n\nimport A` | TC-121 |

#### Use Strict (preserved)

| Input | Output | Test Case |
|-------|--------|-----------|
| `'use strict';\nimport A` | `'use strict';\nimport A` | TC-130 |
| `'use strict';\n\nimport A` | `'use strict';\n\nimport A` | TC-131 |
| `"use strict";\nimport A` | `"use strict";\nimport A` | TC-132 |

### Test Group 3: Import Group Separation

**All modes** - always 1 blank line between groups

| Groups | Expected Blanks Between | Test Case |
|--------|------------------------|-----------|
| Modules only | 0 (no groups to separate) | TC-200 |
| Workspace only | 0 (no groups to separate) | TC-201 |
| Modules + Workspace | 1 | TC-202 |
| Plains + Modules + Workspace | 2 (1 between each) | TC-203 |
| Custom Regex groups | 1 (between each group) | TC-204 |

**Example TC-203:**

**BEFORE organizing (messy):**
```typescript
import './polyfills';
import { Component } from '@angular/core';
import { MyService } from './my-service';
```

**AFTER organizing:**
```typescript
import './polyfills';

import { Component } from '@angular/core';

import { MyService } from './my-service';
```

### Test Group 4: Combined Scenarios

#### Mode "one" + Header with Blanks

| Input | Output | Test Case |
|-------|--------|-----------|
| `// Header\n\nimport A\n\n\ncode` | `// Header\n\nimport A\n\ncode` | TC-300 |

**Explanation:**
- Header: `// Header`
- Blanks after header: 1 (preserved)
- Imports: `import A`
- Blanks after imports: Normalized to 1
- Code: `code`

#### Mode "preserve" + Header

| Input | Output | Test Case |
|-------|--------|-----------|
| `// Header\n\nimport A\n\n\ncode` | `// Header\n\nimport A\n\n\ncode` | TC-310 |

**Explanation:**
- Everything preserved exactly

#### Mode "legacy" + Header with 1 Blank

| Input | Output | Test Case |
|-------|--------|-----------|
| `// Header\n\nimport A\ncode` | `// Header\nimport A\n\ncode` | TC-320 |

**Explanation:**
- Blank before imports (1) moves to after
- Formula: 1 + 1 + 0 = 2 blanks after

### Test Group 5: Edge Cases

| Scenario | Expected Behavior | Test Case |
|----------|-------------------|-----------|
| File with only imports | Imports organized, no code after | TC-400 |
| File with no imports | No changes | TC-401 |
| Empty file | No changes | TC-402 |
| Whitespace-only file | File becomes empty | TC-403 |
| CRLF line endings | CRLF preserved in output | TC-404 |
| Mixed import types | All types handled correctly | TC-405 |
| Trailing whitespace on blank lines | Removed | TC-406 |
| Trailing whitespace on import lines | Removed | TC-407 |

---

## Implementation Checklist

### Phase 1: Core Algorithm
- [ ] Implement "one" mode (default)
- [ ] Implement "two" mode
- [ ] Implement "preserve" mode
- [ ] Implement "legacy" mode
- [ ] Implement header detection
- [ ] Implement leading blank removal
- [ ] Implement group separation (always 1 blank)
- [ ] Implement trailing whitespace removal

### Phase 2: Configuration
- [ ] Add `blankLinesAfterImports` config option
- [ ] Add migration logic (set "legacy" for migrated users)
- [ ] Update package.json contributions
- [ ] Add configuration validation

### Phase 3: Testing
- [ ] TC-001 to TC-005: Mode "one"
- [ ] TC-010 to TC-013: Mode "two"
- [ ] TC-020 to TC-024: Mode "preserve"
- [ ] TC-030 to TC-038: Mode "legacy"
- [ ] TC-100 to TC-101: Leading blanks
- [ ] TC-110 to TC-113: Header blanks
- [ ] TC-120 to TC-121: Shebang
- [ ] TC-130 to TC-132: Use strict
- [ ] TC-200 to TC-204: Group separation
- [ ] TC-300 to TC-320: Combined scenarios
- [ ] TC-400 to TC-407: Edge cases

### Phase 4: Documentation
- [ ] Update README.md with blank line behavior
- [ ] Add examples for each mode
- [ ] Document migration behavior
- [ ] Add troubleshooting section

---

## Frequently Asked Questions

### Why not match old TypeScript Hero exactly?

The old behavior was buggy and confusing. Blank lines would "move" from before imports to after imports due to how the insert position was calculated. This was never intentional - it was a side effect of the implementation.

### Why 1 blank line as default?

It's the industry standard recommended by Google TypeScript Style Guide and ESLint. It provides consistent, predictable formatting across all files.

### When should I use "two" mode?

If your team prefers more visual separation between imports and code. Some teams find 2 blank lines makes the code easier to scan visually.

### When should I use "preserve" mode?

If you have specific formatting requirements that vary by file, or if you want complete control over spacing. However, this may lead to inconsistency across your codebase.

### When should I use "legacy" mode?

Only if you're migrating from old TypeScript Hero and want to avoid any formatting changes during the transition. Once migrated, we recommend switching to "one" for better consistency.

### What if I have 3+ import groups?

Each group is separated by 1 blank line. With Plains + Modules + Workspace, you get 2 blank lines total (one between Plains and Modules, one between Modules and Workspace).

### Can I configure blank lines between groups?

No, this is always exactly 1 blank line. It's a key feature that makes import organization readable and is standard in the Angular community.

### What about files with no header comments?

If there are no header comments and no intentional blanks, imports start at line 0. The `blankLinesAfterImports` setting still controls spacing after imports.

---

**Document Version:** 1.0
**Date:** 2025-10-07
**Author:** Mini TypeScript Hero Team
**Status:** Ready for Implementation
