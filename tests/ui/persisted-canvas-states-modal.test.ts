import assert from "node:assert/strict";
import test from "node:test";

import type { App } from "obsidian";

import {
  getPersistedCanvasName,
  PersistedCanvasStatesModal,
  sortPersistedCanvasStatePaths,
  type PersistedCanvasStatesModalHost,
} from "../../src/ui/persisted-canvas-states-modal";

interface RenderedButton {
  destructive: boolean;
  disabled: boolean;
  onClickCallback: (() => void | Promise<void>) | null;
  text: string;
}

interface RenderedSetting {
  buttons: RenderedButton[];
  controlEl: RenderedElement;
  desc: string;
  descEl: RenderedElement;
  name: string;
  nameEl: RenderedElement;
  settingEl: RenderedElement;
}

interface RenderedModal {
  contentEl: {
    children: RenderedElement[];
    settings: RenderedSetting[];
  };
  title: string;
}

interface RenderedElement {
  attributes: Map<string, string>;
  children: RenderedElement[];
  classes: Set<string>;
  click(): void;
  settings: RenderedSetting[];
  textContent: string;
}

void test("renders every saved state without cleanup side effects", () => {
  const paths = ["Unavailable.canvas"];
  const modal = createModal({
    getPaths: () => paths,
  });

  modal.onOpen();

  const rendered = getRenderedModal(modal);
  assert.equal(rendered.title, "Manage persisted canvas states");
  assert.deepEqual(
    getStateList(rendered).settings.map((setting) => setting.name),
    ["Unavailable"],
  );
});

void test("derives Canvas names and sorts by Canvas or path", () => {
  const paths = [
    "Zeta/Canvas 10.canvas",
    "Alpha/Canvas 2.canvas",
    "Folder/Other.canvas",
  ];

  assert.equal(getPersistedCanvasName("Folder/Project.canvas"), "Project");
  assert.deepEqual(
    sortPersistedCanvasStatePaths(paths, "canvas", "asc"),
    ["Alpha/Canvas 2.canvas", "Zeta/Canvas 10.canvas", "Folder/Other.canvas"],
  );
  assert.deepEqual(
    sortPersistedCanvasStatePaths(paths, "path", "desc"),
    ["Zeta/Canvas 10.canvas", "Folder/Other.canvas", "Alpha/Canvas 2.canvas"],
  );
});

void test("reverses Canvas sorting when its header is clicked", async () => {
  const modal = createModal({
    getPaths: () => ["Folder/B.canvas", "Folder/A.canvas"],
  });

  modal.onOpen();
  await settleAsyncRender();
  let rendered = getRenderedModal(modal);
  let list = getStateList(rendered);
  assert.deepEqual(
    list.settings.map((setting) => setting.name),
    ["A", "B"],
  );
  assert.equal(list.attributes.get("role"), "table");
  assert.equal(list.attributes.get("aria-label"), "Persisted canvas states");
  assert.deepEqual(
    list.settings.map((setting) => [
      setting.settingEl.attributes.get("role"),
      setting.nameEl.attributes.get("role"),
      setting.descEl.attributes.get("role"),
      setting.controlEl.attributes.get("role"),
    ]),
    [
      ["row", "cell", "cell", "cell"],
      ["row", "cell", "cell", "cell"],
    ],
  );
  const header = list.children.find((child) =>
    child.classes.has("canvas-folding-persisted-states-header")
  );
  assert.ok(header !== undefined);
  assert.equal(header.attributes.get("role"), "row");
  assert.deepEqual(
    header.children.map((column) => column.attributes.get("role")),
    ["columnheader", "columnheader", "columnheader"],
  );
  assert.deepEqual(
    header.children.map((column) => column.attributes.get("aria-sort")),
    ["ascending", "none", undefined],
  );
  assert.equal(header.children[0]?.children[0]?.textContent, "Canvas ↑");

  header.children[0]?.children[0]?.click();
  rendered = getRenderedModal(modal);
  list = getStateList(rendered);
  assert.deepEqual(
    list.settings.map((setting) => setting.name),
    ["B", "A"],
  );
  const rerenderedHeader = list.children.find((child) =>
    child.classes.has("canvas-folding-persisted-states-header")
  );
  assert.equal(
    rerenderedHeader?.children[0]?.children[0]?.textContent,
    "Canvas ↓",
  );
});

void test("removes one persisted state and then clears all remaining states", async () => {
  let paths = ["Folder/A.canvas", "Folder/B.canvas"];
  const removed: string[] = [];
  let clearCount = 0;
  const modal = createModal({
    getPaths: () => paths,
    remove: async (canvasPath) => {
      removed.push(canvasPath);
      paths = paths.filter((path) => path !== canvasPath);
    },
    clearAll: async () => {
      clearCount += 1;
      paths = [];
    },
  });

  modal.onOpen();
  await settleAsyncRender();
  let settings = getRenderedSettings(getRenderedModal(modal));
  assert.deepEqual(
    settings.map((setting) => setting.name),
    ["A", "B", "Remove all persisted canvas states."],
  );
  assert.deepEqual(
    settings.map((setting) => setting.desc),
    [
      "Folder/A.canvas",
      "Folder/B.canvas",
      "Remove every stored state used for restoration between sessions.",
    ],
  );
  assert.deepEqual(
    settings.map((setting) => setting.buttons[0]?.text),
    ["Remove", "Remove", "Remove all"],
  );
  assert.equal(settings.every((setting) => setting.buttons[0]?.destructive), true);

  await settings[0]?.buttons[0]?.onClickCallback?.();
  assert.deepEqual(removed, ["Folder/A.canvas"]);
  settings = getRenderedSettings(getRenderedModal(modal));
  assert.deepEqual(
    settings.map((setting) => setting.name),
    ["B", "Remove all persisted canvas states."],
  );

  await settings[1]?.buttons[0]?.onClickCallback?.();
  assert.equal(clearCount, 0);
  assert.equal(settings[1]?.buttons[0]?.text, "Confirm remove all");
  await settings[1]?.buttons[0]?.onClickCallback?.();
  assert.equal(clearCount, 1);
  const emptyContent = getRenderedModal(modal).contentEl;
  assert.equal(emptyContent.settings.length, 0);
  assert.match(
    emptyContent.children[emptyContent.children.length - 1]?.textContent ?? "",
    /No persisted canvas states/,
  );
});

void test("does not render detached content after an operation finishes", async () => {
  for (const action of ["remove", "clear"] as const) {
    let finishOperation: (() => void) | undefined;
    const pendingOperation = new Promise<void>((resolve) => {
      finishOperation = resolve;
    });
    const modal = createModal({
      getPaths: () => ["Folder/A.canvas"],
      remove: async () => pendingOperation,
      clearAll: async () => pendingOperation,
    });

    modal.onOpen();
    await settleAsyncRender();
    const settings = getRenderedModal(modal).contentEl.settings;
    const settingIndex = action === "remove" ? 0 : 1;
    if (action === "clear") {
      await settings[settingIndex]?.buttons[0]?.onClickCallback?.();
    }
    const operation = settings[settingIndex]?.buttons[0]?.onClickCallback?.();

    modal.onClose();
    finishOperation?.();
    await operation;

    const content = getRenderedModal(modal).contentEl;
    assert.equal(content.children.length, 0, action);
    assert.equal(content.settings.length, 0, action);
  }
});

void test("serializes destructive actions while a save is pending", async () => {
  let finishOperation: (() => void) | undefined;
  const pendingOperation = new Promise<void>((resolve) => {
    finishOperation = resolve;
  });
  const removed: string[] = [];
  const modal = createModal({
    getPaths: () => ["Folder/A.canvas", "Folder/B.canvas"],
    remove: async (canvasPath) => {
      removed.push(canvasPath);
      await pendingOperation;
    },
  });

  modal.onOpen();
  const originalSettings = getRenderedSettings(getRenderedModal(modal));
  const first = originalSettings[0]?.buttons[0]?.onClickCallback?.();
  await Promise.resolve();

  assert.equal(
    getRenderedSettings(getRenderedModal(modal)).every(
      (setting) => setting.buttons[0]?.disabled,
    ),
    true,
  );
  await originalSettings[1]?.buttons[0]?.onClickCallback?.();
  assert.deepEqual(removed, ["Folder/A.canvas"]);

  finishOperation?.();
  await first;
});

void test("explains and disables controls for future-version data", () => {
  const modal = createModal({
    getPaths: () => ["Folder/A.canvas"],
    isReadOnly: () => true,
  });

  modal.onOpen();

  const rendered = getRenderedModal(modal);
  assert.match(
    rendered.contentEl.children.map((child) => child.textContent).join(" "),
    /newer canvas folding version/u,
  );
  assert.equal(
    getRenderedSettings(rendered).every((setting) => setting.buttons[0]?.disabled),
    true,
  );
});

function createModal(
  overrides: Partial<PersistedCanvasStatesModalHost>,
): PersistedCanvasStatesModal {
  return new PersistedCanvasStatesModal({} as App, {
    clearAll: async () => {},
    getPaths: () => [],
    isReadOnly: () => false,
    remove: async () => {},
    ...overrides,
  });
}

function getRenderedModal(modal: PersistedCanvasStatesModal): RenderedModal {
  return modal as unknown as RenderedModal;
}

function getStateList(rendered: RenderedModal): RenderedElement {
  const list = rendered.contentEl.children.find((child) =>
    child.classes.has("canvas-folding-persisted-states-list")
  );
  assert.ok(list !== undefined);
  return list;
}

function getRenderedSettings(rendered: RenderedModal): RenderedSetting[] {
  return [...getStateList(rendered).settings, ...rendered.contentEl.settings];
}

async function settleAsyncRender(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
