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
