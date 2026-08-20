import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";

const root = process.cwd();

const defaults = {
  id: "my-plugin",
  name: "My Plugin",
  description: "Describe what this Obsidian plugin does.",
  version: "0.1.0",
  minAppVersion: "1.13.0",
  author: "Holger Kohlhoff",
  authorUrl: "https://github.com/HKohlhoff",
  repository: "https://github.com/HKohlhoff/my-plugin",
  license: "UNLICENSED",
  desktopOnly: "false",
};

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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function writeText(relativePath, value) {
  fs.writeFileSync(path.join(root, relativePath), value, "utf8");
}

function normalizePackageName(pluginId) {
  return pluginId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRepositoryUrl(repository) {
  if (!repository) return "";
  if (repository.startsWith("git+")) return repository;
  if (repository.endsWith(".git")) return `git+${repository}`;
  return `git+${repository}.git`;
}

function parseBoolean(value) {
  return ["1", "true", "yes", "y", "ja", "j"].includes(String(value).toLowerCase());
}

async function ask(rl, label, key, args) {
  if (args[key] !== undefined) return args[key];

  const fallback = defaults[key];
  if (!process.stdin.isTTY) return fallback;
  const answer = await rl.question(`${label} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function collectConfig() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.log(`Usage:
  npm run init:plugin
  npm run init:plugin -- --id my-plugin --name "My Plugin"

Options:
  --id              Obsidian plugin id and npm package name
  --name            Human-readable plugin name
  --description     Plugin description
  --version         Initial version
  --min-app-version Minimum Obsidian version
  --author          Author name
  --author-url      Author URL
  --repository      Repository URL without git+ prefix
  --license         SPDX license id or UNLICENSED
  --desktop-only    true or false
`);
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return {
      id: normalizePackageName(await ask(rl, "Plugin ID", "id", args)),
      name: await ask(rl, "Plugin name", "name", args),
      description: await ask(rl, "Description", "description", args),
      version: await ask(rl, "Initial version", "version", args),
      minAppVersion: await ask(rl, "Minimum Obsidian version", "minAppVersion", args),
      author: await ask(rl, "Author", "author", args),
      authorUrl: await ask(rl, "Author URL", "authorUrl", args),
      repository: await ask(rl, "Repository URL", "repository", args),
      license: await ask(rl, "License", "license", args),
      desktopOnly: parseBoolean(await ask(rl, "Desktop only", "desktopOnly", args)),
    };
  } finally {
    rl.close();
  }
}

function updateManifest(config) {
  const manifest = readJson("manifest.json");
  manifest.id = config.id;
  manifest.name = config.name;
  manifest.version = config.version;
  manifest.minAppVersion = config.minAppVersion;
  manifest.description = config.description;
  manifest.author = config.author;
  manifest.authorUrl = config.authorUrl;
  manifest.isDesktopOnly = config.desktopOnly;
  writeJson("manifest.json", manifest);
}

function updatePackage(config) {
  const pkg = readJson("package.json");
  pkg.name = config.id;
  pkg.version = config.version;
  pkg.description = config.description;
  pkg.author = config.author;
  pkg.license = config.license;
  pkg.repository = {
    type: "git",
    url: normalizeRepositoryUrl(config.repository),
  };
  pkg.bugs = {
    url: `${config.repository.replace(/\.git$/, "")}/issues`,
  };
  pkg.homepage = `${config.repository.replace(/\.git$/, "")}#readme`;
  writeJson("package.json", pkg);
}

function updatePackageLock(config) {
  const lockPath = path.join(root, "package-lock.json");
  if (!fs.existsSync(lockPath)) return;

  const lock = readJson("package-lock.json");
  lock.name = config.id;
  lock.version = config.version;

  const rootPackage = lock.packages?.[""];
  if (rootPackage && typeof rootPackage === "object") {
    rootPackage.name = config.id;
    rootPackage.version = config.version;
    rootPackage.license = config.license;
  }

  writeJson("package-lock.json", lock);
}

function updateVersions(config) {
  writeJson("versions.json", {
    [config.version]: config.minAppVersion,
  });
}

function updateBuildScript(config) {
  const file = "build.mjs";
  const current = readText(file);
  const next = current.replace(
    /const PLUGIN_ID = ".*?";/,
    `const PLUGIN_ID = "${config.id}";`,
  );
  writeText(file, next);
}

function updateReadme(config) {
  const readme = `# ${config.name}

${config.description}

## Usage

Describe the commands, settings, and expected results of the plugin here.

## Development

\`\`\`bash
npm ci
npm test
npm run build:prod
\`\`\`

For local deployment, set \`OBSIDIAN_PLUGINS_DIR\` to your vault plugin directory and run:

\`\`\`bash
npm run build:deploy
\`\`\`

## Limitations

Document unsupported platforms, formats, workflows, and known edge cases here.

## Privacy

This plugin processes vault data locally and does not send data to external services. Update this section before release if network access, telemetry, or external services are added.

## Support

Report bugs and request features at ${config.repository.replace(/\.git$/, "")}/issues.

## License

${config.license === "UNLICENSED" ? "This project is currently unlicensed. Choose a license before publishing." : `Licensed under ${config.license}. See \`LICENSE\`.`}

## Release Checklist

- Update \`manifest.json\`, \`versions.json\` and \`package.json\` together.
- Run \`npm test\`.
- Run \`npm run build:prod\`.
- Test the plugin in a real Obsidian vault.
- Publish only \`release/main.js\`, \`release/manifest.json\` and, if needed, \`release/styles.css\`.
`;

  writeText("README.md", readme);
}

function updateLicense(config) {
  if (config.license === "UNLICENSED") {
    writeText(
      "LICENSE",
      `License placeholder

This plugin is currently marked as UNLICENSED in package.json.
Choose and add the license text before publishing.
`,
    );
  }
}

function printSummary(config) {
  console.log("\nPlugin template initialized:");
  console.log(`  id: ${config.id}`);
  console.log(`  name: ${config.name}`);
  console.log(`  version: ${config.version}`);
  console.log(`  minAppVersion: ${config.minAppVersion}`);
  console.log(`  desktopOnly: ${config.desktopOnly}`);
  console.log("\nNext steps:");
  console.log("  npm install");
  console.log("  npm test");
  console.log("  npm run build:prod");
}

const config = await collectConfig();

updateManifest(config);
updatePackage(config);
updatePackageLock(config);
updateVersions(config);
updateBuildScript(config);
updateReadme(config);
updateLicense(config);
printSummary(config);
