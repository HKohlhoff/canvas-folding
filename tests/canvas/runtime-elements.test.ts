import assert from "node:assert/strict";
import test from "node:test";

import {
  extractCanvasEdgeViews,
  extractCanvasNodeViews,
  extractCanvasPathFromViewState,
  resolveCanvasKey,
  type CanvasElementHandle,
} from "../../src/canvas/runtime-elements";

void test("recognizes an externally collapsed group defensively", () => {
  const nodeViews = extractCanvasNodeViews([
    {
      getData: () => ({
        collapsed: true,
        collapsedData: { nodes: [{ id: "CHILD" }] },
        type: "group",
      }),
      id: "GROUP",
      nodeEl: createNodeElement(),
    },
    {
      getData: () => ({ collapsed: true, type: "text" }),
      id: "TEXT",
      nodeEl: createNodeElement(),
    },
  ]);

  assert.deepEqual(nodeViews[0]?.externallyCollapsedNodeIds, ["CHILD"]);
  assert.equal(nodeViews[1]?.externallyCollapsedNodeIds, undefined);
});

void test("extracts all visible and interactive elements from an edge", () => {
  const line = createElement();
  const arrow = createElement();
  const interaction = createElement();
  const label = createElement();

  const edgeViews = extractCanvasEdgeViews([
    {
      id: "edge-with-label",
      lineGroupEl: line,
      lineEndGroupEl: arrow,
      path: { interaction },
      labelElement: { wrapperEl: label },
    },
  ]);

  assert.equal(edgeViews.length, 1);
  assert.deepEqual(edgeViews[0]?.elements, [line, arrow, interaction, label]);
});

void test("annotates valid portal runtime views with their outer visibility owner", () => {
  const nestedRuntimeId = "acportal||PORTAL||NESTED||child";
  const nodeViews = extractCanvasNodeViews([
    {
      id: nestedRuntimeId,
      nodeEl: createNodeElement(),
    },
  ]);
  const edgeViews = extractCanvasEdgeViews([
    {
      id: "acportal||PORTAL||edge",
      lineGroupEl: createElement(),
    },
  ]);

  assert.equal(nodeViews[0]?.visibilityOwnerNodeId, "PORTAL");
  assert.equal(edgeViews[0]?.visibilityOwnerNodeId, "PORTAL");
});

void test("does not annotate malformed or unanchored portal runtime ids", () => {
  const ids = [
    "prefix-acportal||PORTAL||child",
    "acportal||||child",
    "acportal||PORTAL||",
    "acportal||PORTAL",
  ];
  const nodeViews = extractCanvasNodeViews(
    ids.map((id) => ({ id, nodeEl: createNodeElement() })),
  );

  assert.deepEqual(
    nodeViews.map((view) => view.visibilityOwnerNodeId),
    [undefined, undefined, undefined, undefined],
  );
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

function createNodeElement(): CanvasElementHandle & {
  createEl(): HTMLElement;
} {
  return {
    ...createElement(),
    createEl: () => ({}) as HTMLElement,
  };
}
