import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const packageData = JSON.parse(readFileSync("package.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

assert.match(tag, /^\d+\.\d+\.\d+$/, "Release tag must use the exact x.y.z version format");
assert.equal(tag, manifest.version, "Release tag must match manifest.json version");
assert.equal(tag, packageData.version, "Release tag must match package.json version");
assert.equal(
  versions[tag],
  manifest.minAppVersion,
  "Release tag must have the expected versions.json entry",
);

console.log(`Release tag ${tag} matches the plugin metadata.`);
