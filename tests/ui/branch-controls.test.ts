import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActiveCanvasContext,
  CanvasElementHandle,
  CanvasNodeElementHandle,
} from "../../src/canvas/adapter";
import {
  CanvasBranchControlManager,
  getAdjacentBranchControlId,
  getBranchControlTabOrder,
  isBranchMenuKeyboardEvent,
} from "../../src/ui/branch-controls";
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

void test("keeps connected controls when the active canvas is temporarily unavailable", () => {
  const manager = new CanvasBranchControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context);
  manager.removeDetached();

  assert.equal(entry.button.removed, false);
});

void test("removes detached controls without affecting another managed leaf", () => {
  const manager = new CanvasBranchControlManager();
  const connectedLeaf = {};
  const detachedLeaf = {};
  const connected = createContext("shared.canvas", connectedLeaf);
  const detached = createContext("shared.canvas", detachedLeaf);

  sync(manager, connected.context);
  sync(manager, detached.context);
  detached.button.isConnected = false;
  manager.removeDetached();

  assert.equal(connected.button.removed, false);
  assert.equal(detached.button.removed, true);
  assert.equal(getNodeOrderByLeaf(manager).has(connectedLeaf), true);
  assert.equal(getNodeOrderByLeaf(manager).has(detachedLeaf), false);
});

void test("does not retain an empty tab order for a leaf without controls", () => {
  const manager = new CanvasBranchControlManager();
  const leaf = {};
  const entry = createContext("test.canvas", leaf);

  manager.sync(
    entry.context,
    [],
    () => undefined,
    () => undefined,
  );

  assert.equal(getNodeOrderByLeaf(manager).has(leaf), false);
});

void test("uses singular descendant labels and exposes the levels menu", () => {
  const manager = new CanvasBranchControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context);

  assert.equal(entry.button.attributes.get("aria-haspopup"), "menu");
  assert.equal(
    entry.button.attributes.get("aria-keyshortcuts"),
    "ContextMenu",
  );
  assert.equal(entry.button.attributes.has("aria-expanded"), false);
  assert.equal(
    entry.button.attributes.get("aria-label"),
    "Collapse branch with 1 descendant. Open the context menu for branch display options.",
  );
  assert.equal(entry.button.title, "");
  assert.equal(entry.button.tabIndex, 0);
});

void test("explains descendants hidden by an Advanced Canvas group", () => {
  const manager = new CanvasBranchControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context, {
    ...MODEL,
    externallyCollapsedDescendantCount: 1,
  });

  assert.match(
    entry.button.attributes.get("aria-label") ?? "",
    /Advanced Canvas currently hides/,
  );
  assert.match(
    entry.button.attributes.get("aria-label") ?? "",
    /preserves those group states/,
  );
  assert.match(
    entry.button.attributes.get("aria-label") ?? "",
    /branch display options/,
  );
  assert.equal(entry.button.attributes.has("aria-description"), false);
  assert.equal(entry.button.title, "");
});

void test("recognizes only the context-menu key for the levels menu", () => {
  assert.equal(isBranchMenuKeyboardEvent({ key: "ContextMenu" }), true);
  assert.equal(isBranchMenuKeyboardEvent({ key: "F10" }), false);
  assert.equal(isBranchMenuKeyboardEvent({ key: "Enter" }), false);
});

void test("moves through the depth-first branch-control order", () => {
  const order = ["ROOT", "UPPER", "UPPER_CHILD", "LOWER"];

  assert.equal(getAdjacentBranchControlId(order, "UPPER", false), "UPPER_CHILD");
  assert.equal(getAdjacentBranchControlId(order, "LOWER", true), "UPPER_CHILD");
  assert.equal(getAdjacentBranchControlId(order, "LOWER", false), null);
});

void test("starts the tab order at the single selected parent control", () => {
  const order = ["ROOT", "UPPER", "UPPER_CHILD", "LOWER"];

  assert.deepEqual(
    getBranchControlTabOrder(order, ["UPPER"]),
    ["UPPER", "UPPER_CHILD", "LOWER", "ROOT"],
  );
  assert.equal(getBranchControlTabOrder(order, ["LEAF"]), order);
  assert.equal(getBranchControlTabOrder(order, ["UPPER", "LOWER"]), order);
});

function sync(
  manager: CanvasBranchControlManager,
  context: ActiveCanvasContext,
  model: BranchControlModel = MODEL,
): void {
  manager.sync(
    context,
    [model],
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

function getNodeOrderByLeaf(
  manager: CanvasBranchControlManager,
): Map<object, readonly string[]> {
  return (
    manager as unknown as { nodeOrderByLeaf: Map<object, readonly string[]> }
  ).nodeOrderByLeaf;
}

class FakeButton {
  readonly attributes = new Map<string, string>();
  className = "";
  isConnected = true;
  removed = false;
  textContent: string | null = null;
  tabIndex = -1;
  title = "";
  type = "";
  readonly ownerDocument = {} as Document;

  addEventListener(): void {
    // Event dispatch is outside this manager-state test.
  }

  remove(): void {
    this.removed = true;
    this.isConnected = false;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name === "title") this.title = "";
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}
