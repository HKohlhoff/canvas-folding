import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActiveCanvasContext,
  CanvasElementHandle,
  CanvasNodeElementHandle,
} from "../../src/canvas/adapter";
import { CanvasBranchControlManager } from "../../src/ui/branch-controls";
import type { BranchControlModel } from "../../src/ui/control-model";

const MODEL: BranchControlModel = {
  collapsed: false,
  descendantCount: 1,
  nodeId: "A",
};

void test("keeps controls isolated in two leaves showing the same canvas", () => {
  const manager = new CanvasBranchControlManager();
  const first = createContext("shared.canvas", {});
  const second = createContext("shared.canvas", {});

  sync(manager, first.context);
  sync(manager, second.context);

  assert.equal(first.button.removed, false);
  assert.equal(second.button.removed, false);
});

void test("removes an obsolete control after a render in the same leaf", () => {
  const manager = new CanvasBranchControlManager();
  const leaf = {};
  const first = createContext("test.canvas", leaf);
  const replacement = createContext("test.canvas", leaf);

  sync(manager, first.context);
  sync(manager, replacement.context);

  assert.equal(first.button.removed, true);
  assert.equal(replacement.button.removed, false);
});

void test("removes controls from every managed leaf during cleanup", () => {
  const manager = new CanvasBranchControlManager();
  const first = createContext("first.canvas", {});
  const second = createContext("second.canvas", {});

  sync(manager, first.context);
  sync(manager, second.context);
  manager.removeAll();

  assert.equal(first.button.removed, true);
  assert.equal(second.button.removed, true);
});

function sync(
  manager: CanvasBranchControlManager,
  context: ActiveCanvasContext,
): void {
  manager.sync(
    context,
    [MODEL],
    () => undefined,
    () => undefined,
  );
}

function createContext(
  key: string,
  leaf: object,
): {
  button: FakeButton;
  context: ActiveCanvasContext;
} {
  const button = new FakeButton();
  const nodeElement = createNodeElement(button);
  return {
    button,
    context: {
      data: {
        edges: [{ id: "AB", fromNode: "A", toNode: "B" }],
        nodes: [
          { id: "A", type: "text" },
          { id: "B", type: "text" },
        ],
      },
      deselectItems: () => 0,
      edgeViews: [],
      key,
      leaf,
      nodeInteractionLayer: null,
      nodeViews: [{ element: nodeElement, id: "A" }],
      selectedNodeIds: [],
      toolbarHost: {} as HTMLElement,
    },
  };
}

function createNodeElement(button: FakeButton): CanvasNodeElementHandle {
  return {
    classList: createClassList(),
    createEl: <K extends keyof HTMLElementTagNameMap>(
      _tag: K,
    ): HTMLElementTagNameMap[K] =>
      button as unknown as HTMLElementTagNameMap[K],
    style: createStyle(),
  };
}

function createClassList(): CanvasElementHandle["classList"] {
  return {
    remove: () => undefined,
    toggle: (_token, force) => force ?? false,
  };
}

function createStyle(): CanvasElementHandle["style"] {
  return {
    removeProperty: () => "",
    setProperty: () => undefined,
  };
}

class FakeButton {
  className = "";
  removed = false;
  textContent: string | null = null;
  title = "";
  type = "";
  readonly ownerDocument = {} as Document;

  addEventListener(): void {
    // Event dispatch is outside this manager-state test.
  }

  remove(): void {
    this.removed = true;
  }

  setAttribute(): void {
    // Attribute values are outside this manager-state test.
  }
}
