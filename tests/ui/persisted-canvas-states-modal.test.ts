import assert from "node:assert/strict";
import test from "node:test";

import type { App } from "obsidian";

import {
  PersistedCanvasStatesModal,
  type PersistedCanvasStatesModalHost,
} from "../../src/ui/persisted-canvas-states-modal";

interface RenderedButton {
  destructive: boolean;
  onClickCallback: (() => void | Promise<void>) | null;
  text: string;
}

interface RenderedSetting {
  buttons: RenderedButton[];
  name: string;
}

interface RenderedModal {
  contentEl: {
    children: Array<{ textContent: string }>;
    settings: RenderedSetting[];
  };
  title: string;
}

void test("cleans stale states before rendering the empty state", async () => {
  let cleanupCount = 0;
  let paths = ["Deleted.canvas"];
  const modal = createModal({
    cleanup: async () => {
      cleanupCount += 1;
      paths = [];
    },
    getPaths: () => paths,
  });

  modal.onOpen();
  await settleAsyncRender();

  const rendered = getRenderedModal(modal);
  assert.equal(cleanupCount, 1);
  assert.equal(rendered.title, "Manage persisted canvas states");
  assert.deepEqual(
    rendered.contentEl.children.map((child) => child.textContent),
    [
      "Removing persisted states only disables their restoration between sessions. Folding state and visibility in currently open tabs remain unchanged.",
      "No persisted canvas states are stored.",
    ],
  );
  assert.equal(rendered.contentEl.settings.length, 0);
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
  let settings = getRenderedModal(modal).contentEl.settings;
  assert.deepEqual(
    settings.map((setting) => setting.name),
    ["Folder/A.canvas", "Folder/B.canvas", "Remove all persisted canvas states."],
  );
  assert.deepEqual(
    settings.map((setting) => setting.buttons[0]?.text),
    ["Remove", "Remove", "Remove all"],
  );
  assert.equal(settings.every((setting) => setting.buttons[0]?.destructive), true);

  await settings[0]?.buttons[0]?.onClickCallback?.();
  assert.deepEqual(removed, ["Folder/A.canvas"]);
  settings = getRenderedModal(modal).contentEl.settings;
  assert.deepEqual(
    settings.map((setting) => setting.name),
    ["Folder/B.canvas", "Remove all persisted canvas states."],
  );

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
    const operation = settings[settingIndex]?.buttons[0]?.onClickCallback?.();

    modal.onClose();
    finishOperation?.();
    await operation;

    const content = getRenderedModal(modal).contentEl;
    assert.equal(content.children.length, 0, action);
    assert.equal(content.settings.length, 0, action);
  }
});

function createModal(
  overrides: Partial<PersistedCanvasStatesModalHost>,
): PersistedCanvasStatesModal {
  return new PersistedCanvasStatesModal({} as App, {
    cleanup: async () => {},
    clearAll: async () => {},
    getPaths: () => [],
    remove: async () => {},
    ...overrides,
  });
}

function getRenderedModal(modal: PersistedCanvasStatesModal): RenderedModal {
  return modal as unknown as RenderedModal;
}

async function settleAsyncRender(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
