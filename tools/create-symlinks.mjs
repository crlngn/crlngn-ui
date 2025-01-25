import * as fs from "fs";
import yaml from "js-yaml";
import path from "path";

console.log("Reforging Foundry Symlinks");

if (fs.existsSync("foundry-config.yaml")) {
  let fileRoot = "";
  let dnd5ePath = "";
  try {
    const fc = await fs.promises.readFile("foundry-config.yaml", "utf-8");

    const foundryConfig = yaml.load(fc);
    dnd5ePath = foundryConfig.dnd5ePath;
    fileRoot = path.join(foundryConfig.foundryPath, "resources", "app");
  } catch (err) {
    console.error(`Error reading foundry-config.yaml: ${err}`);
  }

  try {
    await fs.promises.mkdir("foundry");
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }

  // Javascript files
  for (const p of ["client", "client-esm", "common"]) {
    try {
      await fs.promises.symlink(path.join(fileRoot, p), path.join("foundry", p));
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
  }
  try {
    const targetDir = "dnd5e";
    await fs.promises.mkdir(targetDir, { recursive: true });
    // Read the contents of the source directory
    const entries = await fs.promises.readdir(dnd5ePath);

    // Create symlinks for each entry
    for (const entry of entries) {
      const sourcePath = path.join(dnd5ePath, entry);
      const targetPath = path.join(targetDir, entry);

      await fs.promises.symlink(sourcePath, targetPath);
    }
    // await fs.promises.symlink(dnd5ePath, 'dnd5e-4.x');
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }

  // Language files
  try {
    await fs.promises.symlink(path.join(fileRoot, "public", "lang"), path.join("foundry", "lang"));
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
} else {
  console.log("Foundry config file did not exist.");
}
