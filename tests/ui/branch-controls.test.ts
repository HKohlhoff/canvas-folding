import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActiveCanvasContext,
  CanvasElementHandle,
  CanvasNodeElementHandle,
} from "../../src/canvas/adapter";
import {
  CanvasNodeControlManager,
  getAdjacentBranchControlId,
  getAdjacentNodeControlKey,
  getNodeControlTabOrder,
  isBranchMenuKeyboardEvent,
} from "../../src/ui/branch-controls";
import type {
  BranchControlModel,
  FocusControlModel,
} from "../../src/ui/control-model";

const BRANCH_MODEL: BranchControlModel = {
  collapsed: false,
  descendantCount: 1,
  nodeId: "A",
};
const FOCUS_MODEL: FocusControlModel = {
  active: false,
  descendantCount: 1,
  nodeId: "A",
};

void test("keeps node controls isolated in two leaves showing the same canvas", () => {
  const manager = new CanvasNodeControlManager();
  const first = createContext("shared.canvas", {});
  const second = createContext("shared.canvas", {});

  sync(manager, first.context);
  sync(manager, second.context);

  assert.equal(first.host.container?.removed, false);
  assert.equal(second.host.container?.removed, false);
});

void test("removes an obsolete control container after a render in the same leaf", () => {
  const manager = new CanvasNodeControlManager();
  const leaf = {};
  const first = createContext("test.canvas", leaf);
  const replacement = createContext("test.canvas", leaf);

  sync(manager, first.context);
  sync(manager, replacement.context);

  assert.equal(first.host.container?.removed, true);
  assert.equal(replacement.host.container?.removed, false);
});

void test("removes controls from every managed leaf during cleanup", () => {
  const manager = new CanvasNodeControlManager();
  const first = createContext("first.canvas", {});
  const second = createContext("second.canvas", {});

  sync(manager, first.context);
  sync(manager, second.context);
  manager.removeAll();

  assert.equal(first.host.container?.removed, true);
  assert.equal(second.host.container?.removed, true);
});

void test("keeps connected controls when the active canvas is temporarily unavailable", () => {
  const manager = new CanvasNodeControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context);
  manager.removeDetached();

  assert.equal(entry.host.container?.removed, false);
});

void test("removes detached controls without affecting another managed leaf", () => {
  const manager = new CanvasNodeControlManager();
  const connectedLeaf = {};
  const detachedLeaf = {};
  const connected = createContext("shared.canvas", connectedLeaf);
  const detached = createContext("shared.canvas", detachedLeaf);

  sync(manager, connected.context);
  sync(manager, detached.context);
  if (detached.host.container !== null) detached.host.container.isConnected = false;
  manager.removeDetached();

  assert.equal(connected.host.container?.removed, false);
  assert.equal(detached.host.container?.removed, true);
  assert.equal(getControlOrderByLeaf(manager).has(connectedLeaf), true);
  assert.equal(getControlOrderByLeaf(manager).has(detachedLeaf), false);
});

void test("does not retain an empty tab order for a leaf without controls", () => {
  const manager = new CanvasNodeControlManager();
  const leaf = {};
  const entry = createContext("test.canvas", leaf);

  manager.sync(
    entry.context,
    [],
    [],
    () => undefined,
    () => undefined,
    () => undefined,
  );

  assert.equal(getControlOrderByLeaf(manager).has(leaf), false);
});

void test("renders focus before branch and keeps their labels independent", () => {
  const manager = new CanvasNodeControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context);

  const container = requireContainer(entry.host);
  assert.deepEqual(
    container.children.map((child) => child.className),
    ["canvas-folding-focus-control", "canvas-folding-branch-control"],
  );
  const focusButton = requireChild(container, "canvas-folding-focus-control");
  const branchButton = requireChild(container, "canvas-folding-branch-control");
  assert.equal(focusButton.attributes.get("aria-label"), "Focus branch with 1 descendant");
  assert.equal(focusButton.attributes.get("aria-pressed"), "false");
  assert.equal(
    branchButton.attributes.get("aria-label"),
    "Collapse branch with 1 descendant. Open the context menu for branch display options.",
  );
  assert.equal(focusButton.tabIndex, 0);
  assert.equal(branchButton.tabIndex, -1);
});

void test("shows a readable hidden-node count on collapsed branches", () => {
  const manager = new CanvasNodeControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context, {
    ...BRANCH_MODEL,
    collapsed: true,
    descendantCount: 123,
    hiddenDescendantCount: 123,
  });

  const button = requireChild(
    requireContainer(entry.host),
    "canvas-folding-branch-control",
  );
  assert.equal(button.textContent, "123");
  assert.equal(button.classes.has("has-hidden-count"), true);
  assert.match(button.attributes.get("aria-label") ?? "", /123 hidden nodes/);
});

void test("renders a focus control for a leaf without a branch control", () => {
  const manager = new CanvasNodeControlManager();
  const entry = createContext("test.canvas", {});

  manager.sync(
    entry.context,
    [],
    [{ active: true, descendantCount: 0, nodeId: "A" }],
    () => undefined,
    () => undefined,
    () => undefined,
  );

  const container = requireContainer(entry.host);
  assert.equal(container.children.length, 1);
  const focusButton = requireChild(container, "canvas-folding-focus-control");
  assert.equal(focusButton.attributes.get("aria-label"), "Exit branch focus");
  assert.equal(focusButton.attributes.get("aria-pressed"), "true");
  assert.equal(focusButton.classes.has("is-active"), true);
});

void test("hides branch and focus controls independently", () => {
  const manager = new CanvasNodeControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context);
  const container = requireContainer(entry.host);
  const originalFocus = requireChild(container, "canvas-folding-focus-control");
  const originalBranch = requireChild(container, "canvas-folding-branch-control");

  manager.sync(
    entry.context,
    [],
    [FOCUS_MODEL],
    () => undefined,
    () => undefined,
    () => undefined,
  );
  assert.equal(container.removed, false);
  assert.equal(originalBranch.removed, true);
  assert.equal(originalFocus.removed, false);

  manager.sync(
    entry.context,
    [BRANCH_MODEL],
    [],
    () => undefined,
    () => undefined,
    () => undefined,
  );
  assert.equal(container.removed, false);
  assert.equal(originalFocus.removed, true);
});

void test("explains descendants hidden by an Advanced Canvas group", () => {
  const manager = new CanvasNodeControlManager();
  const entry = createContext("test.canvas", {});

  sync(manager, entry.context, {
    ...BRANCH_MODEL,
    externallyCollapsedDescendantCount: 1,
  });

  const button = requireChild(
    requireContainer(entry.host),
    "canvas-folding-branch-control",
  );
  assert.match(button.attributes.get("aria-label") ?? "", /Advanced Canvas currently hides/);
  assert.match(button.attributes.get("aria-label") ?? "", /preserves those group states/);
  assert.equal(button.attributes.has("aria-description"), false);
});

void test("recognizes only the context-menu key for the levels menu", () => {
  assert.equal(isBranchMenuKeyboardEvent({ key: "ContextMenu" }), true);
  assert.equal(isBranchMenuKeyboardEvent({ key: "F10" }), false);
  assert.equal(isBranchMenuKeyboardEvent({ key: "Enter" }), false);
});

void test("moves through the mixed node-control order", () => {
  const order = ["ROOT:focus", "ROOT:branch", "LEAF:focus"];

  assert.equal(getAdjacentNodeControlKey(order, "ROOT:focus", false), "ROOT:branch");
  assert.equal(getAdjacentNodeControlKey(order, "LEAF:focus", true), "ROOT:branch");
  assert.equal(getAdjacentNodeControlKey(order, "LEAF:focus", false), null);
  assert.equal(
    getAdjacentBranchControlId(["ROOT", "CHILD"], "ROOT", false),
    "CHILD",
  );
});

void test("starts the node-control order at the selected node", () => {
  const order = ["ROOT", "UPPER", "UPPER_CHILD", "LOWER"];

  assert.deepEqual(
    getNodeControlTabOrder(order, ["UPPER"]),
    ["UPPER", "UPPER_CHILD", "LOWER", "ROOT"],
  );
  assert.equal(getNodeControlTabOrder(order, ["LEAF"]), order);
  assert.equal(getNodeControlTabOrder(order, ["UPPER", "LOWER"]), order);
});

function sync(
  manager: CanvasNodeControlManager,
  context: ActiveCanvasContext,
  branchModel: BranchControlModel = BRANCH_MODEL,
  focusModel: FocusControlModel = FOCUS_MODEL,
): void {
  manager.sync(
    context,
    [branchModel],
    [focusModel],
    () => undefined,
    () => undefined,
    () => undefined,
  );
}

function createContext(
  key: string,
  leaf: object,
): {
  context: ActiveCanvasContext;
  host: FakeNodeElement;
} {
  const host = new FakeNodeElement();
  return {
    host,
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
      nodeViews: [{ element: host, id: "A" }],
      selectedNodeIds: [],
      toolbarHost: { querySelector: () => null } as unknown as HTMLElement,
    },
  };
}

function requireContainer(host: FakeNodeElement): FakeElement {
  assert.ok(host.container !== null);
  return host.container;
}

function requireChild(container: FakeElement, className: string): FakeElement {
  const child = container.children.find((candidate) => candidate.className === className);
  assert.ok(child !== undefined);
  return child;
}

function createClassList(classes: Set<string>): CanvasElementHandle["classList"] {
  return {
    remove: (...tokens) => {
      for (const token of tokens) classes.delete(token);
    },
    toggle: (token, force) => {
      const enabled = force ?? !classes.has(token);
      if (enabled) classes.add(token);
      else classes.delete(token);
      return enabled;
    },
  };
}

function createStyle(): CanvasElementHandle["style"] {
  return {
    removeProperty: () => "",
    setProperty: () => undefined,
  };
}

function getControlOrderByLeaf(
  manager: CanvasNodeControlManager,
): Map<object, readonly string[]> {
  return (
    manager as unknown as { controlOrderByLeaf: Map<object, readonly string[]> }
  ).controlOrderByLeaf;
}

class FakeNodeElement implements CanvasNodeElementHandle {
  readonly classes = new Set<string>();
  readonly classList = createClassList(this.classes);
  readonly style = createStyle();
  container: FakeElement | null = null;

  createDiv(): HTMLDivElement {
    const element = new FakeElement("div");
    this.container = element;
    return element as unknown as HTMLDivElement;
  }

  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
  ): HTMLElementTagNameMap[K] {
    const element = new FakeElement(tag);
    this.container = element;
    return element as unknown as HTMLElementTagNameMap[K];
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  readonly classes = new Set<string>();
  className = "";
  isConnected = true;
  removed = false;
  textContent: string | null = null;
  tabIndex = -1;
  title = "";
  type = "";
  readonly ownerDocument = {} as Document;

  constructor(readonly tagName: string) {}

  get classList(): CanvasElementHandle["classList"] {
    return createClassList(this.classes);
  }

  addEventListener(): void {
    // Event dispatch is outside this manager-state test.
  }

  appendChild(child: FakeElement): FakeElement {
    if (!this.children.includes(child)) this.children.push(child);
    return child;
  }

  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
  ): HTMLElementTagNameMap[K] {
    const element = new FakeElement(tag);
    this.children.push(element);
    return element as unknown as HTMLElementTagNameMap[K];
  }

  focus(): void {
    // Focus movement is covered by the pure ordering helpers.
  }

  getBoundingClientRect(): DOMRect {
    return { bottom: 0, right: 0 } as DOMRect;
  }

  insertBefore(child: FakeElement, before: FakeElement): FakeElement {
    this.children.splice(this.children.indexOf(before), 0, child);
    return child;
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
    if (name === "title") this.title = value;
  }
}
