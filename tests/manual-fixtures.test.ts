import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  buildCanvasGraph,
  type CanvasGraphData,
} from "../src/tree/graph";

const FIXTURES = [
  ["01-basic-tree.canvas", 4, 3, 1],
  ["02-multiple-roots-and-isolated.canvas", 6, 3, 3],
  ["03-shared-descendant.canvas", 5, 5, 1],
  ["04-rootless-cycle.canvas", 3, 3, 0],
  ["05-groups-and-node-types.canvas", 6, 4, 2],
] as const;

for (const [fileName, nodeCount, edgeCount, rootCount] of FIXTURES) {
  void test(`validates manual Canvas fixture ${fileName}`, () => {
    const raw = readFileSync(
      path.join(process.cwd(), "manual-tests", fileName),
      "utf8",
    );
    const value: unknown = JSON.parse(raw);

    assert.equal(isCanvasGraphData(value), true);
    const graph = buildCanvasGraph(value as CanvasGraphData);
    assert.equal(graph.nodes.length, nodeCount);
    assert.equal(graph.edges.length, edgeCount);
    assert.equal(graph.rootIds.length, rootCount);
    assert.equal(graph.danglingEdgeIds.length, 0);
  });
}

function isCanvasGraphData(value: unknown): value is CanvasGraphData {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return false;
  }
  return value.nodes.every(
    (node) => isRecord(node) && typeof node.id === "string" && typeof node.type === "string",
  ) && value.edges.every(
    (edge) =>
      isRecord(edge) &&
      typeof edge.id === "string" &&
      typeof edge.fromNode === "string" &&
      typeof edge.toNode === "string",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
