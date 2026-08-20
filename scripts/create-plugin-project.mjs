import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const templateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultParentDir = path.dirname(templateRoot);

const excludedNames = new Set([
  ".git",
  ".DS_Store",
  ".test-build",
  "node_modules",
  "package-lock.json",
  "release",
]);

function parseArgs(argv) {
  const result = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

    if (inlineValue !== undefined) {
      result[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = "true";
    }
  }

  return result;
}

function normalizePluginId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectDirFromId(pluginId) {
  return `Projekt_${pluginId
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("")}`;
}

function parseBoolean(value, fallback = true) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "y", "ja", "j"].includes(String(value).toLowerCase());
}

async function ask(rl, label, fallback) {
  if (!process.stdin.isTTY) return fallback;
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function askYesNo(rl, label, fallback = true) {
  if (!process.stdin.isTTY) return fallback;
  const marker = fallback ? "Y/n" : "y/N";
  const answer = await rl.question(`${label} [${marker}]: `);
  return parseBoolean(answer.trim(), fallback);
}

function assertTargetDirIsUsable(targetDir) {
  if (!fs.existsSync(targetDir)) return;

  const entries = fs.readdirSync(targetDir).filter((entry) => entry !== ".DS_Store");
  if (entries.length > 0) {
    throw new Error(`Target directory already exists and is not empty: ${targetDir}`);
  }
}

function copyTemplate(srcDir, dstDir) {
  ensureDir(dstDir);

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (excludedNames.has(entry.name)) continue;

    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      copyTemplate(src, dst);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(dst));
      fs.copyFileSync(src, dst);
    }
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(command, args, cwd, label) {
  console.log(`\n[run] ${label}`);
  console.log(`      ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function runOptional(command, args, cwd, label) {
  try {
    run(command, args, cwd, label);
    return true;
  } catch (error) {
    console.warn(`\n[warn] ${error.message}`);
    return false;
  }
}

function buildInitArgs(config) {
  return [
    "run",
    "init:plugin",
    "--",
    "--id",
    config.id,
    "--name",
    config.name,
    "--description",
    config.description,
    "--version",
    config.version,
    "--min-app-version",
    config.minAppVersion,
    "--author",
    config.author,
    "--author-url",
    config.authorUrl,
    "--repository",
    config.repository,
    "--license",
    config.license,
    "--desktop-only",
    String(config.desktopOnly),
  ];
}

async function collectConfig() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.log(`Usage:
  npm run create:plugin
  npm run create:plugin -- --id my-plugin --name "My Plugin"

Options:
  --target-dir       Full target directory for the new project
  --id               Obsidian plugin id and npm package name
  --name             Human-readable plugin name
  --description      Plugin description
  --version          Initial version
  --min-app-version  Minimum Obsidian version
  --author           Author name
  --author-url       Author URL
  --repository       Repository URL
  --license          SPDX license id or UNLICENSED
  --desktop-only     true or false
  --skip-install     Do not run npm install
  --skip-checks      Do not run npm test and npm run build:prod
  --skip-git         Do not initialize git
`);
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const id = normalizePluginId(args.id || await ask(rl, "Plugin ID", "my-plugin"));
    const defaultName = id
      .split(/[-_.]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");

    const targetDir = path.resolve(args.targetDir || await ask(
      rl,
      "Target project directory",
      path.join(defaultParentDir, projectDirFromId(id)),
    ));

    const config = {
      targetDir,
      id,
      name: args.name || await ask(rl, "Plugin name", defaultName),
      description: args.description || await ask(rl, "Description", "Describe what this Obsidian plugin does."),
      version: args.version || await ask(rl, "Initial version", "0.1.0"),
      minAppVersion: args.minAppVersion || await ask(rl, "Minimum Obsidian version", "1.13.0"),
      author: args.author || await ask(rl, "Author", "Holger Kohlhoff"),
      authorUrl: args.authorUrl || await ask(rl, "Author URL", "https://github.com/HKohlhoff"),
      repository: args.repository || await ask(rl, "Repository URL", `https://github.com/HKohlhoff/${id}`),
      license: args.license || await ask(rl, "License", "UNLICENSED"),
      desktopOnly: parseBoolean(args.desktopOnly ?? await ask(rl, "Desktop only", "false"), false),
      runInstall: !parseBoolean(args.skipInstall, false) && await askYesNo(rl, "Run npm install", true),
      runChecks: !parseBoolean(args.skipChecks, false) && await askYesNo(rl, "Run npm test and npm run build:prod", true),
      runGit: !parseBoolean(args.skipGit, false) && await askYesNo(rl, "Initialize git and create first commit", true),
    };

    return config;
  } finally {
    rl.close();
  }
}

function printSummary(config) {
  console.log("\nNew plugin project created:");
  console.log(`  ${config.targetDir}`);
  console.log("\nNext useful commands:");
  console.log(`  cd "${config.targetDir}"`);
  if (!config.runInstall) console.log("  npm install");
  if (!config.runChecks) {
    console.log("  npm test");
    console.log("  npm run build:prod");
  }
  console.log("  npm run create:test-vault");
}

const config = await collectConfig();

assertTargetDirIsUsable(config.targetDir);
copyTemplate(templateRoot, config.targetDir);

run("npm", buildInitArgs(config), config.targetDir, "Initialize plugin metadata");

if (config.runInstall) {
  run("npm", ["install"], config.targetDir, "Install dependencies");
}

if (config.runChecks) {
  run("npm", ["test"], config.targetDir, "Run lint and typecheck");
  run("npm", ["run", "build:prod"], config.targetDir, "Build production release");
}

if (config.runGit) {
  run("git", ["init"], config.targetDir, "Initialize git repository");
  run("git", ["add", "."], config.targetDir, "Stage initial project");
  runOptional("git", ["commit", "-m", "Initialize Obsidian plugin project"], config.targetDir, "Create initial commit");
}

printSummary(config);
