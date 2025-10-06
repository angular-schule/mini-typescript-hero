# TypeScript Hero is dead (is yet another VS Code extension gone forever?)

**Nope, long live Mini TypeScript Hero!** 🦸‍♂️

---

I use TypeScript Hero every single day. Multiple times per hour, actually. One keyboard shortcut (`Ctrl+Alt+O`) and my messy imports transform into a perfectly organized, alphabetically sorted list. Unused imports? Gone. Proper grouping? Done. Consistent formatting? Check.

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

**After** pressing `Ctrl+Alt+O`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

import { BookList } from './components/book-list';
import { UserDetail } from './components/user-detail';
```

Angular libraries grouped together and merged into one import. RxJS separate. Then local imports. Unused imports removed. Everything sorted. Consistent quotes and semicolons. Beautiful.

**I literally can't imagine working without this.**

## The Mission

[Christoph Bühler](https://me.cbue.ch/), the original author of TypeScript Hero, no longer had time to maintain the extension. He's moved on from TypeScript work, which is totally fair. We all have our seasons with different technologies.

But I needed this feature. Every. Single. Day.
So I reached out to Christoph with a simple question: Could I rescue the import organizer and release it as a new extension?
His response was incredibly kind and supportive. He gave me his blessing, shared what code he still had, and even said he'd be excited to see the work continue.

**My mission was simple**: Preserve this feature for myself. And hopefully, other people will like it too.

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
- Simpler, cleaner architecture
- No deprecated dependencies

**New feature:**
- **Import merging**: Automatically combines duplicate imports from the same module (e.g., two separate `@angular/core` imports become one). This is enabled by default for new users, while migrated users keep the original behavior.

The goal was simple: **Future-proof**. Make sure this tool keeps working for years to come, without depending on abandoned libraries.

## Seamless Migration

If you're already using TypeScript Hero, switching is painless:

1. Install Mini TypeScript Hero from the marketplace
2. Open VSCode
3. Your settings automatically migrate (one-time, on first startup)
4. Done.

All your custom configurations transfer automatically. This includes quote style, semicolons, import grouping rules, and everything else. You can even keep both extensions installed if you want. But I highly recommend deactivating the old hero, because both extensions will fight for the same shortcut.

The keyboard shortcut works exactly the same: `Ctrl+Alt+O` (or `Cmd+Alt+O` on macOS).

## A Quick Thank You

This extension is **MIT licensed and free for everyone**.

I'm incredibly grateful to Christoph Bühler for creating TypeScript Hero in the first place, and for being so generous in allowing this work to continue. The original code, the design decisions, the thoughtful features: all of that came from Christoph.

I'm just keeping the lights on and making sure it stays maintained.

## Install Mini TypeScript Hero Now

Ready to organize your imports with a single keystroke?

**Install from VSCode Marketplace:**
Search for "Mini TypeScript Hero" or visit:
👉 [marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero](https://marketplace.visualstudio.com/items?itemName=angular-schule.mini-typescript-hero)

**Keyboard shortcut:**
`Ctrl+Alt+O` (Windows/Linux) | `Cmd+Alt+O` (macOS)

**Works with:**
TypeScript, JavaScript, TSX, JSX

**Found a bug or have a feature request?**
👉 [github.com/angular-schule/mini-typescript-hero](https://github.com/angular-schule/mini-typescript-hero)

---

**TL;DR:** TypeScript Hero isn't dead. It's just been upgraded for 2025 with a new name. The most important feature was preserved. All other features are now directly integrated in VSCode.

Happy coding! ✨