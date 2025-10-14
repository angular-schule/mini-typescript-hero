---
description: Resume work from previous session
---

# Resume Previous Session

Please help me continue where we left off. Follow these steps:

## 1. Load Previous Context - READ EVERYTHING INTO CONTEXT!

**ABSOLUTE RULE: You MUST read the COMPLETE content of `CLAUDE_TODO.md` directly into your context. NO EXCEPTIONS.**

### Step-by-Step Process (EXECUTE EXACTLY - NO DEVIATIONS):

**STEP 0 - Locate Git Root (ALWAYS FIRST)**:

Run `git rev-parse --show-toplevel` to find the project root directory. The `CLAUDE_TODO.md` file is ALWAYS at `$(git rev-parse --show-toplevel)/CLAUDE_TODO.md`.

**STEP 1 - Count Total Lines (MANDATORY SECOND STEP)**:

Run `wc -l $(git rev-parse --show-toplevel)/CLAUDE_TODO.md` to determine the file size.

**STEP 2 - Calculate Chunks Needed**:
- Chunk size: 2000 lines per chunk
- Calculate: `chunks_needed = ceiling(total_lines / 2000)`
- Example: 2897 lines → 2 chunks (lines 1-2000, then 2001-2897)

**STEP 3 - Read ALL Chunks Sequentially**:

⚠️ **YOU MUST read the file in chunks using offset/limit parameters.**

**Do NOT attempt to read the entire file without offset/limit - it will fail for large files.**

Read each chunk sequentially until you've loaded the entire file:

**Example for 2897 lines (2 chunks):**
- First message: Read with offset=1, limit=2000 (loads lines 1-2000)
- Second message: Read with offset=2001, limit=897 (loads lines 2001-2897)

**Example for 5500 lines (3 chunks):**
- First message: Read with offset=1, limit=2000 (loads lines 1-2000)
- Second message: Read with offset=2001, limit=2000 (loads lines 2001-4000)
- Third message: Read with offset=4001, limit=1500 (loads lines 4001-5500)

**Continue reading until ALL lines are loaded into context.**

### What to Extract:
From the complete session history in `CLAUDE_TODO.md`:
- What story we were working on
- What was completed
- What remains to be done
- Any blockers or open questions
- All context needed to resume work

## 2. Resume Work Plan
Based on the TODO file:
- Identify the next immediate task
- Check for any dependencies or prerequisites
- Determine if any context needs refreshing

## 3. Provide Summary
After reviewing, provide a brief summary:
- Current story and progress
- Next steps to take
- Any issues that need addressing

Then ask: "Should I continue with the next task?"

Note: If `CLAUDE_TODO.md` doesn't exist or is empty, ask me what I'd like to work on today.
