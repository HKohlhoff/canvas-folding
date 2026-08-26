import assert from "node:assert/strict";
import test from "node:test";

import { CanvasToolbarManager } from "../../src/ui/toolbar";

interface FakeElement {
  isConnected: boolean;
  removed: boolean;
  remove: () => void;
}

interface ToolbarEntry {
  host: FakeElement;
  toolbar: FakeElement;
}

void test("keeps a connected toolbar when the active canvas is temporarily unavailable", () => {
  const manager = new CanvasToolbarManager();
  const leaf = {};
  const entry = createEntry();
  getEntries(manager).set(leaf, entry);

  manager.removeDetached();

  assert.equal(entry.toolbar.removed, false);
  assert.equal(getEntries(manager).has(leaf), true);
});

void test("removes only detached toolbar entries from managed leaves", () => {
  const manager = new CanvasToolbarManager();
  const connectedLeaf = {};
  const detachedHostLeaf = {};
  const detachedToolbarLeaf = {};
  const connected = createEntry();
  const detachedHost = createEntry();
  const detachedToolbar = createEntry();
  detachedHost.host.isConnected = false;
  detachedToolbar.toolbar.isConnected = false;
  getEntries(manager).set(connectedLeaf, connected);
  getEntries(manager).set(detachedHostLeaf, detachedHost);
  getEntries(manager).set(detachedToolbarLeaf, detachedToolbar);

  manager.removeDetached();

  assert.equal(connected.toolbar.removed, false);
  assert.equal(getEntries(manager).has(connectedLeaf), true);
  assert.equal(detachedHost.toolbar.removed, true);
  assert.equal(getEntries(manager).has(detachedHostLeaf), false);
  assert.equal(detachedToolbar.toolbar.removed, true);
  assert.equal(getEntries(manager).has(detachedToolbarLeaf), false);
});

void test("still removes every managed toolbar during full cleanup", () => {
  const manager = new CanvasToolbarManager();
  const first = createEntry();
  const second = createEntry();
  getEntries(manager).set({}, first);
  getEntries(manager).set({}, second);

  manager.removeAll();

  assert.equal(first.toolbar.removed, true);
  assert.equal(second.toolbar.removed, true);
  assert.equal(getEntries(manager).size, 0);
});

function createEntry(): ToolbarEntry {
  return {
    host: createElement(),
    toolbar: createElement(),
  };
}

function createElement(): FakeElement {
  return {
    isConnected: true,
    removed: false,
    remove() {
      this.isConnected = false;
      this.removed = true;
    },
  };
}

function getEntries(manager: CanvasToolbarManager): Map<object, ToolbarEntry> {
  return (manager as unknown as { entries: Map<object, ToolbarEntry> }).entries;
}
