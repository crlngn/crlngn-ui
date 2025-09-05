// vite.config.mjs
import copy from "file:///Users/carolx/RPG/FoundryDev/crlngn-ui/node_modules/rollup-plugin-copy/dist/index.commonjs.js";
import { defineConfig } from "file:///Users/carolx/RPG/FoundryDev/crlngn-ui/node_modules/vite/dist/node/index.js";
import path from "path";

// vite-plugin-version.js
import { readFileSync, writeFileSync } from "fs";
function vitePluginVersion() {
  return {
    name: "vite-plugin-version",
    configResolved(config) {
      const isWatchMode = process.env.WATCH_MODE === "true";
      if (isWatchMode) {
        console.log("Skipping version updates in watch mode...");
        return;
      }
      console.log("Updating version files for build...");
      const packageJson2 = JSON.parse(readFileSync("./package.json", "utf-8"));
      const version2 = packageJson2.version;
      const moduleJsonPath = "./src/module.json";
      if (moduleJsonPath) {
        const moduleJson = JSON.parse(readFileSync(moduleJsonPath, "utf-8"));
        moduleJson.version = version2;
        const versionTag = `v${version2}`;
        const baseUrl = "https://github.com/crlngn/crlngn-ui/releases";
        moduleJson.manifest = `${baseUrl}/latest/download/module.json`;
        moduleJson.download = `${baseUrl}/download/${versionTag}/module.zip`;
        writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, 2) + "\n");
        console.log(`Updated src/module.json to version ${version2} with specific version URLs`);
      }
      const readmePath = "./README.md";
      if (readmePath) {
        let readme = readFileSync(readmePath, "utf-8");
        readme = readme.replace(/(\*\*Latest Version:\*\* )\d+\.\d+\.\d+/g, `$1${version2}`);
        writeFileSync(readmePath, readme);
        console.log(`Updated README.md first line to version ${version2}`);
      }
    }
  };
}

// vite.config.mjs
import { readFileSync as readFileSync2 } from "fs";
var __vite_injected_original_dirname = "/Users/carolx/RPG/FoundryDev/crlngn-ui";
var packageJson = JSON.parse(readFileSync2("./package.json", "utf-8"));
var version = packageJson.version;
var vite_config_default = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  base: "/modules/crlngn-ui/",
  css: {
    devSourcemap: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: "src/module.mjs",
      output: {
        dir: "dist/",
        entryFileNames: "scripts/crlngn-ui.js",
        assetFileNames: (assetInfo) => {
          const isImgType = /\.(gif|jpe?g|png|svg)$/.test(assetInfo.name);
          const isStyleType = /\.css$/.test(assetInfo.name);
          if (isImgType) {
            return "assets/[name][extname]";
          }
          if (isStyleType) {
            return "styles/crlngn-ui.css";
          }
          if (assetInfo.originalFileNames?.includes("src/module.mjs")) {
            return "scripts/crlngn-ui.js";
          }
          return "assets/[name][extname]";
        },
        format: "es"
      }
    }
  },
  plugins: [
    vitePluginVersion(),
    copy({
      targets: [
        { src: "src/module.json", dest: "dist" },
        { src: "src/templates", dest: "dist" },
        { src: "src/lang", dest: "dist" }
      ],
      hook: "writeBundle"
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIiwgInZpdGUtcGx1Z2luLXZlcnNpb24uanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2Fyb2x4L1JQRy9Gb3VuZHJ5RGV2L2NybG5nbi11aVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2Nhcm9seC9SUEcvRm91bmRyeURldi9jcmxuZ24tdWkvdml0ZS5jb25maWcubWpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9jYXJvbHgvUlBHL0ZvdW5kcnlEZXYvY3JsbmduLXVpL3ZpdGUuY29uZmlnLm1qc1wiOy8vIEB0cy1ub2NoZWNrXG5pbXBvcnQgY29weSBmcm9tIFwicm9sbHVwLXBsdWdpbi1jb3B5XCI7XG4vLyBAdHMtbm9jaGVja1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgdml0ZVBsdWdpblZlcnNpb24gZnJvbSAnLi92aXRlLXBsdWdpbi12ZXJzaW9uLmpzJztcblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuY29uc3QgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYygnLi9wYWNrYWdlLmpzb24nLCAndXRmLTgnKSk7XG5jb25zdCB2ZXJzaW9uID0gcGFja2FnZUpzb24udmVyc2lvbjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgZGVmaW5lOiB7XG4gICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeSh2ZXJzaW9uKSxcbiAgfSxcbiAgYmFzZTogJy9tb2R1bGVzL2NybG5nbi11aS8nLFxuICBjc3M6IHtcbiAgICBkZXZTb3VyY2VtYXA6IHRydWUsXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIilcbiAgICB9XG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGlucHV0OiBcInNyYy9tb2R1bGUubWpzXCIsXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgZGlyOiBcImRpc3QvXCIsXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOlwic2NyaXB0cy9jcmxuZ24tdWkuanNcIixcbiAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICBjb25zdCBpc0ltZ1R5cGUgPSAvXFwuKGdpZnxqcGU/Z3xwbmd8c3ZnKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpO1xuICAgICAgICAgIGNvbnN0IGlzU3R5bGVUeXBlID0gL1xcLmNzcyQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpO1xuXG4gICAgICAgICAgaWYgKGlzSW1nVHlwZSl7XG4gICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9bbmFtZV1bZXh0bmFtZV0nO1xuICAgICAgICAgICAgLy8gcmV0dXJuICdbbmFtZV1bZXh0bmFtZV0nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaXNTdHlsZVR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3R5bGVzL2NybG5nbi11aS5jc3MnOyAgIFxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXNzZXRJbmZvLm9yaWdpbmFsRmlsZU5hbWVzPy5pbmNsdWRlcyhcInNyYy9tb2R1bGUubWpzXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJzY3JpcHRzL2NybG5nbi11aS5qc1wiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAnYXNzZXRzL1tuYW1lXVtleHRuYW1lXSc7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcm1hdDogXCJlc1wiLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuIHBsdWdpbnM6IFtcbiAgdml0ZVBsdWdpblZlcnNpb24oKSxcbiAgY29weSh7XG4gICAgdGFyZ2V0czogW1xuICAgICAgeyBzcmM6IFwic3JjL21vZHVsZS5qc29uXCIsIGRlc3Q6IFwiZGlzdFwiIH0sXG4gICAgICB7IHNyYzogXCJzcmMvdGVtcGxhdGVzXCIsIGRlc3Q6IFwiZGlzdFwiIH0sXG4gICAgICB7IHNyYzogXCJzcmMvbGFuZ1wiLCBkZXN0OiBcImRpc3RcIiB9XG4gICAgXSxcbiAgICBob29rOiBcIndyaXRlQnVuZGxlXCIsXG4gIH0pXG4gXSxcbn0pOyIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2Nhcm9seC9SUEcvRm91bmRyeURldi9jcmxuZ24tdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9jYXJvbHgvUlBHL0ZvdW5kcnlEZXYvY3JsbmduLXVpL3ZpdGUtcGx1Z2luLXZlcnNpb24uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2Nhcm9seC9SUEcvRm91bmRyeURldi9jcmxuZ24tdWkvdml0ZS1wbHVnaW4tdmVyc2lvbi5qc1wiO2ltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdml0ZVBsdWdpblZlcnNpb24oKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3ZpdGUtcGx1Z2luLXZlcnNpb24nLFxuICAgIGNvbmZpZ1Jlc29sdmVkKGNvbmZpZykge1xuICAgICAgLy8gRGV0ZWN0IGlmIHJ1bm5pbmcgaW4gd2F0Y2ggbW9kZVxuICAgICAgY29uc3QgaXNXYXRjaE1vZGUgPSBwcm9jZXNzLmVudi5XQVRDSF9NT0RFID09PSAndHJ1ZSc7XG5cbiAgICAgIGlmIChpc1dhdGNoTW9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlNraXBwaW5nIHZlcnNpb24gdXBkYXRlcyBpbiB3YXRjaCBtb2RlLi4uXCIpO1xuICAgICAgICByZXR1cm47IC8vIFN0b3AgZXhlY3V0aW9uIGlmIHdhdGNoaW5nIGZpbGVzXG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUubG9nKFwiVXBkYXRpbmcgdmVyc2lvbiBmaWxlcyBmb3IgYnVpbGQuLi5cIik7XG5cbiAgICAgIGNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoJy4vcGFja2FnZS5qc29uJywgJ3V0Zi04JykpO1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHBhY2thZ2VKc29uLnZlcnNpb247XG5cbiAgICAgIC8vIFVwZGF0ZSBtb2R1bGUuanNvblxuICAgICAgY29uc3QgbW9kdWxlSnNvblBhdGggPSAnLi9zcmMvbW9kdWxlLmpzb24nO1xuICAgICAgaWYgKG1vZHVsZUpzb25QYXRoKSB7XG4gICAgICAgIGNvbnN0IG1vZHVsZUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtb2R1bGVKc29uUGF0aCwgJ3V0Zi04JykpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHZlcnNpb25cbiAgICAgICAgbW9kdWxlSnNvbi52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBtYW5pZmVzdCBhbmQgZG93bmxvYWQgVVJMcyB0byBwb2ludCB0byB0aGUgc3BlY2lmaWMgdmVyc2lvblxuICAgICAgICBjb25zdCB2ZXJzaW9uVGFnID0gYHYke3ZlcnNpb259YDtcbiAgICAgICAgY29uc3QgYmFzZVVybCA9ICdodHRwczovL2dpdGh1Yi5jb20vY3JsbmduL2NybG5nbi11aS9yZWxlYXNlcyc7XG4gICAgICAgIFxuICAgICAgICBtb2R1bGVKc29uLm1hbmlmZXN0ID0gYCR7YmFzZVVybH0vbGF0ZXN0L2Rvd25sb2FkL21vZHVsZS5qc29uYDtcbiAgICAgICAgbW9kdWxlSnNvbi5kb3dubG9hZCA9IGAke2Jhc2VVcmx9L2Rvd25sb2FkLyR7dmVyc2lvblRhZ30vbW9kdWxlLnppcGA7XG4gICAgICAgIFxuICAgICAgICB3cml0ZUZpbGVTeW5jKG1vZHVsZUpzb25QYXRoLCBKU09OLnN0cmluZ2lmeShtb2R1bGVKc29uLCBudWxsLCAyKSArICdcXG4nKTtcbiAgICAgICAgY29uc29sZS5sb2coYFVwZGF0ZWQgc3JjL21vZHVsZS5qc29uIHRvIHZlcnNpb24gJHt2ZXJzaW9ufSB3aXRoIHNwZWNpZmljIHZlcnNpb24gVVJMc2ApO1xuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgUkVBRE1FLm1kIGZpcnN0IGxpbmVcbiAgICAgIGNvbnN0IHJlYWRtZVBhdGggPSAnLi9SRUFETUUubWQnO1xuICAgICAgaWYgKHJlYWRtZVBhdGgpIHtcbiAgICAgICAgbGV0IHJlYWRtZSA9IHJlYWRGaWxlU3luYyhyZWFkbWVQYXRoLCAndXRmLTgnKTtcbiAgICAgICAgcmVhZG1lID0gcmVhZG1lLnJlcGxhY2UoLyhcXCpcXCpMYXRlc3QgVmVyc2lvbjpcXCpcXCogKVxcZCtcXC5cXGQrXFwuXFxkKy9nLCBgJDEke3ZlcnNpb259YCk7XG4gICAgICAgIHdyaXRlRmlsZVN5bmMocmVhZG1lUGF0aCwgcmVhZG1lKTtcbiAgICAgICAgY29uc29sZS5sb2coYFVwZGF0ZWQgUkVBRE1FLm1kIGZpcnN0IGxpbmUgdG8gdmVyc2lvbiAke3ZlcnNpb259YCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufSJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxPQUFPLFVBQVU7QUFFakIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxVQUFVOzs7QUNKbVMsU0FBUyxjQUFjLHFCQUFxQjtBQUVqVixTQUFSLG9CQUFxQztBQUMxQyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixlQUFlLFFBQVE7QUFFckIsWUFBTSxjQUFjLFFBQVEsSUFBSSxlQUFlO0FBRS9DLFVBQUksYUFBYTtBQUNmLGdCQUFRLElBQUksMkNBQTJDO0FBQ3ZEO0FBQUEsTUFDRjtBQUVBLGNBQVEsSUFBSSxxQ0FBcUM7QUFFakQsWUFBTUEsZUFBYyxLQUFLLE1BQU0sYUFBYSxrQkFBa0IsT0FBTyxDQUFDO0FBQ3RFLFlBQU1DLFdBQVVELGFBQVk7QUFHNUIsWUFBTSxpQkFBaUI7QUFDdkIsVUFBSSxnQkFBZ0I7QUFDbEIsY0FBTSxhQUFhLEtBQUssTUFBTSxhQUFhLGdCQUFnQixPQUFPLENBQUM7QUFHbkUsbUJBQVcsVUFBVUM7QUFHckIsY0FBTSxhQUFhLElBQUlBLFFBQU87QUFDOUIsY0FBTSxVQUFVO0FBRWhCLG1CQUFXLFdBQVcsR0FBRyxPQUFPO0FBQ2hDLG1CQUFXLFdBQVcsR0FBRyxPQUFPLGFBQWEsVUFBVTtBQUV2RCxzQkFBYyxnQkFBZ0IsS0FBSyxVQUFVLFlBQVksTUFBTSxDQUFDLElBQUksSUFBSTtBQUN4RSxnQkFBUSxJQUFJLHNDQUFzQ0EsUUFBTyw2QkFBNkI7QUFBQSxNQUN4RjtBQUdBLFlBQU0sYUFBYTtBQUNuQixVQUFJLFlBQVk7QUFDZCxZQUFJLFNBQVMsYUFBYSxZQUFZLE9BQU87QUFDN0MsaUJBQVMsT0FBTyxRQUFRLDRDQUE0QyxLQUFLQSxRQUFPLEVBQUU7QUFDbEYsc0JBQWMsWUFBWSxNQUFNO0FBQ2hDLGdCQUFRLElBQUksMkNBQTJDQSxRQUFPLEVBQUU7QUFBQSxNQUNsRTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7OztBRHpDQSxTQUFTLGdCQUFBQyxxQkFBb0I7QUFQN0IsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTSxjQUFjLEtBQUssTUFBTUMsY0FBYSxrQkFBa0IsT0FBTyxDQUFDO0FBQ3RFLElBQU0sVUFBVSxZQUFZO0FBRTVCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFFBQVE7QUFBQSxJQUNOLGlCQUFpQixLQUFLLFVBQVUsT0FBTztBQUFBLEVBQ3pDO0FBQUEsRUFDQSxNQUFNO0FBQUEsRUFDTixLQUFLO0FBQUEsSUFDSCxjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLE9BQU87QUFBQSxNQUNQLFFBQVE7QUFBQSxRQUNOLEtBQUs7QUFBQSxRQUNMLGdCQUFlO0FBQUEsUUFDZixnQkFBZ0IsQ0FBQyxjQUFjO0FBQzdCLGdCQUFNLFlBQVkseUJBQXlCLEtBQUssVUFBVSxJQUFJO0FBQzlELGdCQUFNLGNBQWMsU0FBUyxLQUFLLFVBQVUsSUFBSTtBQUVoRCxjQUFJLFdBQVU7QUFDWixtQkFBTztBQUFBLFVBRVQ7QUFDQSxjQUFJLGFBQWE7QUFDZixtQkFBTztBQUFBLFVBQ1Q7QUFDQSxjQUFJLFVBQVUsbUJBQW1CLFNBQVMsZ0JBQWdCLEdBQUc7QUFDM0QsbUJBQU87QUFBQSxVQUNUO0FBRUEsaUJBQU87QUFBQSxRQUNUO0FBQUEsUUFDQSxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDRCxTQUFTO0FBQUEsSUFDUixrQkFBa0I7QUFBQSxJQUNsQixLQUFLO0FBQUEsTUFDSCxTQUFTO0FBQUEsUUFDUCxFQUFFLEtBQUssbUJBQW1CLE1BQU0sT0FBTztBQUFBLFFBQ3ZDLEVBQUUsS0FBSyxpQkFBaUIsTUFBTSxPQUFPO0FBQUEsUUFDckMsRUFBRSxLQUFLLFlBQVksTUFBTSxPQUFPO0FBQUEsTUFDbEM7QUFBQSxNQUNBLE1BQU07QUFBQSxJQUNSLENBQUM7QUFBQSxFQUNGO0FBQ0QsQ0FBQzsiLAogICJuYW1lcyI6IFsicGFja2FnZUpzb24iLCAidmVyc2lvbiIsICJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIl0KfQo=
