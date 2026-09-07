import assert from "node:assert/strict";
import test from "node:test";

import type { App } from "obsidian";

import {
  readActiveCanvasContext,
  readActiveCanvasSnapshot,
} from "../../src/canvas/adapter";

void test("reports defensive active-canvas adapter failures", () => {
  const cases: Array<{
    expected: string;
    view: unknown;
  }> = [
    { expected: "no-active-canvas", view: null },
    { expected: "no-active-canvas", view: { getViewType: () => "markdown" } },
    { expected: "canvas-api-unavailable", view: canvasView(undefined) },
    {
      expected: "invalid-data",
      view: canvasView({ getData: () => ({ nodes: "invalid", edges: [] }) }),
    },
  ];

  for (const { expected, view } of cases) {
    const result = readActiveCanvasSnapshot(appWithView(view));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, expected);
  }

  const nonInteractive = readActiveCanvasContext(appWithView(canvasView({
    getData: () => ({ nodes: [], edges: [] }),
  })));
  assert.equal(nonInteractive.ok, false);
  if (!nonInteractive.ok) {
    assert.equal(nonInteractive.reason, "canvas-api-unavailable");
  }
});

void test("composes path, selection, leaf, host, and graph data in one context", () => {
  const selectedNode = { id: "A", nodeEl: nodeElement() };
  const canvas = {
    edges: new Map(),
    getData: () => ({
      nodes: [
        { id: "A", type: "text" },
        { id: "B", type: "text" },
      ],
      edges: [{ id: "AB", fromNode: "A", toNode: "B" }],
    }),
    nodes: new Map(),
    selection: new Set<unknown>([selectedNode]),
    updateSelection(update: () => void) {
      update();
    },
    view: { file: { path: "Preferred.canvas" } },
  };
  const view = canvasView(canvas);
  const result = readActiveCanvasContext(appWithView(view));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.context.key, "Preferred.canvas");
  assert.equal(result.context.leaf, view.leaf);
  assert.equal(result.context.toolbarHost, view.contentEl);
  assert.deepEqual(result.context.selectedNodeIds, ["A"]);
  assert.deepEqual(result.context.data.edges, [
    { id: "AB", fromNode: "A", toNode: "B" },
  ]);
  assert.equal(result.context.deselectItems(new Set(["A"])), 1);
  assert.equal(canvas.selection.size, 0);
});

function appWithView(view: unknown): App {
  return {
    workspace: {
      getActiveFile: () => ({ path: "Active.canvas" }),
      getActiveViewOfType: (_type: unknown) => view,
    },
  } as unknown as App;
}

function canvasView(canvas: unknown) {
  return {
    canvas,
    contentEl: {},
    file: { path: "View.canvas" },
    getState: () => ({ file: "State.canvas" }),
    getViewType: () => "canvas",
    leaf: {
      getViewState: () => ({ state: { file: "Leaf.canvas" } }),
    },
  };
}

function nodeElement() {
  return {
    classList: {
      remove: () => undefined,
      toggle: () => false,
    },
    createDiv: () => ({}),
    createEl: () => ({}),
    style: {
      removeProperty: () => "",
      setProperty: () => undefined,
    },
  };
}
