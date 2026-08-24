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

void test("omits controls hosted by hidden descendant nodes", () => {
  const graph = buildCanvasGraph(createData());
  const state = new BranchCollapseState();
  state.collapse("A");

  assert.deepEqual(buildBranchControlModels(graph, state), [
    { nodeId: "A", collapsed: true, descendantCount: 3 },
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

void test("treats group, file, link and text nodes consistently", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group" },
      { id: "F", type: "file" },
      { id: "L", type: "link" },
      { id: "T", type: "text" },
    ],
    edges: [
      { id: "GF", fromNode: "G", toNode: "F" },
      { id: "FL", fromNode: "F", toNode: "L" },
      { id: "LT", fromNode: "L", toNode: "T" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()),
    [
      { nodeId: "G", collapsed: false, descendantCount: 3 },
      { nodeId: "F", collapsed: false, descendantCount: 2 },
      { nodeId: "L", collapsed: false, descendantCount: 1 },
    ],
  );
});

void test("orders root branch controls by their canvas position", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "BOTTOM", type: "text", x: 0, y: 200 },
      { id: "TOP_RIGHT", type: "text", x: 200, y: 0 },
      { id: "TOP_LEFT", type: "text", x: 0, y: 0 },
      { id: "CHILD", type: "text", x: 0, y: 400 },
    ],
    edges: [
      { id: "BC", fromNode: "BOTTOM", toNode: "CHILD" },
      { id: "RC", fromNode: "TOP_RIGHT", toNode: "CHILD" },
      { id: "LC", fromNode: "TOP_LEFT", toNode: "CHILD" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()).map(
      (model) => model.nodeId,
    ),
    ["TOP_LEFT", "TOP_RIGHT", "BOTTOM"],
  );
});

void test("orders sibling branches from top to bottom", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "RIGHT", type: "text", x: 200, y: 0 },
      { id: "LEFT", type: "text", x: 0, y: 12 },
      { id: "BOTTOM", type: "text", x: 0, y: 100 },
      { id: "CHILD", type: "text", x: 0, y: 300 },
    ],
    edges: [
      { id: "RC", fromNode: "RIGHT", toNode: "CHILD" },
      { id: "LC", fromNode: "LEFT", toNode: "CHILD" },
      { id: "BC", fromNode: "BOTTOM", toNode: "CHILD" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()).map(
      (model) => model.nodeId,
    ),
    ["RIGHT", "LEFT", "BOTTOM"],
  );
});

void test("finishes an upper child branch before visiting its lower sibling", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "ROOT", type: "text", x: 0, y: 0 },
      { id: "LOWER", type: "text", x: 200, y: 200 },
      { id: "UPPER", type: "text", x: 200, y: 0 },
      { id: "UPPER_CHILD", type: "text", x: 400, y: 0 },
      { id: "UPPER_LEAF", type: "text", x: 600, y: 0 },
      { id: "LOWER_LEAF", type: "text", x: 400, y: 200 },
    ],
    edges: [
      { id: "RU", fromNode: "ROOT", toNode: "UPPER" },
      { id: "RL", fromNode: "ROOT", toNode: "LOWER" },
      { id: "UU", fromNode: "UPPER", toNode: "UPPER_CHILD" },
      { id: "UL", fromNode: "UPPER_CHILD", toNode: "UPPER_LEAF" },
      { id: "LL", fromNode: "LOWER", toNode: "LOWER_LEAF" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()).map(
      (model) => model.nodeId,
    ),
    ["ROOT", "UPPER", "UPPER_CHILD", "LOWER"],
  );
});

void test("keeps depth-first control ordering finite for a rootless cycle", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "A", type: "text", x: 0, y: 0 },
      { id: "B", type: "text", x: 200, y: 0 },
    ],
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BA", fromNode: "B", toNode: "A" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()).map(
      (model) => model.nodeId,
    ),
    ["A", "B"],
  );
});

void test("orders a three-node rootless cycle deterministically", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "A", type: "text", x: 0, y: 120 },
      { id: "B", type: "text", x: 360, y: 0 },
      { id: "C", type: "text", x: 360, y: 240 },
    ],
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BC", fromNode: "B", toNode: "C" },
      { id: "CA", fromNode: "C", toNode: "A" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()).map(
      (model) => model.nodeId,
    ),
    ["B", "C", "A"],
  );
});

void test("visits a shared descendant control only once", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "ROOT", type: "text", x: 0, y: 0 },
      { id: "UPPER", type: "text", x: 200, y: 0 },
      { id: "LOWER", type: "text", x: 200, y: 200 },
      { id: "SHARED", type: "text", x: 400, y: 100 },
      { id: "LEAF", type: "text", x: 600, y: 100 },
    ],
    edges: [
      { id: "RU", fromNode: "ROOT", toNode: "UPPER" },
      { id: "RL", fromNode: "ROOT", toNode: "LOWER" },
      { id: "US", fromNode: "UPPER", toNode: "SHARED" },
      { id: "LS", fromNode: "LOWER", toNode: "SHARED" },
      { id: "SL", fromNode: "SHARED", toNode: "LEAF" },
    ],
  });

  assert.deepEqual(
    buildBranchControlModels(graph, new BranchCollapseState()).map(
      (model) => model.nodeId,
    ),
    ["ROOT", "UPPER", "SHARED", "LOWER"],
  );
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
