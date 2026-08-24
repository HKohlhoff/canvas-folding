import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

import {
  buildCanvasGraph,
  type CanvasGraphData,
} from "../src/tree/graph";

const FIXTURES = [
  ["manual-tests/01-basic-tree.canvas", 4, 3, 1],
  ["manual-tests/02-multiple-roots-and-isolated.canvas", 6, 3, 3],
  ["manual-tests/03-shared-descendant.canvas", 5, 5, 1],
  ["manual-tests/04-rootless-cycle.canvas", 3, 3, 0],
  ["manual-tests/05-groups-and-node-types.canvas", 6, 4, 2],
  ["examples/Canvas Folding Demo/Canvas Folding Demo.canvas", 24, 15, 10],
] as const;

for (const [relativePath, nodeCount, edgeCount, rootCount] of FIXTURES) {
  void test(`validates Canvas fixture ${relativePath}`, () => {
    const raw = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    const value: unknown = JSON.parse(raw);

    assert.equal(isCanvasGraphData(value), true);
    const graph = buildCanvasGraph(value as CanvasGraphData);
    assert.equal(graph.nodes.length, nodeCount);
    assert.equal(graph.edges.length, edgeCount);
    assert.equal(graph.rootIds.length, rootCount);
    assert.equal(graph.danglingEdgeIds.length, 0);
  });
}

void test("demo Canvas references packaged local files", () => {
  const raw = readFileSync(
    path.join(
      process.cwd(),
      "examples",
      "Canvas Folding Demo",
      "Canvas Folding Demo.canvas",
    ),
    "utf8",
  );
  const value: unknown = JSON.parse(raw);
  assert.equal(isCanvasGraphData(value), true);

  const filePaths = (value as { nodes: unknown[] }).nodes
    .filter(isRecord)
    .filter((node) => node.type === "file")
    .map((node) => node.file);
  assert.deepEqual(filePaths, [
    "Canvas Folding Demo/Demo note.md",
    "Canvas Folding Demo/Demo image.svg",
  ]);
  for (const filePath of filePaths) {
    if (typeof filePath !== "string") {
      assert.fail("Demo Canvas file nodes must contain string paths.");
    }
    assert.equal(
      existsSync(path.join(process.cwd(), "examples", filePath)),
      true,
    );
  }
});

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
