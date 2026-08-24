import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph } from "../../src/tree/graph";
import { BranchCollapseState } from "../../src/tree/state";
import {
  buildToolbarButtonModels,
  getToolbarButtonAriaPressed,
  getMeasuredToolbarWidth,
  getToolbarLeftPosition,
  isToolbarSpaceKey,
  moveToolbarPositionWithArrowKey,
  TOOLBAR_POINTER_EVENT_NAMES,
} from "../../src/ui/toolbar-model";

const graph = buildCanvasGraph({
  nodes: [
    { id: "A", type: "text" },
    { id: "B", type: "text" },
  ],
  edges: [{ id: "AB", fromNode: "A", toNode: "B" }],
});

void test("uses an open eye while branch controls are visible", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    [],
    true,
  );

  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.icon,
    "eye",
  );
  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.active,
    undefined,
  );
});

void test("uses a closed eye while branch controls are hidden", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    [],
    false,
  );

  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.icon,
    "eye-closed",
  );
  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.active,
    undefined,
  );
  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.label,
    "Show branch controls",
  );
});

void test("only exposes aria-pressed for actual toggle buttons", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    [],
    true,
  );

  assert.equal(
    getToolbarButtonAriaPressed(
      controls.find((control) => control.action === "collapse-all") ?? {},
    ),
    null,
  );
  assert.equal(
    getToolbarButtonAriaPressed(
      controls.find((control) => control.action === "toggle-focus") ?? {},
    ),
    "false",
  );
});

void test("moves and clamps the toolbar with arrow keys", () => {
  const bounds = { minXPercent: 10, maxXPercent: 90, maxYPixels: 100 };

  assert.deepEqual(
    moveToolbarPositionWithArrowKey(
      { xPercent: 50, yPixels: 20 },
      "ArrowRight",
      bounds,
    ),
    { xPercent: 52, yPixels: 20 },
  );
  assert.deepEqual(
    moveToolbarPositionWithArrowKey(
      { xPercent: 10, yPixels: 0 },
      "ArrowLeft",
      bounds,
    ),
    { xPercent: 10, yPixels: 0 },
  );
  assert.equal(
    moveToolbarPositionWithArrowKey(
      { xPercent: 50, yPixels: 20 },
      "Enter",
      bounds,
    ),
    null,
  );
});

void test("recognizes the toolbar space activation key", () => {
  assert.equal(isToolbarSpaceKey(" "), true);
  assert.equal(isToolbarSpaceKey("Space"), false);
  assert.equal(isToolbarSpaceKey("Enter"), false);
});

void test("isolates the complete toolbar pointer sequence", () => {
  assert.deepEqual(TOOLBAR_POINTER_EVENT_NAMES, [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
  ]);
});

void test("measures the complete toolbar content including its border", () => {
  assert.equal(getMeasuredToolbarWidth(420.2, 302, 300), 423);
  assert.equal(getMeasuredToolbarWidth(0, 0, 0), 0);
});

void test("centers the toolbar without a CSS transform", () => {
  assert.equal(getToolbarLeftPosition(50, 420), "calc(50% - 210px)");
  assert.equal(getToolbarLeftPosition(25, -10), "calc(25% - 0px)");
});
