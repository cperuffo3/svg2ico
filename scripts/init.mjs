#!/usr/bin/env node

/**
 * Project Initialization Script
 *
 * This script helps users "claim" the monorepo starter template for their own project.
 * It handles:
 * - Renaming packages across the monorepo
 * - Updating Docker and environment configurations
 * - Resetting the changelog and version numbers
 * - Optionally resetting git history
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  promptAlreadyInitialized,
  promptConfirmation,
  promptProjectName,
  promptResetGit,
  promptScopeFormat,
  promptVersion,
} from './lib/prompts.mjs';
import {
  resetChangesets,
  updateDockerCompose,
  updateDocumentation,
  updateEnvFiles,
  updatePackageJsonFiles,
  updateSourceCode,
} from './lib/replacer.mjs';
import { generatePackageNames, toTitleCase } from './lib/utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Check if the project has already been initialized
 * @returns {Promise<boolean>}
 */
async function isAlreadyInitialized() {
  try {
    const rootPkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf-8'));
    // If the name doesn't contain 'starter', it's been initialized
    return !rootPkg.name.includes('starter');
  } catch {
    return false;
  }
}

/**
 * Remove the init-project script entry from package.json
 * This prevents the script from being run again after initialization
 */
async function removeInitScript() {
  console.log('\nRemoving init-project script from package.json...');

  try {
    const pkgPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    delete pkg.scripts['init-project'];
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

    console.log('init-project script removed from package.json.');
  } catch (error) {
    console.error('Warning: Could not remove init-project script:', error.message);
  }
}

/**
 * Reset git history with a fresh initial commit
 * @param {string} projectName - The new project name
 */
async function resetGitHistory(projectName) {
  console.log('\nResetting git history...');

  try {
    // Remove .git directory
    await fs.rm(path.join(ROOT, '.git'), { recursive: true, force: true });

    // Initialize fresh repo
    execSync('git init', { cwd: ROOT, stdio: 'pipe' });

    // Add all files
    execSync('git add -A', { cwd: ROOT, stdio: 'pipe' });

    // Create initial commit
    const titleName = toTitleCase(projectName);
    execSync(`git commit -m "Initial commit: ${titleName}"`, {
      cwd: ROOT,
      stdio: 'pipe',
    });

    console.log('Git history reset with fresh initial commit.');
  } catch (error) {
    console.error('Warning: Could not reset git history:', error.message);
    console.log('You may need to manually initialize git.');
  }
}

/**
 * Main initialization function
 */
async function main() {
  console.log('\n========================================');
  console.log('  Monorepo Starter - Project Setup');
  console.log('========================================\n');

  // Check if already initialized
  if (await isAlreadyInitialized()) {
    const proceed = await promptAlreadyInitialized();
    if (!proceed) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  // Gather user inputs
  const projectName = await promptProjectName();
  const scopeFormat = await promptScopeFormat();
  const version = await promptVersion();
  const resetGit = await promptResetGit();

  // Generate package names
  const names = generatePackageNames(projectName, scopeFormat);
  const titleName = toTitleCase(projectName);

  // Display summary
  console.log('\n----------------------------------------');
  console.log('  Configuration Summary');
  console.log('----------------------------------------');
  console.log(`  Project name:    ${titleName}`);
  console.log(`  Root package:    ${names.root}`);
  console.log(`  API package:     ${names.api}`);
  console.log(`  Web package:     ${names.web}`);
  console.log(`  Version:         ${version}`);
  console.log(`  Reset git:       ${resetGit ? 'Yes' : 'No'}`);
  console.log('----------------------------------------\n');

  // Confirm
  const confirmed = await promptConfirmation();
  if (!confirmed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  console.log('\nInitializing project...\n');

  // Perform updates
  try {
    console.log('Updating package.json files...');
    await updatePackageJsonFiles(ROOT, names, version);

    console.log('Updating Docker configuration...');
    await updateDockerCompose(ROOT, projectName);

    console.log('Updating environment files...');
    const { copied: copiedEnvFiles, skipped: skippedEnvFiles } = await updateEnvFiles(
      ROOT,
      projectName,
    );
    if (copiedEnvFiles.length > 0) {
      console.log(`  Created: ${copiedEnvFiles.join(', ')}`);
    }
    if (skippedEnvFiles.length > 0) {
      console.log(`  Skipped (already exist): ${skippedEnvFiles.join(', ')}`);
      console.log('  Warning: You may need to manually update these files with new credentials.');
    }

    console.log('Updating source code...');
    await updateSourceCode(ROOT, projectName);

    console.log('Updating documentation...');
    await updateDocumentation(ROOT, projectName, names);

    console.log('Resetting changesets...');
    await resetChangesets(ROOT);

    if (resetGit) {
      await resetGitHistory(projectName);
    }

    // Remove the init-project script from package.json
    await removeInitScript();

    console.log('\n========================================');
    console.log('  Project initialized successfully!');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('  1. Review the changes');
    console.log('  2. Run: pnpm install');
    console.log('  3. Run: pnpm dev:full');
    console.log('  4. Delete the /scripts directory');
    console.log('');
    console.log('Note: Docker containers are named with underscores');
    console.log(`(${projectName.replace(/-/g, '_')}) for database credentials.\n`);
  } catch (error) {
    console.error('\nError during initialization:', error.message);
    console.error('Some files may have been partially updated.');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
