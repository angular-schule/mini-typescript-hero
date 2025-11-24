# TypeScript Hero is dead (is yet another VS Code extension gone forever?)

**Nope, long live Mini TypeScript Hero!** 🦸‍♂️

---

I use TypeScript Hero every single day. Multiple times per hour, actually. One keyboard shortcut (`Ctrl+Alt+O`) and my messy imports transform into a well organized, alphabetically sorted list. Unused imports? Gone. Proper grouping? Done. Consistent formatting? Check.

Then one day, VSCode hit me with a warning I couldn't ignore: **"This extension is deprecated as it is no longer being maintained."**
My heart sank. Not another one.

## The Problem

Here's what TypeScript Hero does for me (and hopefully for you too):

**Before** (the chaos):

```typescript
import { UserDetail } from './components/user-detail';
import { Component } from '@angular/core';
import { UnusedService } from './services/unused';
import {Router} from "@angular/router"
import { map, switchMap } from 'rxjs/operators';
import {OnInit, inject} from "@angular/core"
import { BookList } from './components/book-list';
```

**After** pressing `Ctrl+Alt+O` (or `Cmd+Alt+O` on macOS):

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';
```

Angular libraries grouped together and automatically merged into one import. RxJS separate. Then local imports. Unused imports removed. Everything sorted. Consistent quotes and semicolons. One blank line after imports.

**This really helps keep the code clean.**

## The Mission

[Christoph Bühler](https://me.cbue.ch/), the original author of TypeScript Hero, no longer had time to maintain the extension. He's moved on from TypeScript work, which is totally fair. We all have our seasons with different technologies.

But I needed this feature. Every. Single. Day.
So I reached out to Christoph with a simple question: Could I rescue the import organizer and release it as a new extension?
His response was incredibly kind and supportive. He gave me his blessing, shared what code he still had, and even said he'd be excited to see the work continue.

**My mission was simple**: Preserve this feature for myself. And hopefully, other people will like it too.

## Wait, Doesn't VS Code Already Have This?

**Yes, but no.** VS Code has a built-in "Organize Imports" feature that removes unused imports, sorts alphabetically, and merges duplicate imports. Since TypeScript 4.7+, it preserves blank lines you manually add between import groups. The fundamental difference is **how groups are created**: you manually type blank lines (VS Code preserves them), versus automatic grouping (Mini TypeScript Hero creates them).

**VS Code's approach:** You type blank lines between imports to create groups. VS Code sees these blank lines and treats them as group separators, sorting within each group while preserving the blank lines. If you want external (node_modules) imports separated from internal (local files) imports, you manually add a blank line between them and maintain it yourself every time you add new imports.

**Mini TypeScript Hero's approach:** The extension automatically separates external (node_modules) from internal (local files) imports with blank lines between them—covering 90% of use cases without any configuration. Want more? Optionally add specific patterns like `["/^@angular/", "/rxjs/", "Workspace"]` to group framework or library imports separately. No manual maintenance required.

**What VS Code cannot do:**

❌ **Automatically create groups based on patterns** — Without manual blank lines, VS Code sorts everything alphabetically as one flat list
❌ **Remove `/index` from paths** — Keeps `./lib/index` as-is instead of cleaning to `./lib`
❌ **Sort by first specifier** — Only sorts by module path, not by the first imported name

**In practice:** When you add a new Angular import, VS Code requires you to manually maintain blank line separators between import groups. With Mini TypeScript Hero, you press `Ctrl+Alt+O` and it automatically places imports in the correct groups with proper spacing. Configure once, organize forever.

## What Changed Under the Hood

The original TypeScript Hero used Christoph's own `typescript-parser` library ([node-typescript-parser](https://github.com/buehler/node-typescript-parser) on GitHub), a great piece of software that did its job well. But like the extension itself, it hasn't been maintained in years. Updating it to work with modern TypeScript versions would become increasingly challenging.

For a tool I rely on daily, that was a ticking time bomb.

**The old engine:**
- `typescript-parser` (Christoph's library, great but unmaintained)
- InversifyJS for dependency injection
- Complex codebase from 2018

**The new engine:**
- [`ts-morph`](https://github.com/dsherret/ts-morph) v27 (actively maintained, modern)
- TypeScript 5.7 with strict mode
- Simpler, cleaner architecture, everything new
- No deprecated dependencies

**Key improvements:**
- **Smart blank line handling**: Choose how many blank lines you want after imports. The new default is 1 blank line (standard from ESLint), but you can configure it to 2 lines, preserve existing spacing, or use the old TypeScript Hero behavior. Honestly, I always felt that 1 line would be better than the old behavior where blank lines would sometimes "move" around unpredictably. Now everyone can decide what preference they have!
- **Configurable import merging**: The extension can combine multiple imports from the same module (like two `@angular/core` imports) into one clean statement. This is now a configurable option, and migrated users automatically get their original behavior preserved while new users benefit from modern best practices.
- **Workspace-wide organization**: Beyond the familiar single-file shortcut, you can now organize imports across your entire workspace or within specific folders via the context menu. Useful for cleaning up after major refactorings or onboarding new projects. The extension intelligently skips build artifacts and includes configurable exclude patterns for auto-generated files.
- **Modern TypeScript support**: Full support for TypeScript 3.8+ `import type` syntax and import attributes (`with { type: 'json' }`), preserving semantic import behavior for better type safety and tree-shaking. Legacy mode available for compatibility with older TypeScript versions.

The goal was simple: **Future-proof**. Make sure this tool keeps working for years to come, without depending on abandoned libraries.

## Migration

If you're already using TypeScript Hero, switching is straightforward:

1. Install Mini TypeScript Hero from the marketplace
2. Open VSCode
3. Your settings automatically migrate (one-time, on first startup)
4. Done.

All your custom configurations transfer automatically — quote style, semicolons, import grouping rules, blank line handling, everything. The extension preserves your output format by automatically enabling `legacyMode: true` for migrated users, which matches the old TypeScript Hero behavior as closely as possible, including replicating certain quirks to ensure consistent output. You can switch to the new defaults anytime you want cleaner, more consistent behavior. You can even keep both extensions installed if you want, but I highly recommend deactivating the old hero because both will fight for the same shortcut. Speaking of which: the keyboard shortcut works exactly the same, `Ctrl+Alt+O` (or `Cmd+Alt+O` on macOS).

## A Quick Thank You

This extension is **MIT licensed and free for everyone**.

I'm incredibly grateful to Christoph Bühler for creating TypeScript Hero in the first place, and for being so generous in allowing this work to continue. The original code, the design decisions, the thoughtful features: all of that came from Christoph.

I'm just keeping the lights on and making sure it stays maintained, though I'm known for being a lazy maintainer. Feel free to fork it when I ever abandon it.

## Install Mini TypeScript Hero Now

Ready to organize your imports with a single keystroke?

* **Install from VSCode Marketplace:**
    Search for "Mini TypeScript Hero" or visit:
    👉 [marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero](https://marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero)

* **Keyboard shortcut:**
    `Ctrl+Alt+O` (Windows/Linux) | `Cmd+Alt+O` (macOS)

* **Works with:**
    TypeScript, JavaScript, TSX, JSX

* **Found a bug or have a feature request?**
    👉 [github.com/angular-schule/mini-typescript-hero](https://github.com/angular-schule/mini-typescript-hero)

---

**TL;DR:** TypeScript Hero isn't dead. It's been rescued and modernized as Mini TypeScript Hero. VS Code has basic organize imports, but Mini TypeScript Hero gives you custom grouping patterns, formatting control, and import organization that can match your team's style guide.

Happy coding! ✨
