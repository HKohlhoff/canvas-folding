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

void test("restores collapsed Canvas records through the runtime", () => {
  let runtimeData: unknown = {
    nodes: [{
      id: "GROUP",
      type: "group",
      x: 100,
      y: 200,
      collapsedData: {
        nodes: [{ id: "CHILD", type: "text", x: 20, y: 30 }],
        edges: [],
      },
    }],
    edges: [],
  };
  let saveRequested = false;
  const canvas = {
    edges: new Map(),
    getData: () => runtimeData,
    nodes: new Map(),
    requestSave: () => {
      saveRequested = true;
    },
    selection: new Set(),
    setData: (data: unknown) => {
      runtimeData = data;
    },
    updateSelection: (update: () => void) => update(),
  };
  const result = readActiveCanvasContext(appWithView(canvasView(canvas)));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.context.restoreCollapsedGroups?.(), true);
  assert.equal(saveRequested, true);
  assert.deepEqual(runtimeData, {
    nodes: [
      { id: "GROUP", type: "group", x: 100, y: 200 },
      { id: "CHILD", type: "text", x: 120, y: 230 },
    ],
    edges: [],
  });
  assert.equal(result.context.restoreCollapsedGroups?.(), false);
});

void test("reloads expanded data when a stale hook masks runtime collapsed data", () => {
  const expandedData = {
    nodes: [
      { id: "GROUP", type: "group", x: 100, y: 200 },
      { id: "CHILD", type: "text", x: 120, y: 230 },
    ],
    edges: [],
  };
  let appliedData: unknown;
  const movedNodes: unknown[] = [];
  const runtimeGroup = {
    getData: () => ({
      id: "GROUP",
      type: "group",
      collapsedData: { nodes: [{ id: "CHILD" }], edges: [] },
    }),
    id: "GROUP",
    nodeEl: nodeElement(),
  };
  const canvas = {
    edges: new Map(),
    getData: () => expandedData,
    markMoved: (node: unknown) => movedNodes.push(node),
    nodes: new Map([["GROUP", runtimeGroup]]),
    selection: new Set(),
    setData: (data: unknown) => {
      appliedData = data;
    },
    updateSelection: (update: () => void) => update(),
  };
  const result = readActiveCanvasContext(appWithView(canvasView(canvas)));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.context.restoreCollapsedGroups?.(), true);
  assert.equal(appliedData, expandedData);
  assert.deepEqual(movedNodes, [runtimeGroup]);
});

void test("uses the complete folding header for collapsed group geometry", () => {
  const groupControl = {
    getBoundingClientRect: () => ({
      bottom: 60,
      left: 120,
      right: 160,
      top: 20,
    }),
  };
  const runtimeGroup = {
    getBBox: () => ({ minX: 0, minY: 0, maxX: 400, maxY: 300 }),
    getData: () => ({ id: "GROUP", type: "group" }),
    id: "GROUP",
    labelEl: {
      classList: nodeElement().classList,
      getBoundingClientRect: () => ({
        bottom: 60,
        left: 20,
        right: 120,
        top: 20,
      }),
      insertAdjacentElement: () => null,
      offsetHeight: 40,
      offsetWidth: 100,
      style: nodeElement().style,
    },
    nodeEl: {
      ...nodeElement(),
      querySelector: (selector: string) =>
        selector === ":scope > .canvas-folding-group-control-host"
          ? groupControl
          : null,
    },
  };
  const canvas = {
    edges: new Map(),
    getData: () => ({
      nodes: [{ id: "GROUP", type: "group" }],
      edges: [],
    }),
    markMoved: () => undefined,
    nodes: new Map([["GROUP", runtimeGroup]]),
    posFromClient: (point: { x: number; y: number }) => point,
    selection: new Set(),
    updateSelection: (update: () => void) => update(),
  };
  const result = readActiveCanvasContext(appWithView(canvasView(canvas)));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.context.groupGeometryViews?.[0]?.getLabelBounds(), {
    bottom: 60,
    left: 20,
    right: 160,
    top: 20,
  });
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
