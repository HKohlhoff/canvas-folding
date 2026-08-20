import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("manifest.json not found. Run this script from the plugin project root.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const vaultDir = path.resolve(process.argv[2] || "TestVault");
const pluginDir = path.join(vaultDir, ".obsidian", "plugins", manifest.id);
const releaseDir = path.join(root, "release");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(fileName) {
  const src = path.join(releaseDir, fileName);
  const dst = path.join(pluginDir, fileName);

  if (!fs.existsSync(src)) {
    console.warn(`[skip] release/${fileName} does not exist`);
    return;
  }

  fs.copyFileSync(src, dst);
  console.log(`[copy] ${src} -> ${dst}`);
}

ensureDir(pluginDir);
ensureDir(path.join(vaultDir, ".obsidian"));

fs.writeFileSync(path.join(vaultDir, ".obsidian", "community-plugins.json"), JSON.stringify([manifest.id], null, 2), "utf8");
fs.writeFileSync(path.join(vaultDir, ".obsidian", "app.json"), `${JSON.stringify({ legacyEditor: false }, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(pluginDir, ".hotreload"), "", "utf8");

copyIfExists("main.js");
copyIfExists("manifest.json");
copyIfExists("styles.css");

console.log(`\nTest vault ready: ${vaultDir}`);
console.log("Open this folder as an Obsidian vault and enable the plugin if needed.");
