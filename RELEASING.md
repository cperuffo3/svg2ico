# Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for version management with automated releases via GitHub Actions.

## Workflow

All work happens on feature branches off `master`. When a branch is ready, open a PR to `master`. After merge, the release workflow runs automatically.

```
master ─────●─────────●──── (releases happen automatically here)
             \       /
              feat/x ●──●  (work + changeset happen here)
```

### 1. Create a branch

```bash
git checkout master
git pull
git checkout -b feat/svg-optimization    # or fix/, refactor/, chore/, etc.
```

Name branches with a conventional prefix so the intent is clear:

| Branch prefix | Purpose                       |
| :------------ | :---------------------------- |
| `feat/`       | New feature                   |
| `fix/`        | Bug fix                       |
| `refactor/`   | Code restructuring            |
| `chore/`      | Dependencies, config, cleanup |

### 2. Make your changes and create a changeset

After making your code changes, create a changeset that describes what changed:

```bash
pnpm changeset
```

The interactive prompt will ask you to:

1. **Select packages** - choose which packages are affected (`@svg2ico/api`, `@svg2ico/web`, or both)
2. **Choose bump type** - `patch`, `minor`, or `major`
3. **Write a summary** - a description of the change (this goes into the changelog)

| Bump type | When to use                             | Example                                  |
| :-------- | :-------------------------------------- | :--------------------------------------- |
| `patch`   | Bug fixes, minor tweaks                 | Fix SVG parsing for malformed viewBox    |
| `minor`   | New features, non-breaking enhancements | Add batch conversion support             |
| `major`   | Breaking changes                        | Redesign conversion API response payload |

This creates a markdown file in `.changeset/` - **commit it with your code**.

> **Note:** `@svg2ico/api` and `@svg2ico/web` are configured as a fixed group, so they always release together at the same version.

### 3. Open a PR to master

```bash
git push -u origin feat/svg-optimization
# Then open a PR on GitHub
```

- The **PR Changeset** workflow will automatically validate that a changeset exists
- If a changeset is found, the workflow updates your PR title and body with a summary (bump type, affected packages, and description)
- PRs without a changeset will fail the check

### 4. Merge and release

After merging to `master`, the **Release** workflow runs automatically and will:

1. Detect changeset files in `.changeset/`
2. Run `pnpm changeset version` to bump versions and update changelogs
3. Commit the version bump (`chore: version packages [skip ci]`)
4. Create a GitHub Release with tag `v{VERSION}` and auto-generated notes

No manual release steps are needed.

## Commands

```bash
# Create a changeset (interactive)
pnpm changeset

# Apply changesets locally (usually done by CI)
pnpm changeset:version
```

## Example: Full Cycle

```bash
# Start work
git checkout -b feat/batch-convert
# ... make changes ...
git add .
git commit -m "feat: add batch SVG conversion"

# Create changeset
pnpm changeset
# -> select @svg2ico/api and @svg2ico/web
# -> choose "minor"
# -> write "Add batch SVG to ICO conversion support"
git add .changeset/
git commit -m "chore: add changeset"

# Push and open PR
git push -u origin feat/batch-convert
# Open PR -> CI validates changeset and updates PR metadata

# After review, merge to master
# -> Release workflow bumps to next minor, creates GitHub Release
```

## CI Workflows

| Workflow           | Trigger               | Purpose                                           |
| :----------------- | :-------------------- | :------------------------------------------------ |
| **PR Changeset**   | PR to `master`        | Validates changeset exists, updates PR title/body |
| **Release**        | Push to `master`      | Versions packages, creates GitHub Release         |

## Configuration

Changesets is configured in `.changeset/config.json`:

- **Base branch**: `master`
- **Fixed packages**: `@svg2ico/api` and `@svg2ico/web` (always same version)
- **Access**: `restricted` (private packages)
- **Auto-commit**: Disabled (CI handles commits)
- **GitHub Release**: Created automatically with `gh release create`

## Setup Requirements

The release workflow requires a `RELEASE_TOKEN` secret in GitHub with `contents: write` permission. This is a personal access token (PAT) that allows the workflow to push version commits and create releases.
