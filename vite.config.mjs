// @ts-nocheck
import copy from "rollup-plugin-copy";
// @ts-nocheck
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
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
      output: {
        dir: "dist/",
        entryFileNames:"scripts/module.js",
        assetFileNames: (assetInfo) => {
          const isImgType = /\.(gif|jpe?g|png|svg)$/.test(assetInfo.name);
          const isStyleType = /\.css$/.test(assetInfo.name);

          if (isImgType){
            return 'assets/[name][extname]';
            // return '[name][extname]';
          }
          if (isStyleType) {
            return 'styles/[name][extname]';   
          }
          if (assetInfo.originalFileNames?.includes("src/module.mjs")) {
            return "scripts/module.js";
          }

          return 'assets/[name][extname]';
        },
        format: "es",
      },
    },
  },
 plugins: [
  copy({
    targets: [
      { src: "src/module.json", dest: "dist" },
      { src: "src/templates", dest: "dist" }
    ],
    hook: "writeBundle",
  })
 ],
});