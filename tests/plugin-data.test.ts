import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePluginData,
  PLUGIN_DATA_VERSION,
  removePathEntries,
  renamePathEntries,
} from "../src/plugin-data";
import { DEFAULT_SETTINGS } from "../src/settings-data";

void test("migrates legacy top-level settings into versioned plugin data", () => {
  assert.deepEqual(normalizePluginData({ debugLogging: true }), {
    dataVersion: PLUGIN_DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS, debugLogging: true },
    canvasStates: {},
  });
});

void test("normalizes saved canvas states defensively", () => {
  assert.deepEqual(
    normalizePluginData({
      settings: { rememberCanvasStates: true },
      canvasStates: {
        "Folder/Test.canvas": {
          visibleDepths: { A: 0, B: 2, invalid: -1 },
          revealedBranches: { A: ["C", "C", 4], missing: ["D"] },
        },
        "Empty.canvas": { visibleDepths: {}, revealedBranches: {} },
      },
    }).canvasStates,
    {
      "Folder/Test.canvas": {
        visibleDepths: { A: 0, B: 2 },
        revealedBranches: { A: ["C"] },
      },
    },
  );
});

void test("retains a persisted global canvas depth without local restrictions", () => {
  const data = normalizePluginData({
    canvasStates: {
      "Folder/Test.canvas": {
        globalVisibleDepth: 2,
        revealedBranches: {},
        visibleDepths: {},
      },
    },
  });

  assert.equal(data.canvasStates["Folder/Test.canvas"]?.globalVisibleDepth, 2);
});

void test("retains a persisted branch focus without collapse restrictions", () => {
  const data = normalizePluginData({
    canvasStates: {
      "Folder/Test.canvas": {
        focusedNodeId: "node-a",
        revealedBranches: {},
        visibleDepths: {},
      },
    },
  });

  assert.equal(data.canvasStates["Folder/Test.canvas"]?.focusedNodeId, "node-a");
});

void test("removes saved states for deleted files and folders", () => {
  const states = new Map([
    ["Folder/A.canvas", 1],
    ["Folder/Nested/B.canvas", 2],
    ["Other.canvas", 3],
  ]);

  assert.equal(removePathEntries(states, "Folder"), 2);
  assert.deepEqual([...states], [["Other.canvas", 3]]);
});

void test("migrates saved states when files or folders are renamed", () => {
  const states = new Map([
    ["Folder/A.canvas", 1],
    ["Folder/Nested/B.canvas", 2],
    ["Other.canvas", 3],
  ]);

  assert.equal(renamePathEntries(states, "Folder", "Moved"), 2);
  assert.deepEqual([...states], [
    ["Other.canvas", 3],
    ["Moved/A.canvas", 1],
    ["Moved/Nested/B.canvas", 2],
  ]);

  assert.equal(renamePathEntries(states, "Other.canvas", "Other.md"), 1);
  assert.equal(states.has("Other.md"), false);
});
