// @ts-nocheck
import copy from "rollup-plugin-copy";
// @ts-nocheck
import { defineConfig } from "vite";
import path from "path";
import vitePluginVersion from './vite-plugin-version.js';

import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

// When CRLNGN_BUILD_TARGET=v13, output goes to generation-specific paths so this
// build can be shipped inside the merged multi-generation package alongside a v14
// build. Default output paths are unchanged for standalone v2 releases.
const isMergedTarget = process.env.CRLNGN_BUILD_TARGET === 'v13';
const jsOutput = isMergedTarget ? "scripts/v13/crlngn-ui.js" : "scripts/crlngn-ui.js";
const cssOutput = isMergedTarget ? "styles/crlngn-ui-v13.css" : "styles/crlngn-ui.css";

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
        entryFileNames: jsOutput,
        assetFileNames: (assetInfo) => {
          const isImgType = /\.(gif|jpe?g|png|svg)$/.test(assetInfo.name);
          const isStyleType = /\.css$/.test(assetInfo.name);

          if (isImgType){
            return 'assets/[name][extname]';
            // return '[name][extname]';
          }
          if (isStyleType) {
            return cssOutput;
          }
          if (assetInfo.originalFileNames?.includes("src/module.mjs")) {
            return jsOutput;
          }

          return 'assets/[name][extname]';
        },
        format: "es",
      },
    },
  },
 plugins: [
  vitePluginVersion(),
  copy({
    targets: [
      { src: "src/module.json", dest: "dist" },
      { src: "src/templates", dest: "dist" },
      { src: "src/lang", dest: "dist" },
      { src: "src/assets", dest: "dist" }
    ],
    hook: "writeBundle",
  })
 ],
});