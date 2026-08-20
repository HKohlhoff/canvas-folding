import assert from "node:assert/strict";
import test from "node:test";

import type { CanvasGraphData } from "../../src/canvas/adapter";
import { buildCanvasGraph } from "../../src/tree/graph";
import { BranchCollapseState } from "../../src/tree/state";

void test("derives hidden descendants from collapsed parents", () => {
  const graph = buildCanvasGraph(createTreeData());
  const state = new BranchCollapseState();

  state.collapse("B");

  assert.equal(state.isCollapsed("B"), true);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["D", "E"]);
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

void test("reveals a shared branch without restoring its hidden parent", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("A1");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["A2", "D", "E"]);
  assert.equal(state.isBranchCollapsed(graph, "B"), true);

  assert.equal(state.revealBranch(graph, "B"), true);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["A2"]);
  assert.equal(state.isBranchCollapsed(graph, "B"), false);
});

void test("resets a shared-branch reveal with its causing collapse", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("A1");
  state.revealBranch(graph, "B");
  state.expand("A1");
  state.collapse("A1");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["A2", "D", "E"]);
});

void test("preserves a nested collapse inside a revealed shared branch", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.collapse("D");
  state.collapse("A1");
  state.revealBranch(graph, "B");

  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["E", "A2"]);
});

void test("limits a branch to an absolute visible depth", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();

  state.setVisibleDepth("A1", 1);
  assert.deepEqual([...state.getHiddenNodeIds(graph)], ["D", "E"]);

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
