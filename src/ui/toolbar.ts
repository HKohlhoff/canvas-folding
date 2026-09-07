import { setIcon } from "obsidian";

import type { ActiveCanvasContext } from "../canvas/adapter";
import type {
  ToolbarAction,
  ToolbarButtonModel,
  ToolbarPosition,
  ToolbarPositionBounds,
} from "./toolbar-model";
import {
  clampToolbarPosition,
  getToolbarButtonAriaPressed,
  getToolbarLeftPosition,
  isToolbarSpaceKey,
  moveToolbarPositionWithArrowKey,
  TOOLBAR_POINTER_EVENT_NAMES,
} from "./toolbar-model";

export {
  buildToolbarButtonModels,
  type ToolbarAction,
} from "./toolbar-model";

interface ToolbarEntry {
  host: HTMLElement;
  toolbar: HTMLElement;
}

const INITIAL_POSITION_DELAY_MS = 75;

export class CanvasToolbarManager {
  private readonly entries = new Map<object, ToolbarEntry>();

  sync(
    context: ActiveCanvasContext,
    models: readonly ToolbarButtonModel[],
    onAction: (action: ToolbarAction) => void,
    position: ToolbarPosition,
    onPositionChange: (position: ToolbarPosition) => void,
  ): void {
    let entry = this.entries.get(context.leaf);
    let isNewEntry = false;
    if (entry !== undefined && entry.host !== context.toolbarHost) {
      entry.toolbar.remove();
      this.entries.delete(context.leaf);
      entry = undefined;
    }
    if (entry === undefined) {
      const toolbar = context.toolbarHost.createDiv({
        cls: "canvas-folding-toolbar is-initializing",
        attr: { "aria-label": "Canvas Folding commands", role: "toolbar" },
      });
      isolateToolbarPointerSequence(toolbar);
      entry = { host: context.toolbarHost, toolbar };
      this.entries.set(context.leaf, entry);
      isNewEntry = true;
    }

    const focusedControlKey = getFocusedToolbarControlKey(entry.toolbar);
    entry.toolbar.empty();
    const dragHandle = entry.toolbar.createEl("button", {
      cls: "clickable-icon canvas-folding-toolbar-drag-handle",
      attr: {
        "aria-label": "Move canvas toolbar",
        "data-canvas-folding-focus-key": "move-toolbar",
        title: "Move canvas toolbar by dragging or using the arrow keys",
        type: "button",
      },
    });
    setIcon(dragHandle, "grip-vertical");
    installDrag(dragHandle, entry.toolbar, entry.host, onPositionChange);
    for (const model of models) {
      if (model.separatorBefore) {
        entry.toolbar.createDiv({
          cls: "canvas-folding-toolbar-separator",
          attr: { "aria-orientation": "vertical", role: "separator" },
        });
      }
      const button = entry.toolbar.createEl("button", {
        cls: "clickable-icon canvas-folding-toolbar-button",
        attr: {
          "aria-label": model.label,
          "data-canvas-folding-focus-key": model.action,
          title: model.label,
          type: "button",
        },
      });
      const ariaPressed = getToolbarButtonAriaPressed(model);
      if (ariaPressed !== null) {
        button.setAttribute("aria-pressed", ariaPressed);
      }
      if (model.disabled === true) {
        button.setAttribute("aria-disabled", "true");
      }
      button.classList.toggle("is-disabled", model.disabled === true);
      button.classList.toggle("is-active", model.active === true);
      setIcon(button, model.icon);
      button.addEventListener("click", (event) => {
        blockCanvasInteraction(event);
        if (model.disabled !== true) onAction(model.action);
      });
      button.addEventListener("keydown", (event) => {
        if (!isToolbarSpaceKey(event.key)) return;
        blockCanvasInteraction(event);
        if (!event.repeat && model.disabled !== true) onAction(model.action);
      });
    }
    if (isNewEntry) revealAtInitialPosition(entry.toolbar, entry.host, position);
    else applyPosition(entry.toolbar, entry.host, position);
    installKeyboardMove(
      dragHandle,
      entry.toolbar,
      entry.host,
      position,
      onPositionChange,
    );
    restoreToolbarFocus(entry.toolbar, focusedControlKey);
  }

  removeAll(): void {
    for (const entry of this.entries.values()) entry.toolbar.remove();
    this.entries.clear();
  }

  removeDetached(): void {
    for (const [leaf, entry] of this.entries) {
      if (entry.host.isConnected && entry.toolbar.isConnected) continue;
      entry.toolbar.remove();
      this.entries.delete(leaf);
    }
  }

  removeLeavesExcept(attachedLeaves: ReadonlySet<object>): void {
    for (const [leaf, entry] of this.entries) {
      if (attachedLeaves.has(leaf)) continue;
      entry.toolbar.remove();
      this.entries.delete(leaf);
    }
  }
}

function revealAtInitialPosition(
  toolbar: HTMLElement,
  host: HTMLElement,
  position: ToolbarPosition,
): void {
  const view = toolbar.ownerDocument.defaultView;
  if (view === null) {
    applyPosition(toolbar, host, position);
    toolbar.removeClass("is-initializing");
    return;
  }
  view.setTimeout(() => {
    if (!toolbar.isConnected) return;
    applyPosition(toolbar, host, position);
    toolbar.removeClass("is-initializing");
  }, INITIAL_POSITION_DELAY_MS);
}

function getFocusedToolbarControlKey(toolbar: HTMLElement): string | null {
  const activeElement = toolbar.ownerDocument.activeElement;
  if (activeElement === null || !toolbar.contains(activeElement)) return null;
  return activeElement.getAttribute("data-canvas-folding-focus-key");
}

function restoreToolbarFocus(toolbar: HTMLElement, key: string | null): void {
  if (key === null) return;
  const button = [...toolbar.querySelectorAll<HTMLButtonElement>("button")]
    .find(
      (candidate) =>
        candidate.getAttribute("data-canvas-folding-focus-key") === key,
    );
  button?.focus({ preventScroll: true });
}

function applyPosition(
  toolbar: HTMLElement,
  host: HTMLElement,
  position: ToolbarPosition,
): void {
  const clamped = clampToolbarPosition(
    position,
    getToolbarPositionBounds(host, toolbar),
  );
  toolbar.style.left = getToolbarLeftPosition(
    clamped.xPercent,
    toolbar.offsetWidth,
  );
  toolbar.style.top = `${clamped.yPixels}px`;
}

function installDrag(
  handle: HTMLButtonElement,
  toolbar: HTMLElement,
  host: HTMLElement,
  onPositionChange: (position: ToolbarPosition) => void,
): void {
  handle.addEventListener("pointerdown", (event) => {
    blockCanvasInteraction(event);
    handle.setPointerCapture(event.pointerId);
    const hostRect = host.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const centerX = toolbarRect.left - hostRect.left + toolbarRect.width / 2;
    const topY = toolbarRect.top - hostRect.top;
    let latest = { xPercent: (centerX / hostRect.width) * 100, yPixels: topY };
    const move = (moveEvent: PointerEvent): void => {
      const halfWidth = toolbarRect.width / 2;
      const nextCenterX = Math.min(
        hostRect.width - halfWidth,
        Math.max(halfWidth, centerX + moveEvent.clientX - startX),
      );
      const nextTop = Math.min(
        hostRect.height - toolbarRect.height,
        Math.max(0, topY + moveEvent.clientY - startY),
      );
      latest = { xPercent: (nextCenterX / hostRect.width) * 100, yPixels: nextTop };
      applyPosition(toolbar, host, latest);
    };
    const finish = (): void => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      onPositionChange(latest);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  });
}

function installKeyboardMove(
  handle: HTMLButtonElement,
  toolbar: HTMLElement,
  host: HTMLElement,
  initialPosition: ToolbarPosition,
  onPositionChange: (position: ToolbarPosition) => void,
): void {
  let position = { ...initialPosition };
  handle.addEventListener("keydown", (event) => {
    const bounds = getToolbarPositionBounds(host, toolbar);
    position = clampToolbarPosition(position, bounds);
    const next = moveToolbarPositionWithArrowKey(position, event.key, bounds);
    if (next === null) return;
    blockCanvasInteraction(event);
    position = next;
    applyPosition(toolbar, host, position);
    onPositionChange(position);
  });
}

function getToolbarPositionBounds(
  host: HTMLElement,
  toolbar: HTMLElement,
): ToolbarPositionBounds {
  const hostRect = host.getBoundingClientRect();
  const toolbarRect = toolbar.getBoundingClientRect();
  const halfWidthPercent = hostRect.width === 0
    ? 0
    : Math.min(50, (toolbarRect.width / 2 / hostRect.width) * 100);
  return {
    minXPercent: halfWidthPercent,
    maxXPercent: 100 - halfWidthPercent,
    maxYPixels: Math.max(0, hostRect.height - toolbarRect.height),
  };
}

function blockCanvasInteraction(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

function stopCanvasPropagation(event: Event): void {
  event.stopPropagation();
}

function isolateToolbarPointerSequence(toolbar: HTMLElement): void {
  for (const eventName of TOOLBAR_POINTER_EVENT_NAMES) {
    toolbar.addEventListener(eventName, stopCanvasPropagation);
  }
}
