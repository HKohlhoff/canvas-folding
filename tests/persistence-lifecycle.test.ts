import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createPluginData,
  normalizePluginData,
} from "../src/plugin-data";

void test("preserves saved states through startup normalization and writeback", () => {
  const loaded = normalizePluginData({
    dataVersion: 1,
    settings: { rememberCanvasStates: true },
    canvasStates: {
      "Temporarily unavailable.canvas": {
        visibleDepths: { savedNode: 0 },
        revealedBranches: {},
      },
    },
  });

  const written = createPluginData(
    loaded.settings,
    new Map(Object.entries(loaded.canvasStates)),
    loaded.ui.lastShownReleaseNotesId,
  );

  assert.deepEqual(written.canvasStates, loaded.canvasStates);
});

void test("keeps plugin startup free of destructive state validation", () => {
  const source = readFileSync("src/main.ts", "utf8");
  const onloadStart = source.indexOf("  async onload(): Promise<void> {");
  const initializationEnd = source.indexOf(
    "    this.branchControlsVisible =",
    onloadStart,
  );
  assert.notEqual(onloadStart, -1);
  assert.notEqual(initializationEnd, -1);

  const startupSource = source.slice(onloadStart, initializationEnd);
  assert.doesNotMatch(startupSource, /cleanup|prune/iu);
});

void test("prunes saved filters only from authoritative Canvas file data", () => {
  const source = readFileSync("src/main.ts", "utf8");
  const liveRefreshSource = getMethodSource(
    source,
    "  private refreshActiveCanvasState(",
    "\n  private scheduleActiveCanvasRefresh(",
  );
  const authoritativePruneSource = getMethodSource(
    source,
    "  private async pruneCanvasNodeStates(",
    "\n  private removeCanvasStatePath(",
  );

  assert.doesNotMatch(liveRefreshSource, /\.prune\(/u);
  assert.match(authoritativePruneSource, /cachedRead\(file\)/u);
  assert.match(authoritativePruneSource, /\.prune\(graph\)/u);
  assert.match(authoritativePruneSource, /sessionChanged/u);
});

void test("refreshes the active Canvas after session-state pruning", () => {
  const source = readFileSync("src/main.ts", "utf8");
  const scheduleSource = getMethodSource(
    source,
    "  private scheduleCanvasNodeStatePrune(",
    "\n  private async pruneCanvasNodeStates(",
  );

  assert.match(scheduleSource, /result\.sessionChanged/u);
  assert.match(scheduleSource, /file\.path === this\.activeCanvasPath/u);
  assert.match(scheduleSource, /scheduleActiveCanvasRefresh\(true\)/u);
});

void test("keeps Vault rename and delete handling independent of persistence", () => {
  const source = readFileSync("src/main.ts", "utf8");
  const removeSource = getMethodSource(
    source,
    "  private removeCanvasStatePath(",
    "\n  private renameCanvasStatePath(",
  );
  const renameSource = getMethodSource(
    source,
    "  private renameCanvasStatePath(",
    "\n  private storeCanvasState(",
  );

  assert.match(removeSource, /removePathEntries/iu);
  assert.match(renameSource, /renamePathEntries/iu);
  assert.doesNotMatch(removeSource, /rememberCanvasStates/iu);
  assert.doesNotMatch(renameSource, /rememberCanvasStates/iu);
});

function getMethodSource(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}
