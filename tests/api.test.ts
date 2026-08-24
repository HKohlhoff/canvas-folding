import assert from "node:assert/strict";
import test from "node:test";

import {
  CANVAS_FOLDING_API_VERSION,
  createCanvasFoldStateSnapshot,
  selectCanvasFoldState,
} from "../src/api";
import { buildCanvasGraph } from "../src/tree/graph";

const ACTIVE_DATA = {
  revealedBranches: {},
  visibleDepths: { A: 0 },
};
const PERSISTED_DATA = {
  revealedBranches: {},
  visibleDepths: { B: 0 },
};

void test("exposes API version 1", () => {
  assert.equal(CANVAS_FOLDING_API_VERSION, 1);
});

void test("prefers the matching active leaf state over persistence", () => {
  assert.deepEqual(
    selectCanvasFoldState(
      "Folder/Test.canvas",
      { canvasPath: "Folder/Test.canvas", data: ACTIVE_DATA },
      PERSISTED_DATA,
      true,
    ),
    { data: ACTIVE_DATA, source: "active-leaf" },
  );
});

void test("uses persistence only when no matching active leaf is available", () => {
  assert.deepEqual(
    selectCanvasFoldState(
      "Folder/Test.canvas",
      { canvasPath: "Other.canvas", data: ACTIVE_DATA },
      PERSISTED_DATA,
      true,
    ),
    { data: PERSISTED_DATA, source: "persisted" },
  );
  assert.equal(
    selectCanvasFoldState(
      "Folder/Test.canvas",
      null,
      PERSISTED_DATA,
      false,
    ),
    null,
  );
});

void test("keeps an active default state ahead of an older persisted state", () => {
  const defaultState = { revealedBranches: {}, visibleDepths: {} };

  assert.deepEqual(
    selectCanvasFoldState(
      "Folder/Test.canvas",
      { canvasPath: "Folder/Test.canvas", data: defaultState },
      PERSISTED_DATA,
      true,
    ),
    { data: defaultState, source: "active-leaf" },
  );
});

void test("returns effective hidden nodes and edges without focus dimming", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "A", type: "text", x: -200, y: 20, width: 100, height: 60 },
      { id: "G", type: "group", x: 0, y: 0, width: 400, height: 200 },
      { id: "B", type: "text", x: 20, y: 20, width: 100, height: 60 },
      { id: "C", type: "file", x: 180, y: 20, width: 100, height: 60 },
    ],
    edges: [
      { id: "AB", fromNode: "A", toNode: "B" },
      { id: "BC", fromNode: "B", toNode: "C" },
    ],
  });

  const snapshot = createCanvasFoldStateSnapshot(
    "Folder/Test.canvas",
    "active-leaf",
    {
      focusedNodeId: "B",
      revealedBranches: {},
      visibleDepths: { A: 0 },
    },
    graph,
  );

  assert.deepEqual(snapshot, {
    canvasPath: "Folder/Test.canvas",
    hiddenEdgeIds: ["AB", "BC"],
    hiddenNodeIds: ["B", "C", "G"],
    source: "active-leaf",
  });
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.hiddenNodeIds), true);
  assert.equal(Object.isFrozen(snapshot.hiddenEdgeIds), true);
});
