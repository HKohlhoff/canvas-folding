import assert from "node:assert/strict";
import test from "node:test";

import {
  createPluginData,
  discardSessionStatesForPersistenceEnable,
  getSortedCanvasStatePaths,
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
    ui: { lastShownReleaseNotesId: "" },
  });
});

void test("normalizes the transient release-note marker", () => {
  assert.equal(
    normalizePluginData({
      settings: {},
      ui: { lastShownReleaseNotesId: " release-1.1.0 " },
    }).ui.lastShownReleaseNotesId,
    "release-1.1.0",
  );
  assert.equal(
    normalizePluginData({ ui: { lastShownReleaseNotesId: 4 } })
      .ui.lastShownReleaseNotesId,
    "",
  );
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

void test("retains saved canvas states across a plugin data version update", () => {
  const data = normalizePluginData({
    dataVersion: 1,
    settings: { rememberCanvasStates: true },
    canvasStates: {
      "Folder/Test.canvas": {
        visibleDepths: { A: 0 },
        revealedBranches: {},
      },
    },
  });

  assert.deepEqual(data.canvasStates, {
    "Folder/Test.canvas": {
      visibleDepths: { A: 0 },
      revealedBranches: {},
    },
  });
  assert.equal(data.dataVersion, PLUGIN_DATA_VERSION);
});

void test("writes saved canvas states while persistence is disabled", () => {
  const savedState = {
    visibleDepths: { A: 0 },
    revealedBranches: {},
  };
  const data = createPluginData(
    { ...DEFAULT_SETTINGS, rememberCanvasStates: false },
    new Map([["Folder/Test.canvas", savedState]]),
    "release-1.2.1",
  );

  assert.deepEqual(data.canvasStates, {
    "Folder/Test.canvas": savedState,
  });
  assert.equal(data.settings.rememberCanvasStates, false);
});

void test("discards all off-phase changes before restoring persistence", () => {
  const changedWhileOff = { source: "off-phase" };
  const newCanvasState = { source: "new-canvas" };
  const firstLeafStates = new Map([
    ["Saved.canvas", changedWhileOff],
    ["New.canvas", newCanvasState],
  ]);
  const secondLeafStates = new Map([
    ["Saved.canvas", changedWhileOff],
  ]);
  discardSessionStatesForPersistenceEnable(
    [firstLeafStates, secondLeafStates],
  );

  assert.equal(firstLeafStates.size, 0);
  assert.equal(secondLeafStates.size, 0);
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

void test("sorts persisted canvas paths for the settings manager", () => {
  const states = new Map([
    ["Z.canvas", 1],
    ["Folder/B.canvas", 2],
    ["Folder/A.canvas", 3],
  ]);

  assert.deepEqual(getSortedCanvasStatePaths(states), [
    "Folder/A.canvas",
    "Folder/B.canvas",
    "Z.canvas",
  ]);
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
