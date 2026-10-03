import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActiveCanvasContext,
  CanvasGroupGeometryView,
} from "../../src/canvas/adapter";
import { CanvasGroupGeometryManager } from "../../src/canvas/group-geometry";

void test("anchors collapsed group edges to the group label", () => {
  const manager = new CanvasGroupGeometryManager();
  const { context, moved, runtime } = createContext();

  manager.sync(context, new Set(["GROUP"]));

  assert.deepEqual(runtime.getBBox(), {
    minX: 10,
    minY: 20,
    maxX: 110,
    maxY: 50,
  });
  assert.equal(moved.length, 1);
});

void test("restores the original group geometry when expanded", () => {
  const manager = new CanvasGroupGeometryManager();
  const { context, moved, originalGetBBox, runtime } = createContext();

  manager.sync(context, new Set(["GROUP"]));
  manager.sync(context, new Set());

  assert.equal(Reflect.get(runtime, "getBBox"), originalGetBBox);
  assert.deepEqual(runtime.getBBox(), {
    minX: 0,
    minY: 0,
    maxX: 400,
    maxY: 300,
  });
  assert.equal(moved.length, 2);
});

void test("restores inherited geometry without leaving an instance override", () => {
  const manager = new CanvasGroupGeometryManager();
  const moved: unknown[] = [];
  const prototype = {
    getBBox: () => ({ minX: 0, minY: 0, maxX: 400, maxY: 300 }),
  };
  const runtime = Object.create(prototype) as CanvasGroupGeometryView["runtime"];
  const context = contextWithView(createView(runtime, moved));

  manager.sync(context, new Set(["GROUP"]));
  assert.equal(Object.prototype.hasOwnProperty.call(runtime, "getBBox"), true);
  manager.restoreAll();

  assert.equal(Object.prototype.hasOwnProperty.call(runtime, "getBBox"), false);
  assert.equal(
    Reflect.get(runtime, "getBBox"),
    Reflect.get(prototype, "getBBox"),
  );
});

void test("recalculates managed group edges after its header controls render", () => {
  const manager = new CanvasGroupGeometryManager();
  const { context, moved } = createContext();

  manager.sync(context, new Set(["GROUP"]));
  manager.refresh(context);

  assert.equal(moved.length, 2);
});

function createContext(): {
  context: ActiveCanvasContext;
  moved: unknown[];
  originalGetBBox: CanvasGroupGeometryView["runtime"]["getBBox"];
  runtime: CanvasGroupGeometryView["runtime"];
} {
  const moved: unknown[] = [];
  const originalGetBBox = () => ({
    minX: 0,
    minY: 0,
    maxX: 400,
    maxY: 300,
  });
  const runtime = { getBBox: originalGetBBox };
  return {
    context: contextWithView(createView(runtime, moved)),
    moved,
    originalGetBBox,
    runtime,
  };
}

function createView(
  runtime: CanvasGroupGeometryView["runtime"],
  moved: unknown[],
): CanvasGroupGeometryView {
  return {
    id: "GROUP",
    getLabelBounds: () => ({ bottom: 50, left: 10, right: 110, top: 20 }),
    markMoved: () => moved.push(runtime),
    runtime,
    toCanvasPosition: (point) => point,
  };
}

function contextWithView(view: CanvasGroupGeometryView): ActiveCanvasContext {
  return {
    key: "test.canvas",
    leaf: {},
    data: { nodes: [], edges: [] },
    deselectItems: () => 0,
    selectedNodeIds: [],
    nodeViews: [],
    edgeViews: [],
    groupGeometryViews: [view],
    nodeInteractionLayer: null,
    toolbarHost: {} as HTMLElement,
  };
}
