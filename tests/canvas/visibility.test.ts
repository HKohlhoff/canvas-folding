import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActiveCanvasContext,
  CanvasElementHandle,
} from "../../src/canvas/adapter";
import { CanvasVisibilityManager } from "../../src/canvas/visibility";

void test("hides descendant nodes and every incident edge", () => {
  const elements = createContext();
  const manager = new CanvasVisibilityManager();

  const result = manager.apply(elements.context, new Set(["B"]));

  assert.deepEqual(result, { hiddenEdgeCount: 2, hiddenNodeCount: 1 });
  assert.equal(elements.nodeB.has("canvas-tree-hidden"), true);
  assert.equal(elements.edgeAB.has("canvas-tree-hidden"), true);
  assert.equal(elements.edgeBC.has("canvas-tree-hidden"), true);
});

void test("restores only the class managed by Canvas Tree", () => {
  const elements = createContext();
  const manager = new CanvasVisibilityManager();

  elements.nodeB.add("existing-class");
  manager.apply(elements.context, new Set(["B"]));
  manager.restoreAll();

  assert.equal(elements.nodeB.has("canvas-tree-hidden"), false);
  assert.equal(elements.nodeB.has("existing-class"), true);
});

function createContext(): {
  context: ActiveCanvasContext;
  edgeAB: FakeClassList;
  edgeBC: FakeClassList;
  nodeB: FakeClassList;
} {
  const nodeA = new FakeClassList();
  const nodeB = new FakeClassList();
  const nodeC = new FakeClassList();
  const edgeAB = new FakeClassList();
  const edgeBC = new FakeClassList();

  return {
    nodeB,
    edgeAB,
    edgeBC,
    context: {
      key: "test.canvas",
      data: {
        nodes: ["A", "B", "C"].map((id) => ({ id, type: "text" })),
        edges: [
          { id: "AB", fromNode: "A", toNode: "B" },
          { id: "BC", fromNode: "B", toNode: "C" },
        ],
      },
      selectedNodeIds: [],
      nodeViews: [
        { id: "A", element: createElement(nodeA) },
        { id: "B", element: createElement(nodeB) },
        { id: "C", element: createElement(nodeC) },
      ],
      edgeViews: [
        { id: "AB", elements: [createElement(edgeAB)] },
        { id: "BC", elements: [createElement(edgeBC)] },
      ],
    },
  };
}

function createElement(classList: FakeClassList): CanvasElementHandle {
  return { classList };
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
