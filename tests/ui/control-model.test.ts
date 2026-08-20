import assert from "node:assert/strict";
import test from "node:test";

import type { CanvasGraphData } from "../../src/canvas/adapter";
import { buildCanvasGraph } from "../../src/tree/graph";
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
