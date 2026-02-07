---
description: Create a pull request with project-specific validation and spec integration
---

## User Input

```text
$ARGUMENTS
```

## Execution Steps

### 1. Gather Git State

```bash
git branch --show-current
git status --short
git diff HEAD
```

### 2. Detect Branch Type

Check if branch matches speckit pattern `^([0-9]+)-(.+)$`:

| Pattern Match | Spec Dir Exists | Result |
|---------------|-----------------|--------|
| Yes | Yes (`specs/{num}-{name}/`) | Feature branch - set SPEC_FILE and TASKS_FILE paths |
| Yes | No | Regular branch - warn about missing spec dir |
| No | N/A | Regular branch |

### 3. Run Validations

Run in sequence, capturing exit codes:
1. `npm run type-check`
2. `npm run lint`
3. `npm run test:run`

**On failure**: Use AskUserQuestion with options "Yes, proceed anyway" / "No, abort"

### 4. Create Branch if on Main

If on `main`:
1. Analyze diff to generate descriptive branch name (`feature/{component}-{action}` or `fix/{component}-{issue}`)
2. `git checkout -b "{branch-name}"`

### 5. Stage and Commit

**Stage files**:
- Modified files: `git add -- "{file1}" "{file2}" ...`
- Untracked files: Use AskUserQuestion with multiSelect to let user choose

**Generate commit message**:
- Get style reference: `git log --format=%B -n 5`
- For feature branches: Read spec.md "## Feature Summary" section for context
- Format:
  ```
  {type}({scope}): {short description}

  {why the change was made}

  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  ```
- Commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Commit using heredoc**:
```bash
git commit -m "$(cat <<'EOF'
{message}
EOF
)"
```

### 6. Generate PR Description

**Feature branches** (`NNN-feature-name`):
```markdown
## Summary
[From spec.md Feature Summary or git diff analysis]

**Related Spec**: [specs/$NUM-$NAME/spec.md](specs/$NUM-$NAME/spec.md)
**Related Tasks**: [specs/$NUM-$NAME/tasks.md](specs/$NUM-$NAME/tasks.md)

### Changes
[Bullet points from git diff --stat]

## Test Plan
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manually tested in browser
- [ ] Verified against spec requirements

## Constitution Compliance
- [ ] **Privacy-First**: No data sent to server
- [ ] **Financial Precision**: Uses Decimal.js (no floating-point)
- [ ] **Type Safety**: Strict mode, no `any` types
- [ ] **No Over-Engineering**: Focused, minimal changes
- [ ] **Testing**: Unit tests for logic, E2E for workflows

## Notes
[Validation warnings, known issues, follow-up work]

---
Generated with [Claude Code](https://claude.com/claude-code)
```

**Regular branches**:
```markdown
## Summary
[From git diff and commit messages]

### Changes
[Bullet points from git diff]

## Test Plan
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Unit tests pass
- [ ] Manually tested in browser

## Notes
[Validation warnings, additional context]

---
Generated with [Claude Code](https://claude.com/claude-code)
```

### 7. Push and Create PR

**Detect base branch**:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
# Fallback: git branch -r | grep -E 'origin/(main|master)' | head -1 | sed 's@origin/@@'
# Default: main
```

**Push and create**:
```bash
git push -u origin "{branch-name}"
gh pr create --draft --base "{base}" --title "{title}" --body "$(cat <<'EOF'
{description}
EOF
)"
gh pr view --json url -q .url
```

**PR title extraction**:
- Feature branches: First line after "## Feature Summary" in spec.md, or commit message
- Regular branches: Commit message first line, transformed to title case
- Requirements: < 72 chars, present tense

**Final output**:
```
Draft PR created: {URL}

Next steps:
  - Fast checks (lint, types, unit tests) run automatically
  - When ready: gh pr ready (triggers E2E tests)
```

## Error Handling

| Error | Resolution |
|-------|------------|
| `git push` fails | Check remote tracking, suggest `git push --set-upstream origin $BRANCH` |
| `gh pr create` fails | Check if PR exists with `gh pr list --head "{branch}"`, verify gh auth |
| No changes staged | Error: "No changes to commit" |
| Base branch detection fails | Warn and default to 'main' |
