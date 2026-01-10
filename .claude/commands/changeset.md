# Generate Changeset

Analyze all changes on the develop branch since the last PR to master and generate a changeset file for version management.

## Overview

This command examines all commits on `develop` since it diverged from `master`, plus any uncommitted working directory changes, and creates a properly formatted changeset file in `.changeset/` that describes the complete set of changes for the changelog.

---

## Phase 1: Analyze Changes

### 1.1 Identify the Branch Divergence Point

First, determine what has changed since develop diverged from master:

1. **Find merge base**: `git merge-base master HEAD` — this gives you the commit where develop diverged from master
2. **List commits on branch**: `git log --oneline master..HEAD` — shows all commits unique to develop
3. **Full diff from master**: `git diff master...HEAD --stat` — shows cumulative file changes since diverging

### 1.2 Get All Branch Changes

Run these commands to understand the complete scope of changes:

1. **All committed changes since master**: `git diff master...HEAD` — the actual code diff
2. **Commit messages for context**: `git log master..HEAD --format="%s%n%b"` — helps understand intent of changes
3. **Files changed since master**: `git diff master...HEAD --name-only`

### 1.3 Get Uncommitted Changes (if any)

Also check for any uncommitted work in the working directory:

1. **Unstaged changes**: `git diff`
2. **Staged changes**: `git diff --cached`
3. **Untracked files**: `git status --porcelain`
4. **Changed files summary**: `git diff --stat` and `git diff --cached --stat`

### 1.4 Combine for Full Picture

The changeset should reflect:

- All commits on develop since diverging from master
- Plus any uncommitted changes in the working directory
- This gives a complete picture of what will be released

### 1.5 Categorize Changes

Determine which packages are affected:

| Path Pattern      | Package                     |
| ----------------- | --------------------------- |
| `apps/api/**`     | `@svg2ico/api`              |
| `apps/web/**`     | `@svg2ico/web`              |
| `packages/**`     | Check specific package name |
| Root config files | `svg2ico` (root package)    |

### 1.6 Determine Change Type

Based on the nature of changes, determine the semver bump:

| Change Type                    | Bump    | Examples                                                                  |
| ------------------------------ | ------- | ------------------------------------------------------------------------- |
| **Breaking changes**           | `major` | API contract changes, removed endpoints, database schema breaking changes |
| **New features**               | `minor` | New endpoints, new UI features, new capabilities                          |
| **Bug fixes, refactors, docs** | `patch` | Bug fixes, performance improvements, refactoring, documentation           |

**Heuristics for detection:**

- New files in `controllers/`, `pages/`, new API routes → likely `minor`
- Changes to existing files only → likely `patch`
- Deleted public APIs, renamed endpoints, schema migrations with data loss → `major`
- New dependencies for new functionality → `minor`
- Dependency updates, dev tooling → `patch`

---

## Phase 2: Generate Changeset Content

### 2.1 Changeset Format

The changeset file must follow this exact format:

```markdown
---
'@svg2ico/api': patch
'@svg2ico/web': patch
---

Brief summary of changes (this becomes the changelog entry)
```

### 2.2 Writing Good Changeset Summaries

Use **categorized bullet points** to organize changes by area. Each bullet should start with a verb.

**Categories to use:**

| Category     | When to use                                      |
| ------------ | ------------------------------------------------ |
| **Backend**  | API changes, services, database, background jobs |
| **Frontend** | UI components, pages, hooks, styling             |
| **DevOps**   | CI/CD, tooling, build config, git hooks          |
| **Shared**   | Changes to shared packages or types              |

**Bullet point rules:**

- Start each bullet with a verb (Add, Fix, Update, Remove, Refactor, Improve)
- Be specific about what changed
- Keep bullets concise (one line each)
- Group related changes under the same category
- Omit categories with no changes

**DON'T:**

- Include implementation details
- List every file changed
- Use vague language like "various improvements"
- Include ticket/issue numbers (put in commit message instead)

**Examples:**

```markdown
---
'@svg2ico/api': minor
'@svg2ico/web': minor
---

**Backend:**

- Add SVG validation endpoint with size and format checks
- Add batch conversion support for multiple files

**Frontend:**

- Add drag-and-drop upload zone for SVG files
- Add conversion progress indicator
```

```markdown
---
'@svg2ico/api': patch
---

**Backend:**

- Fix memory leak during large file conversions
```

```markdown
---
'@svg2ico/web': patch
---

**Frontend:**

- Improve mobile responsiveness of conversion interface
- Fix button alignment in header on tablet devices
```

```markdown
---
'@svg2ico/api': minor
'@svg2ico/web': patch
---

**Backend:**

- Add admin statistics endpoint for conversion metrics
- Add rate limiting for API endpoints

**Frontend:**

- Improve mobile keyboard handling in dialogs

**DevOps:**

- Add pre-push hook requiring changeset files for code changes
```

---

## Phase 3: Create Changeset File

### 3.1 Generate Unique Filename

Changeset filenames should be random-ish but descriptive. Use format: `{adjective}-{noun}-{verb}.md`

Examples:

- `brave-lions-dance.md`
- `quick-foxes-jump.md`
- `calm-rivers-flow.md`

### 3.2 Write the File

Create the file at `.changeset/{filename}.md` with the generated content.

### 3.3 Show Summary

After creating the file, display:

1. The changeset file path
2. The full content of the changeset
3. Affected packages and bump types
4. Reminder to review and edit if needed

---

## Phase 4: Validation

### 4.1 Verify Changeset

Run `pnpm changeset:status` to verify the changeset was created correctly and shows the expected version bumps.

### 4.2 Generate Commit Message

After creating the changeset, generate a recommended **single-line** commit message following conventional commits format:

**Format:** `<type>(<scope>): <description>`

**Types:**

- `feat` — New features (minor bump)
- `fix` — Bug fixes (patch bump)
- `refactor` — Code refactoring (patch bump)
- `chore` — Maintenance, dependencies, tooling (patch bump)
- `docs` — Documentation changes

**Scopes:**

- `web` — Frontend changes
- `api` — Backend changes
- `shared` — Shared packages
- Omit scope for mixed changes

**Rules:**

- Keep under 72 characters
- Use imperative mood ("add" not "added")
- Be specific but concise
- Summarize the main change, not every detail

**Examples:**

```
feat(web): add guided journey onboarding flow
fix(api): prevent claim visibility leak to wishlist owners
feat: add budget tracking for events
chore: remove unused dependencies and upgrade pnpm
refactor(web): simplify gift card component structure
```

### 4.3 User Confirmation

Ask the user to:

1. Review the generated changeset
2. Edit if the summary needs adjustment
3. Use the recommended commit message (or modify as needed)

---

## Output Format

Present the results like this:

```
## Changeset Generated

**File:** `.changeset/brave-lions-dance.md`

**Affected Packages:**
- `@svg2ico/api`: patch
- `@svg2ico/web`: patch

**Summary:**
> Add changeset enforcement to pre-push hook. Developers must now create a changeset file before pushing changes to any branch.

**Recommended Commit Message:**
```

feat: add changeset enforcement to pre-push hook

```

**Next Steps:**
1. Review the changeset at `.changeset/brave-lions-dance.md`
2. Edit the summary if needed
3. Commit with: `git add . && git commit -m "feat: add changeset enforcement to pre-push hook"`
```

---

## Edge Cases

### On Master Branch

If currently on the `master` branch:

- Only analyze uncommitted/unstaged changes (no commits to compare)
- Warn the user that they should typically work on the develop branch
- If there are uncommitted changes, proceed with generating a changeset for those

### No Commits Since Master

If the branch has no commits ahead of master (i.e., `git log master..HEAD` returns nothing):

- Only analyze uncommitted/unstaged changes
- This is normal when starting work on a fresh branch

### No Code Changes

If there are no changes to `apps/` or `packages/` (neither in commits nor working directory):

- Inform the user no changeset is needed
- Changes to root config files, docs, or tooling typically don't need changesets

### Multiple Unrelated Changes

If changes span multiple unrelated features:

- Consider suggesting multiple changesets (one per feature)
- Or create a single changeset that summarizes all changes

### Existing Changesets on Branch

If there are already changeset files committed on the branch:

- List them to the user: `git diff master...HEAD --name-only | grep "^.changeset/"`
- Ask if the new changeset should cover additional changes or replace existing ones
- Multiple changesets per branch are valid — they get combined during version bump

### Existing Uncommitted Changeset

If there's already an uncommitted changeset file:

- Warn the user
- Ask if they want to add another or modify the existing one

---

## Word Lists for Filenames

**Adjectives:** brave, calm, clever, eager, fair, gentle, happy, jolly, kind, lively, merry, nice, proud, quick, rich, shy, tidy, warm, wise, young, bright, cool, fresh, gold, green, loud, pink, red, soft, sweet

**Nouns:** lions, tigers, bears, foxes, wolves, eagles, hawks, owls, dolphins, whales, rivers, mountains, forests, oceans, meadows, clouds, stars, moons, winds, waves, trees, flowers, stones, flames, storms

**Verbs:** dance, jump, swim, fly, run, walk, sing, play, grow, shine, flow, dream, rest, soar, bloom, glow, rise, spin, drift, leap
