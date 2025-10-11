---
description: Quick commit and push with safety checks
allowed-tools: Bash
---

# ⚠️ CRITICAL: TOKEN-SAVING INSTRUCTIONS FOR CLAUDE ⚠️

**DO NOT** run any git commands before executing this script!
**DO NOT** check git status, git diff, or any other commands!
**DO NOT** analyze or inspect files!

**ONLY DO THIS:**
1. Craft a good commit message based on what was discussed
2. DIRECTLY EXECUTE the script using the Bash tool with that message (DO NOT print or show the command)
3. Let the script handle EVERYTHING else

The script automatically handles:
- Staging all changes
- Creating the commit
- Pulling latest changes
- Pushing to origin
- All safety checks

**WASTING TOKENS ON PRELIMINARY CHECKS DEFEATS THE PURPOSE OF THIS AUTOMATION!**

---

Execute the automated git-quick script:

```bash
cd $(git rev-parse --show-toplevel) && ./.claude/commands/git-quick.sh "Your commit message here"
```

**IMPORTANT:** The assistant must use the Bash tool to execute this command directly, not display it.

## Commit Message Guidelines

Write comprehensive, multi-line commit messages that tell a complete story about the change. A great commit message should:

### Structure:
1. **Subject Line (First Line)**: 
   - Start with conventional commit type: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `perf:`
   - Keep under 72 characters
   - Use imperative mood ("add feature" not "added feature")
   - Capitalize first word after prefix
   
2. **Blank Line**: Always separate subject from body

3. **Body (Detailed Explanation)**:
   - Explain WHAT changed and WHY (not just how)
   - Wrap lines at 72 characters for readability
   - Use bullet points for multiple changes
   - Include context about the problem being solved
   - Mention any breaking changes or migrations needed
   - Reference related issues or tickets

4. **Footer (Optional)**:
   - Breaking changes: `BREAKING CHANGE: description`
   - Issue references: `Fixes #123`, `Closes #456`
   - **NEVER add Co-authored-by for AI assistants or Claude**

### Example of an Excellent Commit Message:

```
feat: Add multi-school support with active school selection

Implements a global school selection system that allows users with access
to multiple schools to switch between them seamlessly. The active school
context is maintained throughout the application and persists across
browser sessions.

Key changes:
- Added activeSchoolId signal to AuthService for reactive school tracking
- Implemented setActiveSchool() method with automatic dashboard redirect
- Created school selector dropdown component in the main navigation
- Updated all API endpoints to accept schoolId parameter
- Added localStorage persistence for selected school preference
- Implemented validation to ensure selected school still exists on startup

The system automatically selects the first non-personal school on login,
falling back to the first available school if no institutional schools
exist. This provides a smooth onboarding experience while maintaining
flexibility for multi-school educators.

Technical considerations:
- School ID is passed as explicit parameter to maintain clean API contracts
- No interceptors or hidden headers to avoid magic behavior
- Reactive signals ensure UI updates automatically on school change
- Cross-tab synchronization via localStorage events

This change prepares the foundation for role-based features where teachers
may have different permissions across different schools.

Fixes #234
BREAKING CHANGE: API endpoints now require explicit schoolId parameter
