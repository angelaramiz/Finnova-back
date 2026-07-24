import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getGitCommitCount() {
  try {
    return execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return '0';
  }
}

function getGitShortHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

const commitCount = getGitCommitCount();
const shortHash = getGitShortHash();
const version = `0.1.${commitCount}`;

const content = [
  '// Auto-generated at build time',
  `export const VERSION = '${version}';`,
  `export const BUILD_HASH = '${shortHash}';`,
  `export const BUILD_TIME = '${new Date().toISOString()}';`,
  '',
].join('\n');

const outputPath = resolve(__dirname, '../src/version.ts');
writeFileSync(outputPath, content, 'utf-8');
console.log(`Version generated: ${version} (${shortHash})`);
