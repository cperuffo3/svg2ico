import fs from 'fs/promises';
import path from 'path';
import { toTitleCase } from './utils.mjs';

/**
 * Files that need to be updated during initialization
 */
export const FILES_TO_UPDATE = {
  packageJson: ['package.json', 'apps/api/package.json', 'apps/web/package.json'],
  docker: ['docker/docker-compose.yml'],
  env: ['.env.example'],
  code: [
    'apps/api/src/main.ts',
    'apps/web/src/features/dashboard/pages/DashboardPage.tsx',
  ],
  docs: ['README.md', 'CLAUDE.md'],
  changeset: ['.changeset/config.json'],
};

/**
 * Replace content in a file
 * @param {string} filePath - Absolute path to the file
 * @param {Array<{from: string|RegExp, to: string}>} replacements - Replacements to make
 */
async function replaceInFile(filePath, replacements) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    for (const { from, to } of replacements) {
      if (typeof from === 'string') {
        content = content.split(from).join(to);
      } else {
        content = content.replace(from, to);
      }
    }
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, skip silently
      return false;
    }
    throw error;
  }
}

/**
 * Update all package.json files
 * @param {string} rootDir - Root directory of the project
 * @param {{root: string, api: string, web: string, filterApi: string, filterWeb: string}} names - Package names
 * @param {string} version - New version number
 */
export async function updatePackageJsonFiles(rootDir, names, version) {
  // Root package.json
  await replaceInFile(path.join(rootDir, 'package.json'), [
    { from: '"monorepo-starter"', to: `"${names.root}"` },
    { from: `"version": "0.1.0"`, to: `"version": "${version}"` },
    { from: '@starter/api', to: names.filterApi },
    { from: '@starter/web', to: names.filterWeb },
  ]);

  // API package.json
  await replaceInFile(path.join(rootDir, 'apps/api/package.json'), [
    { from: '"@starter/api"', to: `"${names.api}"` },
    { from: `"version": "0.1.0"`, to: `"version": "${version}"` },
  ]);

  // Web package.json
  await replaceInFile(path.join(rootDir, 'apps/web/package.json'), [
    { from: '"@starter/web"', to: `"${names.web}"` },
    { from: `"version": "0.1.0"`, to: `"version": "${version}"` },
  ]);
}

/**
 * Update docker-compose.yml
 * @param {string} rootDir - Root directory of the project
 * @param {string} projectName - New project name
 */
export async function updateDockerCompose(rootDir, projectName) {
  await replaceInFile(path.join(rootDir, 'docker/docker-compose.yml'), [
    { from: 'monorepo-starter-cluster', to: `${projectName}-cluster` },
    { from: 'starter-postgres', to: `${projectName}-postgres` },
    { from: 'POSTGRES_USER: starter', to: `POSTGRES_USER: ${projectName.replace(/-/g, '_')}` },
    {
      from: 'POSTGRES_PASSWORD: starter_dev_password',
      to: `POSTGRES_PASSWORD: ${projectName.replace(/-/g, '_')}_dev_password`,
    },
    { from: 'POSTGRES_DB: starter', to: `POSTGRES_DB: ${projectName.replace(/-/g, '_')}` },
    { from: 'pg_isready -U starter', to: `pg_isready -U ${projectName.replace(/-/g, '_')}` },
  ]);
}

/**
 * Copy a file if it doesn't already exist
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @returns {Promise<boolean>} - True if copied, false if skipped or failed
 */
async function copyIfNotExists(src, dest) {
  try {
    // Check if destination already exists
    await fs.access(dest);
    return false; // File exists, skip
  } catch {
    // File doesn't exist, try to copy
    try {
      await fs.copyFile(src, dest);
      return true;
    } catch {
      return false; // Source doesn't exist
    }
  }
}

/**
 * Update environment example files and copy to .env
 * @param {string} rootDir - Root directory of the project
 * @param {string} projectName - New project name
 */
export async function updateEnvFiles(rootDir, projectName) {
  const dbUser = projectName.replace(/-/g, '_');
  const dbPassword = `${dbUser}_dev_password`;
  const dbName = dbUser;

  // Update root .env.example
  await replaceInFile(path.join(rootDir, '.env.example'), [
    { from: 'MONOREPO STARTER', to: projectName.toUpperCase().replace(/-/g, ' ') },
    {
      from: 'postgresql://starter:starter_dev_password@localhost:5432/starter',
      to: `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`,
    },
  ]);

  // Update apps/api/.env.example
  await replaceInFile(path.join(rootDir, 'apps/api/.env.example'), [
    {
      from: 'postgresql://starter:starter_dev_password@localhost:5432/starter',
      to: `postgresql://${dbUser}:${dbPassword}@localhost:5432/${dbName}`,
    },
  ]);

  // Copy .env.example files to .env (if .env doesn't exist)
  const envFiles = [
    { example: '.env.example', env: '.env' },
    { example: 'apps/api/.env.example', env: 'apps/api/.env' },
  ];

  const copied = [];
  const skipped = [];
  for (const { example, env } of envFiles) {
    const wasCopied = await copyIfNotExists(
      path.join(rootDir, example),
      path.join(rootDir, env)
    );
    if (wasCopied) {
      copied.push(env);
    } else {
      // Check if the file exists (was skipped) vs source doesn't exist
      try {
        await fs.access(path.join(rootDir, env));
        skipped.push(env);
      } catch {
        // Source doesn't exist, ignore
      }
    }
  }

  return { copied, skipped };
}

/**
 * Update source code files
 * @param {string} rootDir - Root directory of the project
 * @param {string} projectName - New project name
 */
export async function updateSourceCode(rootDir, projectName) {
  const titleName = toTitleCase(projectName);

  // Update API main.ts (Swagger title)
  await replaceInFile(path.join(rootDir, 'apps/api/src/main.ts'), [
    { from: `'Monorepo Starter API'`, to: `'${titleName} API'` },
  ]);

  // Update Dashboard page
  await replaceInFile(
    path.join(rootDir, 'apps/web/src/features/dashboard/pages/DashboardPage.tsx'),
    [{ from: 'Monorepo Starter', to: titleName }]
  );
}

/**
 * Update documentation files
 * @param {string} rootDir - Root directory of the project
 * @param {string} projectName - New project name
 * @param {{filterApi: string, filterWeb: string}} names - Package names for filter references
 */
export async function updateDocumentation(rootDir, projectName, names) {
  const titleName = toTitleCase(projectName);

  // Update README.md
  await replaceInFile(path.join(rootDir, 'README.md'), [
    { from: '# Monorepo Starter', to: `# ${titleName}` },
    { from: 'monorepo-starter', to: projectName },
    { from: 'Monorepo Starter', to: titleName },
  ]);

  // Update CLAUDE.md
  await replaceInFile(path.join(rootDir, 'CLAUDE.md'), [
    { from: '@starter/api', to: names.filterApi },
    { from: '@starter/web', to: names.filterWeb },
    { from: 'monorepo-starter', to: projectName },
    { from: 'Monorepo Starter', to: titleName },
  ]);
}

/**
 * Reset changesets for user's project
 * @param {string} rootDir - Root directory of the project
 */
export async function resetChangesets(rootDir) {
  const changesetDir = path.join(rootDir, '.changeset');

  // Remove all changeset markdown files (but keep config and README)
  try {
    const files = await fs.readdir(changesetDir);
    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        await fs.unlink(path.join(changesetDir, file));
      }
    }
  } catch {
    // Directory might not exist or be empty
  }

  // Reset CHANGELOG.md
  const changelogContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Initial project setup.
`;

  await fs.writeFile(path.join(rootDir, 'CHANGELOG.md'), changelogContent, 'utf-8');

  // Update .changeset/README.md for user's project
  const changesetReadme = `# Changesets

This folder is used by [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## Adding a Changeset

After making changes, run:

\`\`\`bash
pnpm changeset
\`\`\`

This will prompt you to:
1. Select which packages have changed
2. Choose the version bump type (patch, minor, major)
3. Write a summary of your changes

## Releasing

To apply changesets and update versions:

\`\`\`bash
pnpm changeset:version
\`\`\`

This updates package versions and generates CHANGELOG entries.
`;

  await fs.writeFile(path.join(changesetDir, 'README.md'), changesetReadme, 'utf-8');
}
