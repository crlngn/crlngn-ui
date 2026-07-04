/**
 * Merges localization keys from a secondary lang directory into a primary one.
 * Used by the merged-release workflow so the single shipped lang files contain the
 * union of keys needed by both the v13 and v14 builds. Keys already present in the
 * primary files always win; only missing keys are copied from the secondary files.
 *
 * Usage: node tools/merge-lang.mjs <primaryLangDir> <secondaryLangDir>
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Recursively adds entries from source that are missing in target
 * @param {Record<string, any>} target
 * @param {Record<string, any>} source
 * @returns {number} count of added keys
 */
function mergeMissing(target, source) {
  let added = 0;
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      target[key] = source[key];
      added++;
    } else if (
      typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) &&
      typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])
    ) {
      added += mergeMissing(target[key], source[key]);
    }
  }
  return added;
}

const [primaryDir, secondaryDir] = process.argv.slice(2);
if (!primaryDir || !secondaryDir) {
  console.error('Usage: node tools/merge-lang.mjs <primaryLangDir> <secondaryLangDir>');
  process.exit(1);
}

for (const file of readdirSync(secondaryDir).filter((f) => f.endsWith('.json'))) {
  const primaryPath = path.join(primaryDir, file);
  const secondaryPath = path.join(secondaryDir, file);
  const secondary = JSON.parse(readFileSync(secondaryPath, 'utf-8'));

  if (!existsSync(primaryPath)) {
    writeFileSync(primaryPath, JSON.stringify(secondary, null, 2) + '\n');
    console.log(`${file}: copied whole file from secondary`);
    continue;
  }

  const primary = JSON.parse(readFileSync(primaryPath, 'utf-8'));
  const added = mergeMissing(primary, secondary);
  writeFileSync(primaryPath, JSON.stringify(primary, null, 2) + '\n');
  console.log(`${file}: merged ${added} missing key(s)`);
}
