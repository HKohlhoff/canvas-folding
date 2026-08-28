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

void test("returns only the collapsed connection when a shared branch remains reachable", () => {
  const graph = buildCanvasGraph({
    nodes: ["A", "B", "D", "E"].map((id) => ({ id, type: "text" })),
    edges: [
      { id: "AD", fromNode: "A", toNode: "D" },
      { id: "BD", fromNode: "B", toNode: "D" },
      { id: "DE", fromNode: "D", toNode: "E" },
    ],
  });

  assert.deepEqual(
    createCanvasFoldStateSnapshot(
      "Folder/Shared.canvas",
      "active-leaf",
      { revealedBranches: {}, visibleDepths: { B: 0 } },
      graph,
    ),
    {
      canvasPath: "Folder/Shared.canvas",
      hiddenEdgeIds: ["BD"],
      hiddenNodeIds: [],
      source: "active-leaf",
    },
  );
});

void test("includes unconnected contents of a structurally hidden group", () => {
  const graph = buildCanvasGraph({
    nodes: [
      { id: "ROOT", type: "group", x: 0, y: 0, width: 200, height: 160 },
      { id: "GROUP", type: "group", x: 300, y: 0, width: 240, height: 180 },
      { id: "CARD", type: "text", x: 320, y: 20, width: 100, height: 60 },
    ],
    edges: [{ id: "ROOT_GROUP", fromNode: "ROOT", toNode: "GROUP" }],
  });

  const snapshot = createCanvasFoldStateSnapshot(
    "Folder/Groups.canvas",
    "active-leaf",
    { revealedBranches: {}, visibleDepths: { ROOT: 0 } },
    graph,
  );

  assert.deepEqual(snapshot.hiddenNodeIds, ["GROUP", "CARD"]);
  assert.deepEqual(snapshot.hiddenEdgeIds, ["ROOT_GROUP"]);
});

void test("keeps the complete B1 branch when the asymmetric A1 branch collapses", () => {
  const graph = buildCanvasGraph({
    nodes: ["A1", "A2", "B1", "B2", "LEAF"].map((id) => ({
      id,
      type: "text",
    })),
    edges: [
      { id: "A1A2", fromNode: "A1", toNode: "A2" },
      { id: "A1B2", fromNode: "A1", toNode: "B2" },
      { id: "A2B2", fromNode: "A2", toNode: "B2" },
      { id: "B1B2", fromNode: "B1", toNode: "B2" },
      { id: "B2LEAF", fromNode: "B2", toNode: "LEAF" },
    ],
  });

  const snapshot = createCanvasFoldStateSnapshot(
    "Folder/TestCanvas.canvas",
    "active-leaf",
    { revealedBranches: {}, visibleDepths: { A1: 0 } },
    graph,
  );

  assert.equal(snapshot.canvasPath, "Folder/TestCanvas.canvas");
  assert.deepEqual([...snapshot.hiddenEdgeIds].sort(), ["A1A2", "A1B2", "A2B2"]);
  assert.deepEqual(snapshot.hiddenNodeIds, ["A2"]);
  assert.equal(snapshot.source, "active-leaf");
});
