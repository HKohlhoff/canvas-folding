import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CURRENT_RELEASE_NOTES_ID,
  CURRENT_RELEASE_NOTES_MARKDOWN,
} from "../src/release-notes-content";

void test("keeps the transient update note and repository Markdown synchronized", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8")) as {
    version: string;
  };
  const releaseNoteIdExceptions: Readonly<Record<string, string>> = {
    "1.2.2": "release-1.2.1",
    "1.2.3": "release-1.2.1",
    "1.2.4": "release-1.2.1",
  };
  const expectedReleaseNoteId = releaseNoteIdExceptions[manifest.version]
    ?? `release-${manifest.version}`;
  const expectedReleaseNoteVersion = expectedReleaseNoteId.replace("release-", "");
  assert.equal(CURRENT_RELEASE_NOTES_ID, expectedReleaseNoteId);
  assert.ok(CURRENT_RELEASE_NOTES_MARKDOWN.includes(`Canvas Folding ${expectedReleaseNoteVersion}`));
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Complete folded totals/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Show readme/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /Show last update/);
  assert.match(CURRENT_RELEASE_NOTES_MARKDOWN, /leaves no note or other content file in your Vault/);
  assert.equal(
    readFileSync("Last Update.md", "utf8").trim(),
    CURRENT_RELEASE_NOTES_MARKDOWN.trim(),
  );
});
