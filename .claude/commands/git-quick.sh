#!/bin/bash

# Git Quick Commit Script - Automates commit and push with safety checks
# Usage: ./scripts/git-quick.sh "Your commit message here"

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if commit message was provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a commit message${NC}"
    echo "Usage: $0 \"Your commit message here\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo -e "${BLUE}Starting git quick commit process...${NC}"

# Step 1: Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"

if [[ "$CURRENT_BRANCH" == "stage-test" ]] || [[ "$CURRENT_BRANCH" == "stage-prod" ]]; then
    echo -e "${RED}Error: Cannot commit directly to $CURRENT_BRANCH branch!${NC}"
    echo -e "${RED}These branches are not intended for normal development.${NC}"
    exit 1
fi

# Step 2: Stage all files
echo -e "${BLUE}Staging all changes...${NC}"
git add -A
git status --short

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

# Step 3: Create commit
echo -e "${BLUE}Creating commit...${NC}"
git commit -m "$COMMIT_MESSAGE"
COMMIT_SHA=$(git rev-parse HEAD)
echo -e "${GREEN}Commit created: ${YELLOW}$COMMIT_SHA${NC}"

# Step 4: Pull latest changes with rebase
echo -e "${BLUE}Pulling latest changes with rebase...${NC}"
if ! git pull --rebase origin "$CURRENT_BRANCH" 2>&1; then
    echo -e "${RED}Rebase failed! Aborting rebase...${NC}"
    git rebase --abort 2>/dev/null || true
    echo -e "${RED}Please resolve conflicts manually and try again${NC}"
    exit 1
fi

# Step 5: Push to origin
echo -e "${BLUE}Pushing to origin...${NC}"
git push origin "$CURRENT_BRANCH"

# Step 6: Show final status
echo -e "${GREEN}✓ Successfully pushed to origin/$CURRENT_BRANCH${NC}"
echo -e "${BLUE}Final status:${NC}"
git status --short --branch

echo -e "${GREEN}Commit ${YELLOW}$COMMIT_SHA${GREEN} has been successfully pushed!${NC}"