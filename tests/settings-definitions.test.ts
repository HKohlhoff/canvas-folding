import assert from "node:assert/strict";
import test from "node:test";

import { getCanvasFoldingSettingDefinitions } from "../src/settings-definitions";

const plugin = {
  cleanupSavedCanvasStates: async () => {},
  clearSavedCanvasStates: async () => {},
  hasSavedCanvasStates: () => false,
};

void test("starts settings with a non-destructive Canvas notice", () => {
  const definitions = getCanvasFoldingSettingDefinitions(plugin);
  const notice = definitions[0];
  assert.ok(notice !== undefined && !("type" in notice));
  assert.equal(notice.name, "Canvas files are never modified");
  if (typeof notice.desc !== "string") {
    assert.fail("The Canvas safety notice must use a text description.");
  }
  assert.match(notice.desc, /never writes.*\.canvas files/i);
});

void test("orders behavior settings by the user workflow", () => {
  const definitions = getCanvasFoldingSettingDefinitions(plugin);
  const behavior = definitions[1];
  assert.ok(behavior !== undefined && "type" in behavior);
  assert.equal(behavior.type, "group");
  assert.deepEqual(
    behavior.items?.map((item) => item.name),
    [
      "Show canvas toolbar initially",
      "Show branch controls initially",
      "Background opacity during branch focus",
      "Remember canvas states between sessions",
      "Show status notices",
    ],
  );
});
