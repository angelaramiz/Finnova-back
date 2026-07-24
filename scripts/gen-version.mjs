import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getGitCommitCount() {
  try { return execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim(); }
  catch { return '0'; }
}

function getGitShortHash() {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim(); }
  catch { return 'unknown'; }
}

function getGitBranch() {
  try { return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim(); }
  catch { return 'unknown'; }
}

function getGitLastCommitDate() {
  try { return execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim(); }
  catch { return new Date().toISOString(); }
}

const commitCount = getGitCommitCount();
const shortHash = getGitShortHash();
const branch = getGitBranch();
const commitDate = getGitLastCommitDate();
const version = `0.1.${commitCount}`;

// Generate backend version.ts
const tsContent = [
  '// Auto-generated - do not edit',
  `export const VERSION = '${version}';`,
  `export const BUILD_HASH = '${shortHash}';`,
  `export const BUILD_BRANCH = '${branch}';`,
  `export const BUILD_TIME = '${new Date().toISOString()}';`,
  `export const COMMIT_TIME = '${commitDate}';`,
  '',
].join('\n');

const backendPath = resolve(__dirname, '../src/version.ts');
writeFileSync(backendPath, tsContent, 'utf-8');
console.log(`Backend version: ${version} (${shortHash}, ${branch})`);
