import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCanvasEdgeViews,
  extractCanvasPathFromViewState,
  resolveCanvasKey,
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

void test("extracts a canvas path from an Obsidian view state", () => {
  assert.equal(
    extractCanvasPathFromViewState({ file: "Folder/Test.canvas" }),
    "Folder/Test.canvas",
  );
  assert.equal(extractCanvasPathFromViewState(null), undefined);
});

void test("prefers the Canvas view file path for the persistence key", () => {
  assert.equal(
    resolveCanvasKey(
      "Folder/Runtime.canvas",
      "Folder/View.canvas",
      "Other.canvas",
    ),
    "Folder/Runtime.canvas",
  );
  assert.equal(
    resolveCanvasKey(undefined, "Folder/View.canvas", "Other.canvas"),
    "Folder/View.canvas",
  );
  assert.equal(
    resolveCanvasKey(undefined, undefined, "Fallback.canvas"),
    "Fallback.canvas",
  );
  assert.equal(
    resolveCanvasKey(undefined, null, undefined),
    "canvas-view:active",
  );
});

function createElement(): CanvasElementHandle {
  return {
    classList: {
      remove: () => undefined,
      toggle: (_token, force) => force ?? false,
    },
    style: {
      removeProperty: () => "",
      setProperty: () => undefined,
    },
  };
}
