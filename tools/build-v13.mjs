/**
 * Builds the v13 half of the merged package from the v2 branch into .v13-build/.
 * The vite build copies that cache into dist/ after every rebuild (see the
 * restoreV13Build plugin in vite.config.mjs), so the merged dist stays complete
 * for local testing on Foundry v13 even though vite empties dist on each build.
 * Run once before testing on v13, and again whenever the v2 branch changes.
 *
 * Usage: node tools/build-v13.mjs [branch]  (default: v2)
 */
import { execSync } from 'child_process';
import { cpSync, rmSync, mkdirSync, existsSync, symlinkSync } from 'fs';
import path from 'path';

const branch = process.argv[2] || 'v2';
const root = process.cwd();
const worktree = path.join(root, '.v13-worktree');
const out = path.join(root, '.v13-build');

/**
 * Runs a shell command with inherited stdio
 * @param {string} cmd
 * @param {string} [cwd]
 */
function run(cmd, cwd = root) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

if (existsSync(worktree)) run(`git worktree remove --force "${worktree}"`);
run(`git worktree add "${worktree}" "${branch}"`);

try {
  symlinkSync(path.join(root, 'node_modules'), path.join(worktree, 'node_modules'));
  execSync('npx vite build', {
    cwd: worktree,
    stdio: 'inherit',
    env: { ...process.env, WATCH_MODE: 'true', CRLNGN_BUILD_TARGET: 'v13' }
  });

  rmSync(out, { recursive: true, force: true });
  mkdirSync(path.join(out, 'styles'), { recursive: true });
  cpSync(path.join(worktree, 'dist/scripts/v13'), path.join(out, 'scripts/v13'), { recursive: true });
  cpSync(path.join(worktree, 'dist/styles/crlngn-ui-v13.css'), path.join(out, 'styles/crlngn-ui-v13.css'));
  cpSync(path.join(worktree, 'dist/lang'), path.join(out, 'lang'), { recursive: true });
  console.log(`v13 build from branch "${branch}" cached in .v13-build/ — run a build (or save any src file in watch mode) to copy it into dist/`);
} finally {
  run(`git worktree remove --force "${worktree}"`);
}
