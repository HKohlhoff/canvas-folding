import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph, type CanvasGraphData } from "../../src/tree/graph";
import { deriveCanvasVisibility } from "../../src/tree/visibility";

const graph = buildCanvasGraph(createData());

void test("hides every edge incident to a hidden node", () => {
  const visibility = deriveCanvasVisibility(graph, new Set(["B"]));

  assert.deepEqual([...visibility.hiddenEdgeIds], ["AB", "BC"]);
  assert.deepEqual([...visibility.dimmedEdgeIds], []);
});

void test("dims incident edges without overriding hidden edges", () => {
  const visibility = deriveCanvasVisibility(
    graph,
    new Set(["B"]),
    new Set(["B", "C", "D"]),
  );

  assert.deepEqual([...visibility.hiddenNodeIds], ["B"]);
  assert.deepEqual([...visibility.dimmedNodeIds], ["C", "D"]);
  assert.deepEqual([...visibility.hiddenEdgeIds], ["AB", "BC"]);
  assert.deepEqual([...visibility.dimmedEdgeIds], ["CD"]);
});

void test("leaves unrelated edges visible", () => {
  const visibility = deriveCanvasVisibility(
    graph,
    new Set(),
    new Set(["A"]),
  );

  assert.deepEqual([...visibility.hiddenEdgeIds], []);
  assert.deepEqual([...visibility.dimmedEdgeIds], ["AB"]);
});

function createData(): CanvasGraphData {
  return {
    nodes: ["A", "B", "C", "D", "E", "F"].map((id) => ({
      id,
      type: "text",
    })),
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BC", fromNode: "B", toNode: "C" },
      { id: "CD", fromNode: "C", toNode: "D" },
      { id: "EF", fromNode: "E", toNode: "F" },
    ],
  };
}
