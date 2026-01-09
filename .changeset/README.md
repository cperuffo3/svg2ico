# Changesets

This folder is used by [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Adding a Changeset

After making changes, run:

```bash
pnpm changeset
```

This will prompt you to:

1. Select which packages have changed
2. Choose the version bump type (patch, minor, major)
3. Write a summary of your changes

## Releasing

To apply changesets and update versions:

```bash
pnpm changeset:version
```

This updates package versions and generates CHANGELOG entries.
