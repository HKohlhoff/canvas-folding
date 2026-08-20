import assert from "node:assert/strict";
import test from "node:test";

import type { CanvasGraphData } from "../../src/canvas/adapter";
import { buildCanvasGraph, describeCanvasGraph } from "../../src/tree/graph";

void test("builds directed adjacency and identifies roots", () => {
  const graph = buildCanvasGraph(
    createData(
      ["A", "B", "C", "D"],
      [
        ["A", "B"],
        ["A", "C"],
        ["B", "D"],
      ],
    ),
  );

  assert.deepEqual(graph.rootIds, ["A"]);
  assert.deepEqual(graph.childrenByNode.get("A"), ["B", "C"]);
  assert.deepEqual(graph.childrenByNode.get("B"), ["D"]);
  assert.deepEqual(graph.isolatedNodeIds, []);
});

void test("reports multiple roots and isolated nodes", () => {
  const graph = buildCanvasGraph(createData(["A", "B", "C"], [["A", "B"]]));

  assert.deepEqual(graph.rootIds, ["A", "C"]);
  assert.deepEqual(graph.isolatedNodeIds, ["C"]);
});

void test("keeps cyclic graphs finite and reports no roots", () => {
  const graph = buildCanvasGraph(
    createData(
      ["A", "B", "C"],
      [
        ["A", "B"],
        ["B", "C"],
        ["C", "A"],
      ],
    ),
  );

  assert.deepEqual(graph.rootIds, []);
  assert.deepEqual(describeCanvasGraph(graph).childrenByNode, {
    A: ["B"],
    B: ["C"],
    C: ["A"],
  });
});

void test("separates edges that reference missing nodes", () => {
  const graph = buildCanvasGraph(createData(["A"], [["A", "missing"]]));

  assert.deepEqual(graph.danglingEdgeIds, ["edge-0"]);
  assert.deepEqual(graph.isolatedNodeIds, ["A"]);
});

function createData(
  nodeIds: readonly string[],
  edgeNodes: readonly (readonly [string, string])[],
): CanvasGraphData {
  return {
    nodes: nodeIds.map((id) => ({ id, type: "text" })),
    edges: edgeNodes.map(([fromNode, toNode], index) => ({
      id: `edge-${index}`,
      fromNode,
      toNode,
    })),
  };
}
