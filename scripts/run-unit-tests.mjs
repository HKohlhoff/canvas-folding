import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import esbuild from "esbuild";

const TEST_DIR = "tests";
const OUTPUT_DIR = ".test-build";

const testFiles = findTestFiles(TEST_DIR);
if (testFiles.length === 0) {
  console.log("No unit tests found.");
  process.exit(0);
}

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });

await esbuild.build({
  entryPoints: testFiles,
  outbase: TEST_DIR,
  outdir: OUTPUT_DIR,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  sourcemap: false,
  logLevel: "warning",
});

const outputFiles = testFiles.map((file) =>
  path.join(OUTPUT_DIR, path.relative(TEST_DIR, file).replace(/\.ts$/, ".js")),
);
const result = spawnSync(process.execPath, ["--test", ...outputFiles], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);

function findTestFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? findTestFiles(entryPath) : [entryPath];
    })
    .filter((file) => file.endsWith(".test.ts"))
    .sort();
}
