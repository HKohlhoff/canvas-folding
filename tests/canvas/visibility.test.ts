import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActiveCanvasContext,
  CanvasElementHandle,
  CanvasNodeElementHandle,
} from "../../src/canvas/adapter";
import {
  CanvasVisibilityManager,
} from "../../src/canvas/visibility";

void test("hides descendant nodes and every incident edge", () => {
  const elements = createContext();
  const manager = new CanvasVisibilityManager();

  const result = manager.apply(elements.context, new Set(["B"]));

  assert.deepEqual(result, {
    dimmedEdgeCount: 0,
    dimmedNodeCount: 0,
    hiddenEdgeCount: 2,
    hiddenNodeCount: 1,
  });
  assert.equal(elements.nodeB.has("canvas-folding-hidden"), true);
  assert.equal(elements.edgeAB.has("canvas-folding-hidden"), true);
  assert.equal(elements.edgeABLabel.has("canvas-folding-hidden"), true);
  assert.equal(elements.edgeBC.has("canvas-folding-hidden"), true);
});

void test("restores only the class managed by Canvas Folding", () => {
  const elements = createContext();
  const manager = new CanvasVisibilityManager();

  elements.nodeB.add("existing-class");
  manager.apply(elements.context, new Set(["B"]));
  manager.restoreAll();

  assert.equal(elements.nodeB.has("canvas-folding-hidden"), false);
  assert.equal(elements.nodeB.has("existing-class"), true);
});

void test("restores managed classes from replaced render elements", () => {
  const elements = createContext();
  const manager = new CanvasVisibilityManager();
  manager.apply(elements.context, new Set(["B"]));

  const replacementNodeB = new FakeClassList();
  elements.context.nodeViews = elements.context.nodeViews.map((nodeView) =>
    nodeView.id === "B"
      ? { id: "B", element: createNodeElement(replacementNodeB) }
      : nodeView,
  );
  manager.apply(elements.context, new Set(["B"]));

  assert.equal(elements.nodeB.has("canvas-folding-hidden"), false);
  assert.equal(replacementNodeB.has("canvas-folding-hidden"), true);
});

void test("blocks the interaction layer from targeting hidden nodes", () => {
  const { context } = createContext();
  const targetNode = { id: "B" };
  const visibleNode = { id: "A" };
  const interactionLayer = {
    target: targetNode as unknown,
    setTarget(target: unknown): void {
      this.target = target;
    },
  };
  context.nodeInteractionLayer = interactionLayer;

  const manager = new CanvasVisibilityManager();
  manager.apply(context, new Set(["B"]));

  assert.equal(interactionLayer.target, null);
  interactionLayer.setTarget(targetNode);
  assert.equal(interactionLayer.target, null);
  interactionLayer.setTarget(visibleNode);
  assert.equal(interactionLayer.target, visibleNode);

  manager.restoreAll();
  interactionLayer.setTarget(targetNode);
  assert.equal(interactionLayer.target, targetNode);
});

void test("restores an interaction layer replaced during render", () => {
  const { context } = createContext();
  const hiddenNode = { id: "B" };
  const oldLayer = createInteractionLayer(hiddenNode);
  context.nodeInteractionLayer = oldLayer;

  const manager = new CanvasVisibilityManager();
  manager.apply(context, new Set(["B"]));
  assert.equal(oldLayer.target, null);

  const newLayer = createInteractionLayer(hiddenNode);
  context.nodeInteractionLayer = newLayer;
  manager.apply(context, new Set(["B"]));

  oldLayer.setTarget(hiddenNode);
  assert.equal(oldLayer.target, hiddenNode);
  assert.equal(newLayer.target, null);
});

void test("dims and blocks nodes outside branch focus", () => {
  const elements = createContext();
  const manager = new CanvasVisibilityManager();

  const result = manager.apply(
    elements.context,
    new Set(),
    new Set(["A"]),
    35,
  );

  assert.equal(result.dimmedNodeCount, 1);
  assert.equal(result.dimmedEdgeCount, 1);
  assert.equal(elements.nodeA.has("canvas-folding-dimmed"), true);
});

function createContext(): {
  context: ActiveCanvasContext;
  edgeAB: FakeClassList;
  edgeABLabel: FakeClassList;
  edgeBC: FakeClassList;
  nodeA: FakeClassList;
  nodeB: FakeClassList;
} {
  const nodeA = new FakeClassList();
  const nodeB = new FakeClassList();
  const nodeC = new FakeClassList();
  const edgeAB = new FakeClassList();
  const edgeABLabel = new FakeClassList();
  const edgeBC = new FakeClassList();

  return {
    nodeA,
    nodeB,
    edgeAB,
    edgeABLabel,
    edgeBC,
    context: {
    key: "test.canvas",
    leaf: {},
      data: {
        nodes: ["A", "B", "C"].map((id) => ({ id, type: "text" })),
        edges: [
          { id: "AB", fromNode: "A", toNode: "B" },
          { id: "BC", fromNode: "B", toNode: "C" },
        ],
      },
      deselectItems: () => 0,
      selectedNodeIds: [],
      nodeViews: [
        { id: "A", element: createNodeElement(nodeA) },
        { id: "B", element: createNodeElement(nodeB) },
        { id: "C", element: createNodeElement(nodeC) },
      ],
      edgeViews: [
        {
          id: "AB",
          elements: [createElement(edgeAB), createElement(edgeABLabel)],
        },
        { id: "BC", elements: [createElement(edgeBC)] },
      ],
      nodeInteractionLayer: null,
      toolbarHost: {} as HTMLElement,
    },
  };
}

function createElement(classList: FakeClassList): CanvasElementHandle {
  return { classList, style: createStyle() };
}

function createNodeElement(classList: FakeClassList): CanvasNodeElementHandle {
  return {
    classList,
    style: createStyle(),
    createEl: <K extends keyof HTMLElementTagNameMap>(
      _tag: K,
    ): HTMLElementTagNameMap[K] => {
      throw new Error("Node creation is not used by this visibility test.");
    },
  };
}

function createInteractionLayer(target: unknown): {
  target: unknown;
  setTarget(nextTarget: unknown): void;
} {
  return {
    target,
    setTarget(nextTarget: unknown): void {
      this.target = nextTarget;
    },
  };
}

function createStyle(): CanvasElementHandle["style"] {
  return {
    removeProperty: () => "",
    setProperty: () => undefined,
  };
}

class FakeClassList {
  private readonly tokens = new Set<string>();

  add(token: string): void {
    this.tokens.add(token);
  }

  has(token: string): boolean {
    return this.tokens.has(token);
  }

  remove(...tokens: string[]): void {
    for (const token of tokens) {
      this.tokens.delete(token);
    }
  }

  toggle(token: string, force?: boolean): boolean {
    const enabled = force ?? !this.tokens.has(token);
    if (enabled) {
      this.tokens.add(token);
    } else {
      this.tokens.delete(token);
    }
    return enabled;
  }
}
