---
description: Preserve session context before auto-compact
---

# Session Context Preservation

Please create a comprehensive session summary in `CLAUDE_TODO.md` that captures:

## 1. Current Work Status
- **Completed Tasks**: List all major changes made in this session
- **In-Progress Tasks**: Any work that was started but not completed
- **Blocked Items**: Any issues or questions that need resolution

## 2. Technical Context
- **Files Modified**: List all files that were changed with brief description of changes
- **Files Created**: List any new files created (mark temporary investigation files clearly)
- **Temporary/Debug Files**: If you created files like `DEBUG_*.md`, `INVESTIGATION_*.md` for debugging, mark them explicitly as "TEMPORARY - can be deleted after issue resolved"

## 3. Important Decisions
- **Architecture Choices**: Any significant technical decisions made
- **Open Questions**: Unresolved technical or business logic questions

## 4. Next Steps
- **Immediate TODO**: What should be done first when resuming
- **Testing Needed**: What needs to be tested or verified
- **Documentation Updates**: Any *.md or other docs that need updating

Format this as a structured markdown document that can be easily parsed when resuming work.

If the file already exists and has content it means that we want to persist multiple continued sessions.
Append your current session summary to the existing document, do NOT update existing content in the file.
We want to tell the full story.

## 5. How to Append Your Session Summary to the CLAUDE_TODO.md file

**CRITICAL: Always use git root to locate the file correctly!**

**Use Bash to append without reading the entire file:**

Use the Bash tool with `>>` redirect to append your session summary directly to `CLAUDE_TODO.md` without needing to read the existing content first.

**ALWAYS use this pattern to locate the file:**
```bash
cat >> "$(git rev-parse --show-toplevel)/CLAUDE_TODO.md" << 'EOF'

---

## Session: 2025-10-10 - Your Session Title

Your session summary content here...

EOF
```

This ensures the file is ALWAYS written to the correct location (git root), regardless of your current working directory. This allows efficient appending to arbitrarily large files without token concerns.

## 6. Commit All Changes

**If the session documentation was successful**, execute `/git-quick` to commit ALL open changes together with the updated `CLAUDE_TODO.md` file.

Only do this if everything worked flawlessly during the session - if there were any errors or issues, skip this step and report the problem to the user. 
