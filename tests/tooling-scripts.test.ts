import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import test from "node:test";

const CREATE_TEST_VAULT_SCRIPT = path.resolve("scripts/create-test-vault.mjs");
const CHECK_RELEASE_TAG_SCRIPT = path.resolve("scripts/check-release-tag.mjs");
const DEFAULT_CONFIG_DIR = [".", "obsidian"].join("");

void test("refuses to mutate a test vault when required artifacts are missing", () => {
  withTemporaryDirectory((projectDir) => {
    const manifestData = {
      id: "canvas-folding",
    };
    writeJson(path.join(projectDir, "manifest.json"), manifestData);
    writeFileSync(path.join(projectDir, "styles.css"), "/* styles */\n");
    const vaultDir = path.join(projectDir, "Vault");

    const result = runNode(CREATE_TEST_VAULT_SCRIPT, [vaultDir], projectDir);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing required release artifacts/u);
    assert.equal(existsSync(vaultDir), false);
  });
});

void test("refuses stale release metadata before creating a test vault", () => {
  withTemporaryDirectory((projectDir) => {
    const releaseDir = path.join(projectDir, "release");
    mkdirSync(releaseDir, { recursive: true });
    writeJson(path.join(projectDir, "manifest.json"), {
      id: "canvas-folding",
      version: "1.2.4",
    });
    writeFileSync(path.join(releaseDir, "main.js"), "release main\n");
    writeJson(path.join(releaseDir, "manifest.json"), {
      id: "canvas-folding",
      version: "1.2.3",
    });
    const vaultDir = path.join(projectDir, "Vault");

    const result = runNode(CREATE_TEST_VAULT_SCRIPT, [vaultDir], projectDir);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /release\/manifest\.json does not match/u);
    assert.equal(existsSync(vaultDir), false);
  });
});

void test("refuses stale release styles before creating a test vault", () => {
  withTemporaryDirectory((projectDir) => {
    const releaseDir = path.join(projectDir, "release");
    const manifestData = { id: "canvas-folding" };
    mkdirSync(releaseDir, { recursive: true });
    writeJson(path.join(projectDir, "manifest.json"), manifestData);
    writeFileSync(path.join(projectDir, "styles.css"), "current styles\n");
    writeFileSync(path.join(releaseDir, "main.js"), "release main\n");
    writeJson(path.join(releaseDir, "manifest.json"), manifestData);
    writeFileSync(path.join(releaseDir, "styles.css"), "stale styles\n");
    const vaultDir = path.join(projectDir, "Vault");

    const result = runNode(CREATE_TEST_VAULT_SCRIPT, [vaultDir], projectDir);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /release\/styles\.css does not match/u);
    assert.equal(existsSync(vaultDir), false);
  });
});

void test("preserves existing test-vault configuration and enabled plugins", () => {
  withTemporaryDirectory((projectDir) => {
    const manifestData = {
      id: "canvas-folding",
    };
    const vaultDir = path.join(projectDir, "Vault");
    const obsidianDir = path.join(vaultDir, DEFAULT_CONFIG_DIR);
    const releaseDir = path.join(projectDir, "release");
    mkdirSync(obsidianDir, { recursive: true });
    mkdirSync(releaseDir, { recursive: true });
    writeJson(path.join(projectDir, "manifest.json"), manifestData);
    writeFileSync(path.join(projectDir, "styles.css"), "release styles\n");
    writeFileSync(path.join(releaseDir, "main.js"), "release main\n");
    writeJson(path.join(releaseDir, "manifest.json"), manifestData);
    writeFileSync(path.join(releaseDir, "styles.css"), "release styles\n");
    writeJson(path.join(obsidianDir, "community-plugins.json"), ["other-plugin"]);
    const appConfig = `${JSON.stringify({ custom: true }, null, 2)}\n`;
    writeFileSync(path.join(obsidianDir, "app.json"), appConfig);

    const result = runNode(CREATE_TEST_VAULT_SCRIPT, [vaultDir], projectDir);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      JSON.parse(readFileSync(path.join(obsidianDir, "community-plugins.json"), "utf8")),
      ["other-plugin", "canvas-folding"],
    );
    assert.equal(readFileSync(path.join(obsidianDir, "app.json"), "utf8"), appConfig);
    const pluginDir = path.join(obsidianDir, "plugins", "canvas-folding");
    assert.equal(readFileSync(path.join(pluginDir, "main.js"), "utf8"), "release main\n");
    assert.equal(readFileSync(path.join(pluginDir, "styles.css"), "utf8"), "release styles\n");
  });
});

void test("accepts only a release tag matching all version metadata", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8")) as {
    version: string;
  };
  const matching = runNode(CHECK_RELEASE_TAG_SCRIPT, [manifest.version], process.cwd());
  const mismatching = runNode(CHECK_RELEASE_TAG_SCRIPT, ["9.9.9"], process.cwd());

  assert.equal(matching.status, 0, matching.stderr);
  assert.notEqual(mismatching.status, 0);
  assert.match(mismatching.stderr, /must match manifest\.json version/u);
});

function runNode(script: string, args: readonly string[], cwd: string) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function withTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(path.join(tmpdir(), "canvas-folding-test-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
