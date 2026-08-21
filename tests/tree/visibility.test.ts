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

void test("hides a non-empty group when all contained nodes are hidden", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "B", type: "file", x: 150, y: 80, width: 100, height: 80 },
      { id: "O", type: "text", x: 400, y: 20, width: 80, height: 50 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(groupGraph, new Set(["A", "B"]));

  assert.deepEqual([...visibility.hiddenNodeIds], ["A", "B", "G"]);
});

void test("keeps a group visible while any fully contained node is visible", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "B", type: "text", x: 150, y: 80, width: 100, height: 80 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(groupGraph, new Set(["A"]));

  assert.deepEqual([...visibility.hiddenNodeIds], ["A"]);
});

void test("does not hide empty groups or count partially overlapping nodes", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "EMPTY", type: "group", x: 400, y: 0, width: 100, height: 100 },
      { id: "G", type: "group", x: 0, y: 0, width: 100, height: 100 },
      { id: "P", type: "text", x: 80, y: 20, width: 50, height: 50 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(groupGraph, new Set(["P"]));

  assert.deepEqual([...visibility.hiddenNodeIds], ["P"]);
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
