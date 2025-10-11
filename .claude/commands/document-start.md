---
description: Resume work from previous session
---

# Resume Previous Session

Please help me continue where we left off. Follow these steps:

## 1. Load Previous Context - READ EVERYTHING INTO CONTEXT!

**ABSOLUTE RULE: You MUST read the COMPLETE content of `CLAUDE_TODO.md` directly into your context. NO EXCEPTIONS.**

### Step-by-Step Process (EXECUTE EXACTLY - NO DEVIATIONS):

**STEP 1 - Count Total Lines (MANDATORY FIRST STEP)**:

Run `wc -l CLAUDE_TODO.md` to determine the file size.

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

<!-- ## 2. Clean Up Temporary Investigation Files

**Before proceeding with work, check for temporary debugging/investigation files:**

Common patterns to look for:
- `RLS_ISSUE.md`, `RLS_ISSUE2.md`, etc.
- `DEBUG_*.md`
- `INVESTIGATION_*.md`
- Any files mentioned in CLAUDE_TODO.md as "temporary" or "can be deleted"

**Decision criteria:**
- ✅ **Delete** if: Issue is resolved AND findings are documented in permanent files (CLAUDE.md, backend/CLAUDE.md, etc.)
- ❌ **Keep** if: Issue is still active OR contains unique information not documented elsewhere

**If you find candidates for deletion:**
- Briefly mention to user: "Found temporary file X.md - issue resolved and documented in Y. Should I delete it?"
- Wait for user confirmation before deleting

**Do NOT spend more than 30 seconds on this step - it's a quick sanity check, not a deep investigation.** -->

## 3. Resume Work Plan
Based on the TODO file:
- Identify the next immediate task
- Check for any dependencies or prerequisites
- Determine if any context needs refreshing

## 4. Provide Summary
After reviewing, provide a brief summary:
- Current story and progress
- Next steps to take
- Any issues that need addressing

Then ask: "Should I continue with the next task?"

Note: If `CLAUDE_TODO.md` doesn't exist or is empty, ask me what I'd like to work on today.

## 5. CRITICAL: Context Window Monitoring

**MANDATORY throughout the entire session:**

You receive context window usage information after EVERY tool call in the format:
```
Token usage: X/200000; Y remaining
```

**YOU MUST actively monitor this and take action when context is running low.**

### Action Thresholds:

**⚠️ WARNING LEVEL - Below 20% remaining (< 40,000 tokens):**
- Proactively inform the user: "Context window is at X% - consider saving progress soon"
- Continue working but be mindful

**🚨 CRITICAL LEVEL - Below 10% remaining (< 20,000 tokens):**
- **IMMEDIATELY stop all work**
- **URGENTLY recommend** to the user: "Context window critically low (X% remaining). We MUST run `/document-end` now to save progress before context is lost!"
- **DO NOT continue** until user runs `/document-end` or explicitly tells you to continue

### Why This Matters:
- If context fills up completely, the session will be lost
- All unsaved progress will be gone
- `/document-end` saves current state to `CLAUDE_TODO.md`
- This allows clean resumption in next session with `/document-start`

**This is NOT optional - you MUST actively monitor and warn the user.**
