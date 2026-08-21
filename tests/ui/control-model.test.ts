import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph } from "../../src/tree/graph";
import type { CanvasGraphData } from "../../src/tree/graph";
import { BranchCollapseState } from "../../src/tree/state";
import { buildBranchControlModels } from "../../src/ui/control-model";

void test("creates controls only for nodes with descendants", () => {
  const graph = buildCanvasGraph(createData());
  const state = new BranchCollapseState();

  assert.deepEqual(buildBranchControlModels(graph, state), [
    { nodeId: "A", collapsed: false, descendantCount: 3 },
    { nodeId: "B", collapsed: false, descendantCount: 1 },
  ]);
});

void test("reflects collapsed state without changing graph structure", () => {
  const graph = buildCanvasGraph(createData());
  const state = new BranchCollapseState();
  state.collapse("B");

  assert.deepEqual(buildBranchControlModels(graph, state), [
    { nodeId: "A", collapsed: false, descendantCount: 3 },
    { nodeId: "B", collapsed: true, descendantCount: 1 },
  ]);
});

void test("shows an expand control for a visible parent of a hidden shared branch", () => {
  const graph = buildCanvasGraph(createSharedBranchData());
  const state = new BranchCollapseState();
  state.collapse("A1");

  const models = buildBranchControlModels(graph, state);

  assert.equal(models.find((model) => model.nodeId === "B")?.collapsed, true);
});

void test("shows expand controls at the boundary of a visible depth", () => {
  const graph = buildCanvasGraph(createData());
  const state = new BranchCollapseState();
  state.setVisibleDepth("A", 1);

  const models = buildBranchControlModels(graph, state);

  assert.equal(models.find((model) => model.nodeId === "A")?.collapsed, false);
  assert.equal(models.find((model) => model.nodeId === "B")?.collapsed, true);
});

function createData(): CanvasGraphData {
  return {
    nodes: ["A", "B", "C", "D"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "AC", fromNode: "A", toNode: "C" },
      { id: "BD", fromNode: "B", toNode: "D" },
    ],
  };
}

function createSharedBranchData(): CanvasGraphData {
  return {
    nodes: ["R", "A1", "A2", "B", "D"].map((id) => ({
      id,
      type: "text",
    })),
    edges: [
      { id: "RA1", fromNode: "R", toNode: "A1" },
      { id: "RB", fromNode: "R", toNode: "B" },
      { id: "A1A2", fromNode: "A1", toNode: "A2" },
      { id: "A2D", fromNode: "A2", toNode: "D" },
      { id: "BD", fromNode: "B", toNode: "D" },
    ],
  };
}
