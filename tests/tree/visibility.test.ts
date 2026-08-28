import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph, type CanvasGraphData } from "../../src/tree/graph";
import {
  deriveCanvasVisibility,
  getNodeIdsHiddenByGroups,
  summarizeCanvasVisibility,
} from "../../src/tree/visibility";

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

void test("hides a restricted branch edge while both endpoints stay visible", () => {
  const visibility = deriveCanvasVisibility(
    graph,
    new Set(),
    new Set(),
    new Set(["BC"]),
  );

  assert.deepEqual([...visibility.hiddenNodeIds], []);
  assert.deepEqual([...visibility.hiddenEdgeIds], ["BC"]);
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

void test("hides unconnected nodes contained by a hidden group", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "O", type: "text", x: 400, y: 20, width: 80, height: 50 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(groupGraph, new Set(["G"]));

  assert.deepEqual([...visibility.hiddenNodeIds], ["G", "A"]);
});

void test("propagates hidden group contents through nested groups", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "INNER", type: "group", x: 40, y: 40, width: 200, height: 120 },
      { id: "A", type: "text", x: 60, y: 60, width: 80, height: 50 },
      { id: "OUTER", type: "group", x: 0, y: 0, width: 300, height: 200 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(groupGraph, new Set(["OUTER"]));

  assert.deepEqual([...visibility.hiddenNodeIds], ["OUTER", "INNER", "A"]);
  assert.deepEqual(
    [...getNodeIdsHiddenByGroups(groupGraph.nodes, new Set(["OUTER"]))],
    ["INNER", "A"],
  );
});

void test("includes automatically hidden groups in the status summary", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "B", type: "file", x: 150, y: 80, width: 100, height: 80 },
      { id: "O", type: "text", x: 400, y: 20, width: 80, height: 50 },
    ],
    edges: [],
  });

  assert.deepEqual(
    summarizeCanvasVisibility(groupGraph, new Set(["A", "B"])),
    { activeNodeCount: 1, dimmedNodeCount: 0, hiddenNodeCount: 3 },
  );
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

void test("keeps a connected group visible when a separate branch hides its only content", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "GROUP_CHILD_1", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "GROUP_GRANDCHILD", type: "group", x: 400, y: 0, width: 300, height: 200 },
      { id: "D1", type: "text", x: 0, y: 300, width: 80, height: 50 },
      { id: "D2.1", type: "text", x: 420, y: 20, width: 80, height: 50 },
    ],
    edges: [
      { id: "GROUP_BRANCH", fromNode: "GROUP_CHILD_1", toNode: "GROUP_GRANDCHILD" },
      { id: "D_BRANCH", fromNode: "D1", toNode: "D2.1" },
    ],
  });

  const separateBranchFold = deriveCanvasVisibility(
    groupGraph,
    new Set(["D2.1"]),
  );
  assert.deepEqual([...separateBranchFold.hiddenNodeIds], ["D2.1"]);

  const groupBranchFold = deriveCanvasVisibility(
    groupGraph,
    new Set(["GROUP_GRANDCHILD"]),
  );
  assert.deepEqual(
    [...groupBranchFold.hiddenNodeIds],
    ["GROUP_GRANDCHILD", "D2.1"],
  );
});

void test("keeps a group active while it contains an active focused node", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "B", type: "text", x: 150, y: 80, width: 100, height: 80 },
      { id: "O", type: "text", x: 400, y: 20, width: 80, height: 50 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(
    groupGraph,
    new Set(),
    new Set(["G", "B", "O"]),
  );

  assert.deepEqual([...visibility.dimmedNodeIds], ["B", "O"]);
});

void test("dims a group when all of its contained nodes are dimmed", () => {
  const groupGraph = buildCanvasGraph({
    nodes: [
      { id: "G", type: "group", x: 0, y: 0, width: 300, height: 200 },
      { id: "A", type: "text", x: 20, y: 20, width: 80, height: 50 },
      { id: "B", type: "text", x: 150, y: 80, width: 100, height: 80 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(
    groupGraph,
    new Set(),
    new Set(["G", "A", "B"]),
  );

  assert.deepEqual([...visibility.dimmedNodeIds], ["G", "A", "B"]);
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
