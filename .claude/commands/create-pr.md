---
description: Create a pull request with project-specific validation and spec integration
---

## User Input

```text
$ARGUMENTS
```

## Command Overview

Create a pull request with project-specific validation and integration with the speckit workflow. This command:

1. Detects feature branches (e.g., `001-csv-import`) and links to spec files
2. Runs project validations (type-check, lint, tests)
3. Generates PR descriptions with constitution compliance checklist
4. Handles both feature branches and regular branches with appropriate templates

## Execution Steps

### 1. Check Current State

Use the Bash tool to gather information about the current git state:

1. Get the current branch name with `git branch --show-current`
2. Get git status with `git status --short` to see modified/untracked files
3. Get all changes (staged and unstaged) with `git diff HEAD` to understand what changed

### 2. Detect Feature Branch Pattern

Check if the current branch follows the speckit pattern (`[number]-[feature-name]`):

1. Use a regex to test if the branch name matches `^([0-9]+)-(.+)$` pattern
2. If it matches:
   - Extract the feature number and name (e.g., "012-tax-features-stock" → num="012", name="tax-features-stock")
   - Construct the spec directory path: `specs/{number}-{name}`
   - Use the Bash tool to check if this directory exists with `test -d "specs/{number}-{name}" && echo "exists" || echo "not found"`
   - If the directory exists:
     - Mark this as a feature branch
     - Set SPEC_FILE path to `specs/{number}-{name}/spec.md`
     - Set TASKS_FILE path to `specs/{number}-{name}/tasks.md`
     - Report: "📋 Feature branch detected: {number}-{name}"
   - If the directory doesn't exist:
     - Mark as regular branch
     - Report: "⚠️ Spec directory not found (expected: specs/{number}-{name})"
3. If it doesn't match the pattern:
   - Mark as regular branch
   - Report: "ℹ️ Regular branch (not speckit feature)"

### 3. Run Project Validations

Run the project's validation suite using the Bash tool to ensure code quality:

1. Report "🔍 Running project validations..."

2. **Type checking**: Run `npm run type-check` using the Bash tool
   - Capture the exit code
   - Report " → Type checking..." before running

3. **Linting**: Run `npm run lint` using the Bash tool
   - Capture the exit code
   - Report " → Linting..." before running

4. **Unit tests**: Run `npm run test:run` using the Bash tool
   - Capture the exit code
   - Report " → Running tests..." before running

5. **Check results**:
   - If all three commands succeeded (exit code 0):
     - Report "✅ All validations passed!"
     - Proceed to step 4
   - If any command failed (exit code ≠ 0):
     - Report "⚠️ Validation Failures Detected:"
     - List which validations failed with their exit codes
     - Use the **AskUserQuestion tool** to ask: "Some validations failed. Do you want to proceed with creating the PR anyway?"
     - Provide two options:
       - "Yes, proceed anyway" (description: "Create the PR despite validation failures. You can fix issues in a follow-up commit.")
       - "No, abort" (description: "Stop the PR creation process so you can fix the issues first.")
     - If user selects "No, abort": Stop execution and report "PR creation aborted. Please fix the validation issues and try again."
     - If user selects "Yes, proceed anyway": Continue to step 4 and note the failures in the PR description

### 4. Create Branch if on Main

If currently on the `main` branch, create a feature branch first:

1. Check if the current branch is "main"
2. If yes:
   - Report "⚠️ Cannot create PR from main branch"
   - Analyze the git diff output from step 1 to understand what changes exist
   - Generate a descriptive branch name based on the changes:
     - Look for the primary file or component being modified
     - Create a name like `feature/{component}-{action}` or `fix/{component}-{issue}`
     - Examples: `feature/dashboard-widget`, `fix/transaction-form-validation`
   - Use the Bash tool to create and switch to the branch: `git checkout -b "{branch-name}"`
   - Report "✅ Created and switched to branch: {branch-name}"
3. If not on main:
   - Continue with the current branch

### 5. Stage and Commit Changes

Stage all modified files and create a commit:

1. **Parse git status** from step 1 output:
   - Extract modified files (lines starting with ` M`)
   - Extract untracked files (lines starting with `??`)

2. **Stage modified files**:
   - If there are modified files:
     - Report "📝 Staging modified files..."
     - Use the Bash tool to stage them: `git add -- "{file1}" "{file2}" ...` (quote each filename to handle spaces)
   - If there are untracked files:
     - Report "📄 Untracked files found: {list}"
     - Use the **AskUserQuestion tool** to ask: "Should these untracked files be included in the commit?"
     - For each untracked file, show it as an option with multiSelect enabled
     - Stage only the selected files using `git add -- "{file}"` (quote each filename)

3. **Generate commit message**:
   - Report "💬 Generating commit message..."
   - Use the Bash tool to get recent commits for style reference: `git log --format=%B -n 5`
   - Analyze the `git diff HEAD` output from step 1 to understand the changes:
     - Look for new files, modified files, deleted files
     - Identify the main component or area being changed
     - Determine the type of change: feat, fix, docs, style, refactor, test, chore
   - If this is a feature branch AND the spec file exists:
     - Use the Read tool to read the spec file
     - Extract the content under "## Feature Summary" heading for context
     - Use this to inform the commit message
   - If this is a regular branch:
     - Base the message on the git diff analysis
   - Create a commit message following conventional commits format:
     ```
     {type}({scope}): {short description}

     {detailed explanation of what changed and why}

     Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
     ```
   - Use the Bash tool to commit with the generated message using a heredoc:
     ```bash
     git commit -m "$(cat <<'EOF'
     {generated message}
     EOF
     )"
     ```

**Note**: Always quote filenames when using `git add` to handle filenames with spaces. The commit message should explain the "why" not just the "what".

### 6. Generate PR Description

Create a PR description based on branch type:

#### For Feature Branches (001-feature-name):

```markdown
## Summary

[Brief description from spec.md Feature Summary section, or generated from git diff analysis]

**Related Spec**: [specs/$FEATURE_NUM-$FEATURE_NAME/spec.md](specs/$FEATURE_NUM-$FEATURE_NAME/spec.md)
**Related Tasks**: [specs/$FEATURE_NUM-$FEATURE_NAME/tasks.md](specs/$FEATURE_NUM-$FEATURE_NAME/tasks.md)

### Changes in this PR

[Generate bullet points from git diff --stat and git log analysis]
- Updated [component/file] to [description]
- Added [new feature/functionality]
- Fixed [issue/bug]

## Test Plan

- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Unit tests pass (`npm run test:run`)
- [ ] E2E tests pass (`npm run test:e2e`) [if applicable]
- [ ] Manually tested in browser
- [ ] Verified against spec requirements

## Constitution Compliance

- [ ] **Privacy-First**: No data sent to server (all data in IndexedDB)
- [ ] **Financial Precision**: Uses Decimal.js for all monetary calculations (no floating-point arithmetic)
- [ ] **Type Safety**: TypeScript strict mode, no `any` types, no type assertions without validation
- [ ] **No Over-Engineering**: Changes are focused and minimal, only what was requested
- [ ] **Testing**: Unit tests for business logic, E2E tests for user workflows

## Additional Notes

[Any warnings from validations, known issues, or follow-up work needed]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

#### For Regular Branches (feature/*, fix/*):

```markdown
## Summary

[Brief description generated from git diff analysis and commit messages]

### Changes in this PR

[Generate bullet points from git diff analysis]
- [List of changes]

## Test Plan

- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Unit tests pass (`npm run test:run`)
- [ ] Manually tested in browser

## Notes

[Any warnings from validations or additional context]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 7. Push and Create PR

Push the branch and create the pull request:

1. **Push branch to remote**:
   - Report "⬆️ Pushing branch to origin..."
   - Use the Bash tool: `git push -u origin "{branch-name}"`
   - If this fails, report the error and suggest checking remote tracking configuration

2. **Extract PR title**:
   - **For feature branches**:
     - If spec file exists and was read in step 5, extract the title from the first line after "## Feature Summary" heading
     - If no spec file, use the first line of the commit message
   - **For regular branches**:
     - Use the first line of the commit message generated in step 5
   - Ensure the title is concise (< 72 characters)
   - Use present tense ("Add feature" not "Added feature")

3. **Create PR (as draft)**:
   - Report "🚀 Creating draft pull request..."
   - Use the Bash tool with `gh pr create` using a heredoc for the body (to avoid temp file issues):
     ```bash
     gh pr create --draft --title "{title}" --body "$(cat <<'EOF'
     {generated PR description from step 6}
     EOF
     )"
     ```
   - This approach avoids the need for temporary file cleanup
   - The `--draft` flag creates the PR as a draft, which skips E2E tests until ready for review

4. **Get PR URL and provide next steps**:
   - Use the Bash tool: `gh pr view --json url -q .url`
   - Report:
     ```
     ✅ Draft pull request created: {URL}

     📋 Next steps:
        • Fast checks (lint, types, unit tests) will run automatically
        • When ready for full review, run: gh pr ready
        • This will trigger E2E tests and mark the PR for review
     ```

**Note**: Using heredoc instead of temp files eliminates the need for cleanup and prevents issues if the command fails midway.

## Guidelines

### Commit Message Generation

Follow these steps to generate a meaningful commit message:

1. **Analyze the changes**: Review the `git diff HEAD` output from step 1:
   - Identify which files were modified, added, or deleted
   - Look for patterns: Are changes in tests? UI components? Services? Database?
   - Understand the nature of changes: new functionality, bug fixes, refactoring, documentation

2. **Determine commit type**:
   - `feat`: New feature or functionality added
   - `fix`: Bug fix or correction
   - `docs`: Documentation only changes
   - `style`: Code formatting (no logic changes)
   - `refactor`: Code restructuring (no behavior change)
   - `test`: Adding or updating tests
   - `chore`: Build process, dependencies, tooling

3. **Extract scope**: The component or area affected (e.g., `dashboard`, `transaction`, `api`, `tax`)

4. **Write description**:
   - First line: `{type}({scope}): {concise description}` (< 72 chars)
   - Body: Explain WHY the change was made, not just WHAT changed
   - For feature branches: Incorporate context from spec.md if available
   - For bug fixes: Reference the issue being fixed
   - Always end with: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

5. **Example analysis**:
   ```
   git diff shows:
   - Modified: src/components/forms/add-transaction.tsx (added liability_payment to schema)
   - Modified: src/components/tables/transaction-table.tsx (added liability_payment display)

   Type: fix (fixing TypeScript errors)
   Scope: transaction
   Description: add liability_payment to transaction form and table

   Final commit:
   fix(transaction): add liability_payment to transaction form and table

   Fixes TypeScript compilation errors introduced by recent liability service work.
   Adds liability_payment type to Zod schema and display configuration to ensure
   the transaction table can properly render liability payment transactions.

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ```

### PR Title Generation

Extract the PR title based on branch type:

1. **For feature branches** (001-name pattern):
   - **Primary method**: Read the spec.md file and extract the title from the first paragraph after "## Feature Summary"
     - Look for the first non-empty line after the `## Feature Summary` heading
     - This is usually a concise description of the feature
   - **Fallback**: If no spec.md or no Feature Summary found, use the first line of the commit message
   - Example: "Tax-Aware Portfolio Tracking (ESPP/RSU)" from spec.md

2. **For regular branches** (feature/*, fix/*, etc.):
   - Use the first line of the commit message (before the colon and description)
   - Transform to title case if needed
   - Example: "fix(transaction): add liability_payment..." becomes "Fix: Add liability_payment to transaction form"

3. **Validation**:
   - Ensure title is < 72 characters
   - Use present tense ("Add" not "Added")
   - Remove conventional commit prefix for cleaner PR title ("feat(tax): ..." → "Tax: ..." or just the description)

### Spec File Parsing

When reading spec.md for feature branches:

```bash
# Extract feature summary (first paragraph after ## Feature Summary)
SPEC_SUMMARY=$(awk '/^## Feature Summary/{flag=1; next} /^##/{flag=0} flag' "$SPEC_FILE" | head -5)

# Extract user scenarios if needed
USER_SCENARIOS=$(awk '/^## User Scenarios/{flag=1; next} /^##/{flag=0} flag' "$SPEC_FILE")
```

### Base Branch Detection

Automatically detect the base branch for the PR instead of assuming `main`:

1. Use the Bash tool: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`
   - This extracts the default branch from the remote (usually `main` or `master`)
2. If the command fails or returns empty:
   - Fallback: Use the Bash tool `git branch -r | grep -E 'origin/(main|master)' | head -1 | sed 's@origin/@@'`
   - This finds either `main` or `master` from remote branches
3. If still no match:
   - Default to `main`
4. When creating the PR with `gh pr create`, specify the base branch: `--base "{detected-base}"`

### Error Handling

- If `git push` fails: Check for remote tracking branch, suggest `git push --set-upstream origin $BRANCH`
- If `gh pr create` fails: Check if PR already exists with `gh pr list --head "{branch}"`, verify gh CLI authentication
- If validation fails: Present clear options to user (proceed or abort) using AskUserQuestion
- If no changes staged: Error with message "No changes to commit. Use `git status` to see repository state."
- If base branch detection fails: Report "⚠️ Could not detect base branch, defaulting to 'main'"

## Best Practices

1. **Always run validations first** - Catch issues before creating PR
2. **Read spec files carefully** - Extract meaningful context for PR descriptions
3. **Generate descriptive commit messages** - Future readers should understand changes
4. **Include constitution compliance** - Remind reviewers of project principles
5. **Link to related files** - Make it easy to navigate to spec/tasks
6. **Be transparent about failures** - If validations failed, note it in PR body

## Example Flow

**Feature Branch Example** (user on `012-tax-features-stock`):

1. ✅ Detected feature branch `012-tax-features-stock`
2. ✅ Found spec at `specs/012-tax-features-stock/spec.md`
3. ✅ Type check passed
4. ✅ Lint passed
5. ✅ Tests passed
6. 📝 Generated commit: `feat(tax): add ESPP/RSU tracking with capital gains analysis`
7. ⬆️  Pushed to `origin/012-tax-features-stock`
8. 🚀 Created draft PR: "Tax-Aware Portfolio Tracking (ESPP/RSU)"
   - Linked to spec.md and tasks.md
   - Included constitution checklist
   - Listed all changes from git diff
9. ✅ Draft PR URL: https://github.com/user/asset-portfolio/pull/123
   - Fast checks running (lint, types, unit tests)
   - Run `gh pr ready` when ready for E2E tests and review

**Regular Branch Example** (user on `fix/dashboard-scrollbar`):

1. ℹ️  Regular branch detected
2. ✅ Type check passed
3. ✅ Lint passed
4. ✅ Tests passed
5. 📝 Generated commit: `fix(ui): remove horizontal scrollbar from dashboard`
6. ⬆️  Pushed to `origin/fix/dashboard-scrollbar`
7. 🚀 Created draft PR: "Fix: Remove horizontal scrollbar from dashboard"
   - Standard test plan
   - No spec links (not a feature branch)
8. ✅ Draft PR URL: https://github.com/user/asset-portfolio/pull/124
   - Fast checks running (lint, types, unit tests)
   - Run `gh pr ready` when ready for E2E tests and review
