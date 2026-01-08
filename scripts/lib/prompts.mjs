import { confirm, input, select } from '@inquirer/prompts';
import { validateProjectName } from './utils.mjs';

/**
 * Scope format options for package naming
 */
const SCOPE_FORMAT_CHOICES = [
  {
    name: '@myproject/api, @myproject/web (npm scoped packages)',
    value: 'scoped',
    description: 'Standard npm scope format, recommended for most projects',
  },
  {
    name: 'myproject-api, myproject-web (dash-prefixed)',
    value: 'dash',
    description: 'Simple prefixed names without npm scope',
  },
  {
    name: 'api, web (standalone names)',
    value: 'none',
    description: 'Simple names without project prefix',
  },
];

/**
 * Version options for initial project version
 */
const VERSION_CHOICES = [
  {
    name: '0.1.0 (pre-release)',
    value: '0.1.0',
    description: 'Start at 0.1.0 for projects still in development',
  },
  {
    name: '1.0.0 (stable)',
    value: '1.0.0',
    description: 'Start at 1.0.0 for production-ready projects',
  },
];

/**
 * Prompt for project name
 * @returns {Promise<string>}
 */
export async function promptProjectName() {
  return input({
    message: 'Project name (lowercase, hyphens allowed):',
    validate: validateProjectName,
  });
}

/**
 * Prompt for scope format
 * @returns {Promise<'scoped'|'dash'|'none'>}
 */
export async function promptScopeFormat() {
  return select({
    message: 'Package naming convention:',
    choices: SCOPE_FORMAT_CHOICES,
  });
}

/**
 * Prompt for initial version
 * @returns {Promise<string>}
 */
export async function promptVersion() {
  return select({
    message: 'Initial version:',
    choices: VERSION_CHOICES,
  });
}

/**
 * Prompt for git history reset
 * @returns {Promise<boolean>}
 */
export async function promptResetGit() {
  return confirm({
    message: 'Reset git history? (Creates fresh initial commit)',
    default: true,
  });
}

/**
 * Prompt for confirmation to proceed
 * @returns {Promise<boolean>}
 */
export async function promptConfirmation() {
  return confirm({
    message: 'Proceed with initialization?',
    default: true,
  });
}

/**
 * Prompt for already initialized warning
 * @returns {Promise<boolean>}
 */
export async function promptAlreadyInitialized() {
  return confirm({
    message: 'This project appears to be already initialized. Continue anyway?',
    default: false,
  });
}
