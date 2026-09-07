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
const obsidianDir = path.join(vaultDir, ".obsidian");
const communityPluginsPath = path.join(obsidianDir, "community-plugins.json");
const appConfigPath = path.join(obsidianDir, "app.json");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRequired(fileName) {
  const src = path.join(releaseDir, fileName);
  const dst = path.join(pluginDir, fileName);

  fs.copyFileSync(src, dst);
  console.log(`[copy] ${src} -> ${dst}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const requiredArtifacts = [
  "main.js",
  "manifest.json",
  ...(fs.existsSync(path.join(root, "styles.css")) ? ["styles.css"] : []),
];
const missingArtifacts = requiredArtifacts.filter(
  (fileName) => !fs.existsSync(path.join(releaseDir, fileName)),
);
if (missingArtifacts.length > 0) {
  console.error(
    `Missing required release artifacts: ${missingArtifacts.join(", ")}. Run npm run build:prod first.`,
  );
  process.exit(1);
}
const emptyArtifacts = requiredArtifacts.filter(
  (fileName) => fs.statSync(path.join(releaseDir, fileName)).size === 0,
);
if (emptyArtifacts.length > 0) {
  console.error(`Empty required release artifacts: ${emptyArtifacts.join(", ")}.`);
  process.exit(1);
}
if (
  fs.readFileSync(path.join(releaseDir, "manifest.json"), "utf8") !==
  fs.readFileSync(manifestPath, "utf8")
) {
  console.error("release/manifest.json does not match manifest.json. Run npm run build:prod first.");
  process.exit(1);
}
if (
  requiredArtifacts.includes("styles.css") &&
  fs.readFileSync(path.join(releaseDir, "styles.css"), "utf8") !==
    fs.readFileSync(path.join(root, "styles.css"), "utf8")
) {
  console.error("release/styles.css does not match styles.css. Run npm run build:prod first.");
  process.exit(1);
}

let enabledPlugins = [];
if (fs.existsSync(communityPluginsPath)) {
  const existing = readJson(communityPluginsPath);
  if (!Array.isArray(existing) || !existing.every((id) => typeof id === "string")) {
    throw new Error(`${communityPluginsPath} must contain a JSON array of plugin IDs`);
  }
  enabledPlugins = existing;
}
if (fs.existsSync(appConfigPath)) {
  const appConfig = readJson(appConfigPath);
  if (typeof appConfig !== "object" || appConfig === null || Array.isArray(appConfig)) {
    throw new Error(`${appConfigPath} must contain a JSON object`);
  }
}

ensureDir(pluginDir);
ensureDir(obsidianDir);

if (!enabledPlugins.includes(manifest.id)) enabledPlugins.push(manifest.id);
fs.writeFileSync(
  communityPluginsPath,
  `${JSON.stringify(enabledPlugins, null, 2)}\n`,
  "utf8",
);
if (!fs.existsSync(appConfigPath)) {
  fs.writeFileSync(
    appConfigPath,
    `${JSON.stringify({ legacyEditor: false }, null, 2)}\n`,
    "utf8",
  );
}
fs.writeFileSync(path.join(pluginDir, ".hotreload"), "", "utf8");

for (const fileName of requiredArtifacts) copyRequired(fileName);

console.log(`\nTest vault ready: ${vaultDir}`);
console.log("Open this folder as an Obsidian vault and enable the plugin if needed.");
