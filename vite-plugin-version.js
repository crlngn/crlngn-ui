import { readFileSync, writeFileSync } from 'fs';

export default function vitePluginVersion() {
  return {
    name: 'vite-plugin-version',
    configResolved(config) {
      // Detect if running in watch mode
      const isWatchMode = process.env.WATCH_MODE === 'true';

      if (isWatchMode) {
        console.log("Skipping version updates in watch mode...");
        return; // Stop execution if watching files
      }

      console.log("Updating version files for build...");

      const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
      const version = packageJson.version;

      // Update module.json
      const moduleJsonPath = './src/module.json';
      if (moduleJsonPath) {
        const moduleJson = JSON.parse(readFileSync(moduleJsonPath, 'utf-8'));
        
        // Update version
        moduleJson.version = version;
        
        // Update manifest and download URLs to point to the specific version
        const versionTag = `v${version}`;
        const baseUrl = 'https://github.com/crlngn/crlngn-ui/releases';
        
        moduleJson.manifest = `${baseUrl}/latest/download/module.json`;
        moduleJson.download = `${baseUrl}/download/${versionTag}/module.zip`;
        
        writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, 2) + '\n');
        console.log(`Updated src/module.json to version ${version} with specific version URLs`);
      }

      // Update README.md first line
      const readmePath = './README.md';
      if (readmePath) {
        let readme = readFileSync(readmePath, 'utf-8');
        readme = readme.replace(/(\*\*Latest Version:\*\* )\d+\.\d+\.\d+/g, `$1${version}`);
        writeFileSync(readmePath, readme);
        console.log(`Updated README.md first line to version ${version}`);
      }
    }
  };
}