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
  ["manual-tests/advanced-canvas/01-nested-groups-and-styles.canvas", 7, 4, 3],
  ["examples/Canvas Folding Demo/Canvas Folding Demo.canvas", 24, 15, 10],
] as const;

void test("advanced fixture preserves nested groups and Advanced Canvas fields", () => {
  const raw = readFileSync(
    path.join(
      process.cwd(),
      "manual-tests",
      "advanced-canvas",
      "01-nested-groups-and-styles.canvas",
    ),
    "utf8",
  );
  const value: unknown = JSON.parse(raw);
  assert.equal(isCanvasGraphData(value), true);

  const nodes = (value as { nodes: unknown[] }).nodes.filter(isRecord);
  const outerGroup = nodes.find(
    (node) => node.label === "Advanced outer group",
  );
  const innerGroup = nodes.find(
    (node) => node.label === "Advanced inner group",
  );
  const firstLevelNode = nodes.find((node) => node.text === "C1");
  const secondLevelNodes = nodes.filter(
    (node) => typeof node.text === "string" && node.text.startsWith("C2."),
  );

  assert.equal(nodes.filter((node) => node.type === "group").length, 2);
  assert.equal(isRecord(outerGroup) && isRecord(innerGroup), true);
  assert.equal(isRecord(firstLevelNode), true);
  assert.equal(secondLevelNodes.length, 3);
  if (!isRecord(outerGroup) || !isRecord(innerGroup)) {
    assert.fail("Advanced fixture groups must be present.");
  }
  assert.equal(isFullyContained(innerGroup, outerGroup), true);
  assert.equal(
    isRecord(firstLevelNode) && isFullyContained(firstLevelNode, outerGroup),
    true,
  );
  assert.equal(
    secondLevelNodes.every((node) => isFullyContained(node, innerGroup)),
    true,
  );
  assert.equal(
    nodes.filter((node) => node.type === "text" && node.dynamicHeight === true)
      .length,
    5,
  );
  assert.deepEqual(
    new Set(
      nodes.flatMap((node) => {
        const styles = isRecord(node.styleAttributes)
          ? node.styleAttributes
          : {};
        return typeof styles.shape === "string" ? [styles.shape] : [];
      }),
    ),
    new Set(["pill", "predefined-process", "database"]),
  );
});

void test("advanced settings profile captures behavior-relevant toggles", () => {
  const raw = readFileSync(
    path.join(
      process.cwd(),
      "manual-tests",
      "advanced-canvas",
      "settings-profile-6.5.4.json",
    ),
    "utf8",
  );
  const value: unknown = JSON.parse(raw);
  assert.equal(isRecord(value), true);
  if (!isRecord(value)) return;

  assert.equal(value.collapsibleGroupsFeatureEnabled, true);
  assert.equal(value.collapsedGroupPreviewOnDrag, true);
  assert.equal(value.nodeStylingFeatureEnabled, true);
  assert.equal(value.edgesStylingFeatureEnabled, true);
  assert.equal(value.autoResizeNodeFeatureEnabled, true);
  assert.equal(value.focusModeFeatureEnabled, true);
  assert.equal(value.floatingEdgeFeatureEnabled, true);
  assert.equal(value.edgeSelectionEnabled, true);
  assert.equal(value.portalsFeatureEnabled, false);
  assert.equal(value.autoFileNodeEdgesFeatureEnabled, false);
});

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
  assert.deepEqual(
    new Set(filePaths),
    new Set([
      "Canvas Folding Demo/Demo note.md",
      "Canvas Folding Demo/Demo image.svg",
    ]),
  );
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

function isFullyContained(
  node: Record<string, unknown>,
  group: Record<string, unknown>,
): boolean {
  const { x: nodeX, y: nodeY, width: nodeWidth, height: nodeHeight } = node;
  const {
    x: groupX,
    y: groupY,
    width: groupWidth,
    height: groupHeight,
  } = group;
  if (
    typeof nodeX !== "number" ||
    typeof nodeY !== "number" ||
    typeof nodeWidth !== "number" ||
    typeof nodeHeight !== "number" ||
    typeof groupX !== "number" ||
    typeof groupY !== "number" ||
    typeof groupWidth !== "number" ||
    typeof groupHeight !== "number"
  ) {
    return false;
  }

  return (
    nodeX >= groupX &&
    nodeY >= groupY &&
    nodeX + nodeWidth <= groupX + groupWidth &&
    nodeY + nodeHeight <= groupY + groupHeight
  );
}
