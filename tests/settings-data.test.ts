import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
} from "../src/settings-data";

void test("uses complete defaults for missing or invalid settings", () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(
    normalizeSettings({
      debugLogging: "yes",
      focusBackgroundOpacity: Number.NaN,
      rememberCanvasStates: 1,
      showBranchControls: null,
      showCanvasToolbar: [],
      showFocusControls: {},
      showStatusNotices: "false",
      toolbarPositionXPercent: Number.POSITIVE_INFINITY,
      toolbarPositionYPixels: "8",
    }),
    DEFAULT_SETTINGS,
  );
});

void test("clamps numeric settings and preserves valid booleans", () => {
  const normalized = normalizeSettings({
    debugLogging: true,
    focusBackgroundOpacity: 100,
    rememberCanvasStates: true,
    showBranchControls: false,
    showCanvasToolbar: false,
    showFocusControls: false,
    showStatusNotices: false,
    toolbarPositionXPercent: -20,
    toolbarPositionYPixels: 9000,
  });

  assert.deepEqual(normalized, {
    debugLogging: true,
    focusBackgroundOpacity: 60,
    rememberCanvasStates: true,
    showBranchControls: false,
    showCanvasToolbar: false,
    showFocusControls: false,
    showStatusNotices: false,
    toolbarPositionXPercent: 0,
    toolbarPositionYPixels: 5000,
  });
});
