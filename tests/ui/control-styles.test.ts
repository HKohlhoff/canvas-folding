import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync("styles.css", "utf8");

void test("isolates node-control geometry from theme button styles", () => {
  assert.match(styles, /\.workspace-leaf-content\[data-type="canvas"\][\s\S]+\.canvas-folding-branch-control/);
  assert.match(styles, /-webkit-appearance: none;/);
  assert.match(styles, /appearance: none;/);
  assert.match(styles, /box-sizing: border-box;/);
  assert.match(styles, /flex: 0 0 20px;/);
  assert.match(styles, /max-width: 20px;/);
  assert.match(styles, /width: 20px;/);
  assert.match(styles, /border-radius: 999px;/);
});

void test("places controls inside the upper-right corner beyond the resize border", () => {
  assert.match(
    styles,
    /\.canvas-folding-node-controls \{[\s\S]+right: 4px;[\s\S]+top: 4px;[\s\S]+width: max-content;/,
  );
  assert.doesNotMatch(styles, /\.canvas-folding-node-controls\.is-node-selected/);
});

void test("keeps node actions directly visible and interactive", () => {
  assert.match(
    styles,
    /\.canvas-folding-branch-control,[\s\S]+\.canvas-folding-focus-control \{[\s\S]+pointer-events: auto;/,
  );
  assert.doesNotMatch(styles, /opacity: 0;/);
  assert.doesNotMatch(styles, /\.canvas-folding-node-controls:hover/);
});

void test("keeps desktop-sized compact geometry on coarse pointers", () => {
  assert.match(
    styles,
    /@media \(pointer: coarse\) \{[\s\S]+\.canvas-folding-node-controls \{[\s\S]+right: 4px;[\s\S]+top: 4px;[\s\S]+width: max-content;/,
  );
  assert.match(
    styles,
    /@media \(pointer: coarse\) \{[\s\S]+flex-basis: 20px;[\s\S]+font-size: 14px;[\s\S]+height: 20px;/,
  );
  assert.doesNotMatch(styles, /flex-basis: 28px;/);
  assert.match(styles, /\.canvas-folding-branch-control\.has-hidden-count \{[\s\S]+max-width: none;[\s\S]+width: auto;/);
});

void test("keeps hover styling off touch-only pointers", () => {
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.doesNotMatch(
    styles,
    /\.canvas-folding-focus-control\.is-active \{[^}]+background: var\(--interactive-accent\)/,
  );
});
