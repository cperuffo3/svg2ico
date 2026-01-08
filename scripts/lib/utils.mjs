/**
 * Utility functions for the init script
 */

/**
 * Convert a kebab-case string to PascalCase with spaces
 * @param {string} str - The input string (e.g., "my-awesome-project")
 * @returns {string} - PascalCase with spaces (e.g., "My Awesome Project")
 */
export function toTitleCase(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert a kebab-case string to PascalCase (no spaces)
 * @param {string} str - The input string (e.g., "my-awesome-project")
 * @returns {string} - PascalCase (e.g., "MyAwesomeProject")
 */
export function toPascalCase(str) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Validate a project name
 * @param {string} name - The project name to validate
 * @returns {boolean|string} - True if valid, error message if invalid
 */
export function validateProjectName(name) {
  if (!name || name.length === 0) {
    return 'Project name is required';
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return 'Use lowercase letters, numbers, and hyphens only (must start with a letter)';
  }
  if (name.length > 50) {
    return 'Project name must be 50 characters or less';
  }
  return true;
}

/**
 * Generate package names based on scope format
 * @param {string} projectName - The project name
 * @param {'scoped'|'dash'|'none'} scopeFormat - The scope format
 * @returns {{root: string, api: string, web: string, scope: string|null, filterApi: string, filterWeb: string}}
 */
export function generatePackageNames(projectName, scopeFormat) {
  switch (scopeFormat) {
    case 'scoped':
      return {
        root: projectName,
        api: `@${projectName}/api`,
        web: `@${projectName}/web`,
        scope: `@${projectName}`,
        filterApi: `@${projectName}/api`,
        filterWeb: `@${projectName}/web`,
      };
    case 'dash':
      return {
        root: projectName,
        api: `${projectName}-api`,
        web: `${projectName}-web`,
        scope: null,
        filterApi: `${projectName}-api`,
        filterWeb: `${projectName}-web`,
      };
    case 'none':
      return {
        root: projectName,
        api: 'api',
        web: 'web',
        scope: null,
        filterApi: 'api',
        filterWeb: 'web',
      };
    default:
      throw new Error(`Unknown scope format: ${scopeFormat}`);
  }
}
