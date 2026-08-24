import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = readJson("manifest.json");
const packageData = readJson("package.json");
const packageLock = readJson("package-lock.json");
const versions = readJson("versions.json");

assert.equal(manifest.id, "canvas-folding");
assert.equal(packageData.name, manifest.id);
assert.equal(packageData.version, manifest.version);
assert.equal(packageLock.version, manifest.version);
assert.equal(packageLock.packages?.[""]?.version, manifest.version);
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.equal(packageData.license, "GPL-3.0-or-later");
assert.match(
  readFileSync("LICENSE", "utf8"),
  /GNU GENERAL PUBLIC LICENSE\s+Version 3/,
);

console.log(
  `Release metadata ${manifest.version} for Obsidian ${manifest.minAppVersion}+ is consistent.`,
);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}
