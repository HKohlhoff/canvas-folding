import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { prepareReadmeMarkdown } from "../../src/ui/readme-content";

void test("prepares the embedded README without automatic image requests", () => {
  const prepared = prepareReadmeMarkdown(
    [
      "![Local screenshot](images/example.png)",
      '<a href="https://example.com"><img src="https://example.com/image.png" alt="Remote"></a>',
      '<a href="https://ko-fi.com/example" target="_blank"><img src="https://storage.ko-fi.com/button.png" alt="Coffee"></a>',
      "[Local document](docs/guide.md)",
      "[Folder](examples/)",
      "[External](https://obsidian.md)",
      "[Section](#usage)",
    ].join("\n"),
    "https://github.com/example/plugin/",
  );

  assert.doesNotMatch(prepared, /<img|!\[/u);
  assert.doesNotMatch(prepared, /Image omitted|Local screenshot|Remote|Coffee/u);
  assert.match(
    prepared,
    /\[Support this plugin on Ko-fi\]\(https:\/\/ko-fi\.com\/example\)/u,
  );
  assert.doesNotMatch(prepared, /storage\.ko-fi\.com/u);
  assert.match(
    prepared,
    /https:\/\/github\.com\/example\/plugin\/blob\/master\/docs\/guide\.md/u,
  );
  assert.match(
    prepared,
    /https:\/\/github\.com\/example\/plugin\/tree\/master\/examples\//u,
  );
  assert.match(prepared, /\[External\]\(https:\/\/obsidian\.md\)/u);
  assert.match(prepared, /\[Section\]\(#usage\)/u);
});

void test("keeps the actual embedded README display contract", () => {
  const prepared = prepareReadmeMarkdown(
    readFileSync("README.md", "utf8"),
    "https://github.com/HKohlhoff/canvas-folding",
  );

  assert.doesNotMatch(prepared, /<img|!\[|Image omitted|\n{3,}/u);
  assert.match(
    prepared,
    /\[Support this plugin on Ko-fi\]\(https:\/\/ko-fi\.com\/R5R2151DS7\)/u,
  );
});
