import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph } from "../../src/tree/graph";
import { BranchCollapseState } from "../../src/tree/state";
import {
  buildToolbarButtonModels,
  clampToolbarPosition,
  getCollapsibleSelectedNodeIds,
  getExpandableSelectedNodeIds,
  getToolbarButtonAriaPressed,
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

const multiBranchGraph = buildCanvasGraph({
  nodes: [
    { id: "A", type: "text" },
    { id: "B", type: "text" },
    { id: "C", type: "text" },
    { id: "D", type: "text" },
  ],
  edges: [
    { id: "AB", fromNode: "A", toNode: "B" },
    { id: "BC", fromNode: "B", toNode: "C" },
    { id: "AD", fromNode: "A", toNode: "D" },
  ],
});

void test("enables selected-branch actions when any selected node is applicable", () => {
  class CountingCollapseState extends BranchCollapseState {
    hiddenNodeReadCount = 0;

    override getHiddenNodeIds(
      selectedGraph: Parameters<BranchCollapseState["getHiddenNodeIds"]>[0],
    ): ReadonlySet<string> {
      this.hiddenNodeReadCount += 1;
      return super.getHiddenNodeIds(selectedGraph);
    }
  }
  const state = new CountingCollapseState();
  state.collapse("B");
  const controls = buildToolbarButtonModels(
    multiBranchGraph,
    state,
    ["B", "D"],
    true,
    true,
  );

  assert.equal(
    controls.find((control) => control.action === "collapse-selected")?.disabled,
    true,
  );
  assert.equal(
    controls.find((control) => control.action === "expand-selected")?.disabled,
    false,
  );
  assert.equal(
    controls.find((control) => control.action === "toggle-focus")?.disabled,
    true,
  );
  assert.equal(state.hiddenNodeReadCount, 1);
});

void test("uses singular and plural labels for selected-branch actions", () => {
  const singularControls = buildToolbarButtonModels(
    multiBranchGraph,
    new BranchCollapseState(),
    ["A"],
    true,
    true,
  );
  const pluralControls = buildToolbarButtonModels(
    multiBranchGraph,
    new BranchCollapseState(),
    ["A", "B"],
    true,
    true,
  );

  assert.equal(
    singularControls.find((control) => control.action === "collapse-selected")
      ?.label,
    "Collapse selected branch",
  );
  assert.equal(
    singularControls.find((control) => control.action === "expand-selected")
      ?.label,
    "Expand selected branch",
  );
  assert.equal(
    pluralControls.find((control) => control.action === "collapse-selected")
      ?.label,
    "Collapse selected branches",
  );
  assert.equal(
    pluralControls.find((control) => control.action === "expand-selected")
      ?.label,
    "Expand selected branches",
  );
});

void test("keeps all applicable nested selections as independent collapse points", () => {
  const state = new BranchCollapseState();
  const nodeIds = getCollapsibleSelectedNodeIds(
    multiBranchGraph,
    state,
    ["A", "B", "D"],
  );

  assert.deepEqual(nodeIds, ["A", "B"]);
  for (const nodeId of nodeIds) state.collapse(nodeId);
  assert.equal(state.isCollapsed("A"), true);
  assert.equal(state.isCollapsed("B"), true);

  state.expand("A");
  assert.equal(state.isCollapsed("B"), true);
  assert.deepEqual([...state.getHiddenNodeIds(multiBranchGraph)].sort(), ["C"]);
});

void test("separates collapsible and expandable nodes in a mixed selection", () => {
  const graphWithTwoBranches = buildCanvasGraph({
    nodes: [
      { id: "A", type: "text" },
      { id: "B", type: "text" },
      { id: "C", type: "text" },
      { id: "D", type: "text" },
    ],
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "CD", fromNode: "C", toNode: "D" },
    ],
  });
  const state = new BranchCollapseState();
  state.collapse("A");

  assert.deepEqual(
    getCollapsibleSelectedNodeIds(graphWithTwoBranches, state, ["A", "C"]),
    ["C"],
  );
  assert.deepEqual(
    getExpandableSelectedNodeIds(graphWithTwoBranches, state, ["A", "C"]),
    ["A"],
  );

  const controls = buildToolbarButtonModels(
    graphWithTwoBranches,
    state,
    ["A", "C"],
    true,
    true,
  );
  assert.equal(
    controls.find((control) => control.action === "collapse-selected")?.disabled,
    false,
  );
  assert.equal(
    controls.find((control) => control.action === "expand-selected")?.disabled,
    false,
  );
});

void test("deduplicates a batch and expands every selected shared branch", () => {
  const sharedGraph = buildCanvasGraph({
    nodes: ["A", "B", "C", "D"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AC", fromNode: "A", toNode: "C" },
      { id: "BC", fromNode: "B", toNode: "C" },
      { id: "CD", fromNode: "C", toNode: "D" },
    ],
  });
  const state = new BranchCollapseState();
  const selectedNodeIds = ["A", "B", "A", "D"];

  const collapsibleNodeIds = getCollapsibleSelectedNodeIds(
    sharedGraph,
    state,
    selectedNodeIds,
  );
  assert.deepEqual(collapsibleNodeIds, ["A", "B"]);
  for (const nodeId of collapsibleNodeIds) state.collapse(nodeId);
  assert.deepEqual([...state.getHiddenNodeIds(sharedGraph)], ["C", "D"]);

  const expandableNodeIds = getExpandableSelectedNodeIds(
    sharedGraph,
    state,
    selectedNodeIds,
  );
  assert.deepEqual(expandableNodeIds, ["A", "B"]);
  for (const nodeId of expandableNodeIds) state.expand(nodeId);
  assert.deepEqual([...state.getHiddenNodeIds(sharedGraph)], []);
});

void test("keeps selected cycle nodes finite, ordered, and independent", () => {
  const cycleGraph = buildCanvasGraph({
    nodes: ["A", "B", "C"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BC", fromNode: "B", toNode: "C" },
      { id: "CA", fromNode: "C", toNode: "A" },
    ],
  });
  const state = new BranchCollapseState();

  const nodeIds = getCollapsibleSelectedNodeIds(
    cycleGraph,
    state,
    ["B", "A", "B"],
  );
  assert.deepEqual(nodeIds, ["B", "A"]);
  for (const nodeId of nodeIds) state.collapse(nodeId);

  assert.equal(state.isCollapsed("A"), true);
  assert.equal(state.isCollapsed("B"), true);
  assert.deepEqual(
    getExpandableSelectedNodeIds(cycleGraph, state, ["B", "A", "B"]),
    ["B", "A"],
  );
});

void test("uses an open eye while branch controls are visible", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    [],
    true,
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
    true,
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

void test("places the focus-control visibility toggle before branch focus", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    ["A"],
    true,
    false,
  );
  const focusControlsIndex = controls.findIndex(
    (control) => control.action === "toggle-focus-controls",
  );
  const focusActionIndex = controls.findIndex(
    (control) => control.action === "toggle-focus",
  );

  assert.equal(focusControlsIndex + 1, focusActionIndex);
  assert.equal(controls[focusControlsIndex]?.separatorBefore, true);
  assert.equal(controls[focusControlsIndex]?.icon, "eye-closed");
  assert.equal(controls[focusControlsIndex]?.label, "Show focus controls");
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

void test("clamps restored toolbar positions to the current canvas bounds", () => {
  const bounds = { minXPercent: 20, maxXPercent: 80, maxYPixels: 120 };

  assert.deepEqual(
    clampToolbarPosition({ xPercent: 95, yPixels: 5000 }, bounds),
    { xPercent: 80, yPixels: 120 },
  );
  assert.deepEqual(
    clampToolbarPosition({ xPercent: 5, yPixels: -10 }, bounds),
    { xPercent: 20, yPixels: 0 },
  );
  assert.deepEqual(
    moveToolbarPositionWithArrowKey(
      clampToolbarPosition({ xPercent: 95, yPixels: 5000 }, bounds),
      "ArrowLeft",
      bounds,
    ),
    { xPercent: 78, yPixels: 120 },
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

void test("centers the toolbar without a CSS transform", () => {
  assert.equal(getToolbarLeftPosition(50, 420), "calc(50% - 210px)");
  assert.equal(getToolbarLeftPosition(25, -10), "calc(25% - 0px)");
});
