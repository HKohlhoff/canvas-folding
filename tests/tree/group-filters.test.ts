import assert from "node:assert/strict";
import test from "node:test";

import {
  getGroupLabelCounts,
  getMatchingGroupIds,
  normalizeHiddenGroupLabels,
} from "../../src/tree/group-filters";
import { buildCanvasGraph } from "../../src/tree/graph";
import { deriveCanvasVisibility } from "../../src/tree/visibility";

const nodes = [
  { id: "G1", type: "group", label: " Orte " },
  { id: "G2", type: "group", label: "Szenen" },
  { id: "G3", type: "group", label: "Orte" },
  { id: "G4", type: "group", label: "  " },
  { id: "T1", type: "text", label: "Orte" },
];

void test("returns unique sorted named-group labels with counts", () => {
  assert.deepEqual(getGroupLabelCounts(nodes), [
    { count: 2, label: "Orte" },
    { count: 1, label: "Szenen" },
  ]);
});

void test("matches only group ids with normalized hidden labels", () => {
  assert.deepEqual(
    [...getMatchingGroupIds(nodes, [" Orte ", "missing"])],
    ["G1", "G3"],
  );
});

void test("normalizes, deduplicates, and sorts persisted labels", () => {
  assert.deepEqual(
    normalizeHiddenGroupLabels([" Szenen ", "", "Orte", "Orte", 4]),
    ["Orte", "Szenen"],
  );
  assert.deepEqual(normalizeHiddenGroupLabels("Orte"), []);
});

void test("recomputes duplicate label matches when a new group appears", () => {
  const hiddenLabels = new Set(["Orte"]);

  assert.deepEqual(
    [...getMatchingGroupIds(nodes, hiddenLabels)],
    ["G1", "G3"],
  );
  assert.deepEqual(
    [...getMatchingGroupIds([
      ...nodes,
      { id: "G5", type: "group", label: "Orte" },
    ], hiddenLabels)],
    ["G1", "G3", "G5"],
  );
});

void test("hides nested matching groups, their contents, and every incident edge", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "OUTER", type: "group", label: "Kapitel", x: 0, y: 0, width: 500, height: 400 },
      { id: "INNER", type: "group", label: "Orte", x: 20, y: 20, width: 200, height: 180 },
      { id: "PLACE", type: "text", x: 40, y: 50, width: 100, height: 60 },
      { id: "OTHER", type: "text", x: 600, y: 50, width: 100, height: 60 },
    ],
    edges: [
      { id: "IN", fromNode: "OTHER", toNode: "PLACE" },
      { id: "GROUP", fromNode: "OUTER", toNode: "INNER" },
    ],
  });

  const visibility = deriveCanvasVisibility(
    graph,
    getMatchingGroupIds(graph.nodes, ["Orte"]),
  );

  assert.deepEqual([...visibility.hiddenNodeIds], ["INNER", "PLACE"]);
  assert.deepEqual([...visibility.hiddenEdgeIds], ["IN", "GROUP"]);
});

void test("does not absorb nodes or groups that only overlap a filtered group", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "FILTERED", type: "group", label: "Orte", x: 0, y: 0, width: 100, height: 100 },
      { id: "OVERLAP_GROUP", type: "group", label: "Szenen", x: 80, y: 0, width: 100, height: 100 },
      { id: "OVERLAP_NODE", type: "text", x: 80, y: 20, width: 50, height: 50 },
      { id: "CONTAINED", type: "text", x: 20, y: 20, width: 40, height: 40 },
    ],
    edges: [],
  });

  const visibility = deriveCanvasVisibility(
    graph,
    getMatchingGroupIds(graph.nodes, ["Orte"]),
  );

  assert.deepEqual([...visibility.hiddenNodeIds], ["FILTERED", "CONTAINED"]);
});
