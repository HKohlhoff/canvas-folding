import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CURRENT_RELEASE_NOTES_ID,
  CURRENT_RELEASE_NOTES_MARKDOWN,
  CURRENT_RELEASE_NOTES_VERSION,
} from "../src/release-notes-content";

void test("keeps the transient update note and repository Markdown synchronized", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8")) as {
    version: string;
  };
  assert.equal(CURRENT_RELEASE_NOTES_ID, `release-${manifest.version}`);
  assert.equal(CURRENT_RELEASE_NOTES_VERSION, manifest.version);
  assert.ok(CURRENT_RELEASE_NOTES_MARKDOWN.includes(`Canvas Folding ${manifest.version}`));
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Group controls beside the name/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Complete group folding/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Advanced Canvas keeps priority/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /switches remain to the left/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /internally disables its own group-folding mechanism/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /substantial internal coordination/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Show last update/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /leaves no note or other content file in your Vault/);
  assert.equal(
    readFileSync("Last Update.md", "utf8").trim(),
    CURRENT_RELEASE_NOTES_MARKDOWN.trim(),
  );
});
