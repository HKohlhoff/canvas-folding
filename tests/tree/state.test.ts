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
