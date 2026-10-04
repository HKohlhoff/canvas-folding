import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync("styles.css", "utf8");

void test("isolates node-control geometry from theme button styles", () => {
  assert.match(styles, /\.workspace-leaf-content\[data-type="canvas"\][\s\S]+\.canvas-folding-branch-control/);
  assert.match(styles, /\.canvas-folding-group-control/);
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

void test("places the group control beside the native group label", () => {
  assert.match(
    styles,
    /\.canvas-folding-group-control-host \{[\s\S]+--canvas-folding-group-label-width[\s\S]+position: absolute;[\s\S]+scale\(var\(--zoom-multiplier\)\);/,
  );
  assert.doesNotMatch(
    styles,
    /\.canvas-group-label \+ \.canvas-folding-group-control-host/,
  );
  assert.match(
    styles,
    /\.canvas-folding-group-control-host \{[\s\S]+background-color: color-mix[\s\S]+var\(--background-primary\)[\s\S]+height: var\(--canvas-folding-group-label-height\);[\s\S]+padding: 0;[\s\S]+width: var\(--canvas-folding-group-label-height\);[\s\S]+z-index: 31;/,
  );
  assert.match(
    styles,
    /\.canvas-node\.canvas-folding-has-group-control[\s\S]+> \.collapse-button \{[\s\S]+display: none;/,
  );
  assert.doesNotMatch(styles, /:has\(/);
  assert.match(
    styles,
    /\.canvas-node\.canvas-folding-group-collapsed[\s\S]+\.canvas-node-container \{[\s\S]+display: none;/,
  );
  assert.match(
    styles,
    /\.canvas-node\.canvas-folding-group-collapsed[\s\S]+> \.canvas-folding-node-controls \{[\s\S]+display: none;/,
  );
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

void test("keeps long persisted-state lists vertically scrollable", () => {
  assert.match(
    styles,
    /\.canvas-folding-persisted-states-list \{[^}]*max-height: min\(50vh, 28rem\);[^}]*overflow: auto;[^}]*overscroll-behavior: contain;/,
  );
  assert.match(
    styles,
    /\.canvas-folding-persisted-states-header \{[^}]*position: sticky;[^}]*top: 0;/,
  );
});
