// @ts-nocheck
import copy from "rollup-plugin-copy";
// @ts-nocheck
import { defineConfig } from "vite";
import path from "path";
import vitePluginVersion from './vite-plugin-version.js';
import { execSync } from 'child_process';

import { readFileSync, existsSync, cpSync } from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

/**
 * Copies the locally cached v13 build (created by tools/build-v13.mjs) back into
 * dist after each build, since vite empties dist and would otherwise strip the
 * v13 files needed to test the merged package on Foundry v13. Also union-merges
 * the v13 lang keys. No-op when the cache is absent (CI assembles its own).
 */
function restoreV13Build() {
  return {
    name: 'restore-v13-build',
    closeBundle() {
      const cache = path.resolve(__dirname, '.v13-build');
      if (!existsSync(cache)) return;
      cpSync(path.join(cache, 'scripts/v13'), path.resolve(__dirname, 'dist/scripts/v13'), { recursive: true });
      cpSync(path.join(cache, 'styles/crlngn-ui-v13.css'), path.resolve(__dirname, 'dist/styles/crlngn-ui-v13.css'));
      execSync(`node tools/merge-lang.mjs dist/lang "${path.join(cache, 'lang')}"`, { cwd: __dirname, stdio: 'inherit' });
      console.log('Restored cached v13 build into dist/');
    }
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  base: '/modules/crlngn-ui/',
  css: {
    devSourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: "src/module.mjs",
      preserveEntrySignatures: "exports-only",
      output: {
        dir: "dist/",
        entryFileNames:"scripts/v14/crlngn-ui.js",
        assetFileNames: (assetInfo) => {
          const isImgType = /\.(gif|jpe?g|png|svg)$/.test(assetInfo.name);
          const isStyleType = /\.css$/.test(assetInfo.name);

          if (isImgType){
            return 'assets/[name][extname]';
            // return '[name][extname]';
          }
          if (isStyleType) {
            return 'styles/crlngn-ui-v14.css';
          }
          if (assetInfo.originalFileNames?.includes("src/module.mjs")) {
            return "scripts/v14/crlngn-ui.js";
          }

          return 'assets/[name][extname]';
        },
        format: "es",
      },
    },
  },
 plugins: [
  vitePluginVersion(),
  restoreV13Build(),
  copy({
    targets: [
      { src: "src/module.json", dest: "dist" },
      { src: "src/loader/crlngn-ui-loader.js", dest: "dist/scripts", rename: "crlngn-ui.js" },
      { src: "src/templates", dest: "dist" },
      { src: "src/lang", dest: "dist" },
      { src: "src/assets", dest: "dist" }
    ],
    hook: "writeBundle",
  })
 ],
});