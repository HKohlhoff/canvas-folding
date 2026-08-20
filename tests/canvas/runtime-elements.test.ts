import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCanvasEdgeViews,
  type CanvasElementHandle,
} from "../../src/canvas/runtime-elements";

void test("extracts line, arrow and label wrapper elements from an edge", () => {
  const line = createElement();
  const arrow = createElement();
  const label = createElement();

  const edgeViews = extractCanvasEdgeViews([
    {
      id: "edge-with-label",
      lineGroupEl: line,
      lineEndGroupEl: arrow,
      labelElement: { wrapperEl: label },
    },
  ]);

  assert.equal(edgeViews.length, 1);
  assert.deepEqual(edgeViews[0]?.elements, [line, arrow, label]);
});

function createElement(): CanvasElementHandle {
  return {
    classList: {
      remove: () => undefined,
      toggle: (_token, force) => force ?? false,
    },
  };
}
