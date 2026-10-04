import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph, type CanvasGraphData } from "../../src/tree/graph";
import { BranchCollapseState } from "../../src/tree/state";

void test("derives hidden descendants from collapsed parents", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  state.collapse("B");

  assert.equal(state.isCollapsed("B"), true);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["D", "E"]);
});

void test("treats connected groups as regular folding descendants", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "GROUP_ROOT", type: "group" },
      { id: "CARD", type: "text" },
      { id: "GROUP_CHILD", type: "group" },
      { id: "GROUP_GRANDCHILD", type: "group" },
    ],
    edges: [
      { id: "ROOT_CARD", fromNode: "GROUP_ROOT", toNode: "CARD" },
      { id: "ROOT_CHILD", fromNode: "GROUP_ROOT", toNode: "GROUP_CHILD" },
      {
        id: "CHILD_GRANDCHILD",
        fromNode: "GROUP_CHILD",
        toNode: "GROUP_GRANDCHILD",
      },
    ],
  });
  const state = new BranchCollapseState();

  state.collapse("GROUP_ROOT");

  assert.deepEqual(
    [...state.getHiddenNodeIds(graph)],
    ["CARD", "GROUP_CHILD", "GROUP_GRANDCHILD"],
  );
  assert.deepEqual(
    [...state.getRestrictedEdgeIds(graph)],
    ["ROOT_CARD", "ROOT_CHILD"],
  );

  state.expand("GROUP_ROOT");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
  assert.deepEqual([...state.getRestrictedEdgeIds(graph)], []);
});

void test("preserves a nested collapse when its ancestor expands", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  state.collapse("B");
  state.collapse("A");
  state.expand("A");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["D", "E"]);
});

void test("expand all clears every collapsed branch", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  state.collapse("A");
  state.collapse("B");
  state.expandAll();

  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
});

void test("stores group-label filters separately from group folding", () => {
  const state = BranchCollapseState.fromData({
    hiddenGroupLabels: [" Orte ", "Orte", "Szenen"],
    revealedBranches: {},
    visibleDepths: {},
  });

  assert.equal(state.hasHiddenGroupLabels(), true);
  assert.equal(state.isGroupLabelHidden("Orte"), true);
  assert.deepEqual(state.toData().hiddenGroupLabels, ["Orte", "Szenen"]);
  assert.equal(state.toggleHiddenGroupLabel("Orte"), false);
  assert.equal(state.toggleHiddenGroupLabel(" Figuren "), true);
  assert.deepEqual(state.toData().hiddenGroupLabels, ["Figuren", "Szenen"]);
  state.expandAll();
  assert.deepEqual(state.toData().hiddenGroupLabels, ["Figuren", "Szenen"]);
  assert.equal(state.resetHiddenGroupLabels(), true);
  assert.equal(state.resetHiddenGroupLabels(), false);
  assert.equal(state.isEmpty(), true);
});

void test("prunes filters whose named groups no longer exist", () => {
  const state = BranchCollapseState.fromData({
    hiddenGroupLabels: ["Orte", "Szenen"],
    revealedBranches: {},
    visibleDepths: {},
  });
  const graph = buildCanvasGraph({
    nodes: [{ id: "GROUP", type: "group", label: "Szenen" }],
    edges: [],
  });

  assert.equal(state.prune(graph), true);
  assert.deepEqual(state.toData().hiddenGroupLabels, ["Szenen"]);
});

void test("retains a filtered label while any duplicate group still exists", () => {
  const state = BranchCollapseState.fromData({
    hiddenGroupLabels: ["Orte"],
    revealedBranches: {},
    visibleDepths: {},
  });
  const graph = buildCanvasGraph({
    nodes: [
      { id: "REMAINING", type: "group", label: "Orte" },
      { id: "RENAMED", type: "group", label: "Schauplätze" },
    ],
    edges: [],
  });

  assert.equal(state.prune(graph), false);
  assert.deepEqual(state.toData().hiddenGroupLabels, ["Orte"]);
});

void test("collapses group contents independently of directed branches", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "GROUP", type: "group", x: 0, y: 0, width: 400, height: 300 },
      { id: "NESTED", type: "group", x: 20, y: 20, width: 200, height: 180 },
      { id: "CARD", type: "text", x: 40, y: 40, width: 100, height: 60 },
      { id: "OUTSIDE", type: "text", x: 500, y: 20, width: 100, height: 60 },
    ],
    edges: [{ id: "OUTSIDE_CARD", fromNode: "OUTSIDE", toNode: "CARD" }],
  });
  const state = new BranchCollapseState();

  state.collapseGroup("GROUP");

  assert.equal(state.isGroupCollapsed("GROUP"), true);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
  assert.deepEqual(
    [...state.getGroupHiddenNodeIds(graph)],
    ["NESTED", "CARD"],
  );
  assert.deepEqual(state.toData().visibleDepths, {});
  assert.deepEqual(state.toData().collapsedGroups, ["GROUP"]);
});

void test("stores an empty collapsed group and preserves it across branch actions", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "ROOT", type: "text" },
      { id: "CHILD", type: "text" },
      { id: "EMPTY", type: "group", x: 0, y: 0, width: 200, height: 100 },
    ],
    edges: [{ id: "ROOT_CHILD", fromNode: "ROOT", toNode: "CHILD" }],
  });
  const state = new BranchCollapseState();

  state.collapseGroup("EMPTY");
  state.showAllRootBranchesThroughDepth(graph, 0);
  assert.equal(state.isGroupCollapsed("EMPTY"), true);
  state.collapseAllRootBranches(graph);

  assert.equal(state.isGroupCollapsed("EMPTY"), true);
  assert.deepEqual([...state.getGroupHiddenNodeIds(graph)], []);
  state.expandAll();
  assert.equal(state.isGroupCollapsed("EMPTY"), false);
  assert.equal(state.isCollapsed("ROOT"), false);
});

void test("collapse all keeps roots visible and hides their descendants", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  assert.equal(state.collapseAllRootBranches(graph), 1);

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["B", "C", "D", "E"]);
  assert.deepEqual(state.toData().visibleDepths, { A: 0 });
});

void test("collapse all handles multiple roots and leaves isolated nodes visible", () => {
  const graph = buildCanvasGraph({
    nodes: ["R1", "R2", "A", "B", "I"].map((id) => ({
      id,
      type: "text",
    })),
    edges: [
      { id: "R1A", fromNode: "R1", toNode: "A" },
      { id: "R2B", fromNode: "R2", toNode: "B" },
    ],
  });
  const state = new BranchCollapseState();
  state.collapse("A");

  assert.equal(state.collapseAllRootBranches(graph), 2);

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["A", "B"]);
  assert.deepEqual(state.toData().visibleDepths, { R1: 0, R2: 0 });
});

void test("collapse all leaves state unchanged when a graph has no roots", () => {
  const graph = buildCanvasGraph({
    nodes: ["A", "B"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BA", fromNode: "B", toNode: "A" },
    ],
  });
  const state = new BranchCollapseState();
  state.collapse("A");

  assert.equal(state.collapseAllRootBranches(graph), 0);
  assert.deepEqual(state.toData().visibleDepths, { A: 0 });
});

void test("collapses and expands an individual branch inside a cycle", () => {
  const graph = buildCanvasGraph({
    nodes: ["A", "B", "C"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BC", fromNode: "B", toNode: "C" },
      { id: "CA", fromNode: "C", toNode: "A" },
    ],
  });
  const state = new BranchCollapseState();

  state.collapse("A");
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["B", "C"]);
  assert.equal(state.isBranchCollapsed(graph, "A"), true);

  state.expand("A");
  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
});

void test("shows a canvas through a global root depth", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  assert.equal(state.showAllRootBranchesThroughDepth(graph, 1), 1);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["D", "E"]);
  assert.deepEqual(state.toData(), {
    globalVisibleDepth: 1,
    revealedBranches: {},
    visibleDepths: {},
  });
});

void test("global depth uses the shortest path from any root", () => {
  const data = createSharedBranchData();
  const graph = buildCanvasGraph({
    nodes: data.nodes.filter((node) => node.id !== "R"),
    edges: data.edges.filter((edge) => edge.fromNode !== "R"),
  });
  const state = new BranchCollapseState();

  state.showAllRootBranchesThroughDepth(graph, 1);

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["E"]);
});

void test("dims nodes outside a selected node and its descendants", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  state.focusBranch("B");

  assert.equal(state.getFocusedNodeId(), "B");
  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
  assert.deepEqual([...state.getDimmedNodeIds(graph)], ["A", "C"]);
});

void test("keeps focused descendants active while dimming all context", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.focusBranch("D");

  assert.deepEqual([...state.getDimmedNodeIds(graph)], ["R", "A1", "A2", "B"]);
  assert.equal(state.exitFocus(), true);
  assert.equal(state.isFocusActive(), false);
  assert.equal(state.getFocusedNodeId(), null);
});

void test("keeps geometrically contained nodes active when focusing a group", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "B", type: "text", x: 150, y: 80, width: 100, height: 80 },
      { id: "O", type: "text", x: 400, y: 20, width: 80, height: 50 },
    ],
    edges: [],
  });
  const state = new BranchCollapseState();

  state.focusBranch("G");

  assert.deepEqual([...state.getDimmedNodeIds(graph)], ["O"]);
});

void test("round-trips and prunes a focused branch", () => {
  const graph = buildCanvasGraph(createTreeData());
  const restored = BranchCollapseState.fromData({
    focusedNodeId: "B",
    revealedBranches: {},
    visibleDepths: {},
  });

  assert.equal(restored.isFocusActive(), true);
  assert.equal(restored.prune(graph), false);
  assert.equal(restored.toData().focusedNodeId, "B");

  const smallerGraph = buildCanvasGraph({ nodes: [], edges: [] });
  assert.equal(restored.prune(smallerGraph), true);
  assert.equal(restored.isFocusActive(), false);
});

void test("keeps a shared branch visible through an open alternative parent", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("A1");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["A2"]);
  assert.deepEqual([...state.getRestrictedEdgeIds(graph)], ["A1A2"]);
  assert.equal(state.isBranchCollapsed(graph, "A1"), true);
  assert.equal(state.isBranchCollapsed(graph, "B"), false);
});

void test("hides only the collapsed connection to a directly shared child", () => {
  const graph = buildCanvasGraph({
    nodes: ["R", "A", "B", "D", "E"].map((id) => ({
      id,
      type: "text",
    })),
    edges: [
      { id: "RA", fromNode: "R", toNode: "A" },
      { id: "RB", fromNode: "R", toNode: "B" },
      { id: "AD", fromNode: "A", toNode: "D" },
      { id: "BD", fromNode: "B", toNode: "D" },
      { id: "DE", fromNode: "D", toNode: "E" },
    ],
  });
  const state = new BranchCollapseState();

  state.collapse("A");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
  assert.deepEqual([...state.getRestrictedEdgeIds(graph)], ["AD"]);
  assert.equal(state.isBranchCollapsed(graph, "A"), true);
  assert.equal(state.isBranchCollapsed(graph, "B"), false);
});

void test("recomputes automatic shared-branch visibility after expanding and collapsing", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("A1");
  state.expand("A1");
  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);
  state.collapse("A1");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["A2"]);
});

void test("preserves a nested collapse inside an automatically visible shared branch", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("D");
  state.collapse("A1");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["E", "A2"]);
});

void test("limits a branch to an absolute visible depth", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.setVisibleDepth("A1", 1);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], []);

  state.setVisibleDepth("A1", 2);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["E"]);
});

void test("resets nested restrictions before applying an absolute depth", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("D");
  state.resetBranch(graph, "A1");
  state.revealEntireBranch(graph, "A1");
  state.setVisibleDepth("A1", 2);

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["E"]);
});

void test("round-trips persistent branch state", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();
  state.collapse("A1");
  state.revealBranch(graph, "B");

  const restored = BranchCollapseState.fromData(state.toData());

  assert.deepEqual(restored.toData(), state.toData());
  assert.deepEqual([...restored.getHiddenNodeIds(graph)], ["A2"]);
});

void test("normalizes and prunes stale persistent state", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = BranchCollapseState.fromData({
    visibleDepths: { A1: 1, missing: 0, invalid: -1 },
    revealedBranches: {
      A1: ["B", "missing", "B"],
      missing: ["B"],
    },
  });

  assert.equal(state.prune(graph), true);
  assert.deepEqual(state.toData(), {
    visibleDepths: { A1: 1 },
    revealedBranches: { A1: ["B"] },
  });
});

void test("prunes stale globally revealed node ids", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = BranchCollapseState.fromData({
    globalVisibleDepth: 1,
    globalRevealedBranches: ["B", "missing"],
    revealedBranches: {},
    visibleDepths: {},
  });

  assert.equal(state.prune(graph), true);
  assert.deepEqual(state.toData().globalRevealedBranches, ["B"]);
});

void test("prunes group folds that no longer refer to groups", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "GROUP", type: "group" },
      { id: "TEXT", type: "text" },
    ],
    edges: [],
  });
  const state = BranchCollapseState.fromData({
    collapsedGroups: ["GROUP", "TEXT", "MISSING"],
    revealedBranches: {},
    visibleDepths: {},
  });

  assert.equal(state.prune(graph), true);
  assert.deepEqual(state.toData().collapsedGroups, ["GROUP"]);
});

function createTreeData(): CanvasGraphData {
  return {
    nodes: ["A", "B", "C", "D", "E"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "AC", fromNode: "A", toNode: "C" },
      { id: "BD", fromNode: "B", toNode: "D" },
      { id: "BE", fromNode: "B", toNode: "E" },
    ],
  };
}

function createSharedBranchData(): CanvasGraphData {
  return {
    nodes: ["R", "A1", "A2", "B", "D", "E"].map((id) => ({
      id,
      type: "text",
    })),
    edges: [
      { id: "RA1", fromNode: "R", toNode: "A1" },
      { id: "RA2", fromNode: "R", toNode: "B" },
      { id: "A1A2", fromNode: "A1", toNode: "A2" },
      { id: "A2D", fromNode: "A2", toNode: "D" },
      { id: "BD", fromNode: "B", toNode: "D" },
      { id: "DE", fromNode: "D", toNode: "E" },
    ],
  };
}
