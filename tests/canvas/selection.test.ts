import assert from "node:assert/strict";
import test from "node:test";

import {
  removeSelectionByIds,
  type CanvasSelectionRuntime,
} from "../../src/canvas/runtime-elements";

void test("deselects hidden items while retaining visible selection", () => {
  const parent = { id: "parent" };
  const child = { id: "child" };
  const edge = { id: "edge" };
  let updateCount = 0;
  const canvas: CanvasSelectionRuntime = {
    selection: new Set([parent, child, edge]),
    updateSelection: (update) => {
      updateCount += 1;
      update();
    },
  };

  const removedCount = removeSelectionByIds(canvas, new Set(["child", "edge"]));

  assert.equal(removedCount, 2);
  assert.deepEqual([...canvas.selection], [parent]);
  assert.equal(updateCount, 1);
});

void test("does not update selection when every selected item stays visible", () => {
  let updateCount = 0;
  const canvas: CanvasSelectionRuntime = {
    selection: new Set([{ id: "visible" }]),
    updateSelection: (update) => {
      updateCount += 1;
      update();
    },
  };

  assert.equal(removeSelectionByIds(canvas, new Set(["other"])), 0);
  assert.equal(updateCount, 0);
});
