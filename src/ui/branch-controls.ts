import type {
  ActiveCanvasContext,
  CanvasNodeElementHandle,
} from "../canvas/adapter";
import {
  formatDescendantCount,
  type BranchControlModel,
} from "./control-model";

interface ControlEntry {
  activate: () => void;
  button: HTMLButtonElement;
  leaf: object;
  openContextMenu: (position: BranchMenuPosition) => void;
}

export interface BranchMenuPosition {
  x: number;
  y: number;
}

export class CanvasBranchControlManager {
  private readonly entries = new Map<CanvasNodeElementHandle, ControlEntry>();

  sync(
    context: ActiveCanvasContext,
    models: readonly BranchControlModel[],
    onToggle: (context: ActiveCanvasContext, nodeId: string) => void,
    onContextMenu: (
      context: ActiveCanvasContext,
      nodeId: string,
      position: BranchMenuPosition,
    ) => void,
  ): void {
    const modelsByNodeId = new Map(models.map((model) => [model.nodeId, model]));
    const currentHosts = new Set(context.nodeViews.map((view) => view.element));

    for (const [host, entry] of this.entries) {
      if (
        entry.leaf === context.leaf &&
        (!currentHosts.has(host) || !hasModelForHost(context, host, modelsByNodeId))
      ) {
        entry.button.remove();
        this.entries.delete(host);
      }
    }

    for (const nodeView of context.nodeViews) {
      const model = modelsByNodeId.get(nodeView.id);
      if (model === undefined) {
        continue;
      }

      const entry = this.getOrCreateEntry(
        nodeView.element,
        context.leaf,
      );
      entry.activate = () => {
        onToggle(context, nodeView.id);
      };
      entry.openContextMenu = (position) => {
        onContextMenu(context, nodeView.id, position);
      };
      updateButton(entry.button, model);
    }
  }

  removeAll(): void {
    for (const entry of this.entries.values()) {
      entry.button.remove();
    }
    this.entries.clear();
  }

  private getOrCreateEntry(
    host: CanvasNodeElementHandle,
    leaf: object,
  ): ControlEntry {
    const existing = this.entries.get(host);
    if (existing !== undefined) {
      return existing;
    }

    const button = host.createEl("button");
    button.type = "button";
    button.className = "canvas-folding-branch-control";

    const entry: ControlEntry = {
      activate: () => undefined,
      button,
      leaf,
      openContextMenu: () => undefined,
    };
    button.addEventListener("pointerdown", blockCanvasInteraction);
    button.addEventListener("click", (event) => {
      blockCanvasInteraction(event);
      entry.activate();
    });
    button.addEventListener("contextmenu", (event) => {
      blockCanvasInteraction(event);
      openContextMenuAfterPointerRelease(event, entry.openContextMenu);
    });
    button.addEventListener("keydown", (event) => {
      if (!isBranchMenuKeyboardEvent(event)) return;
      blockCanvasInteraction(event);
      const bounds = button.getBoundingClientRect();
      entry.openContextMenu({ x: bounds.right, y: bounds.bottom });
    });

    this.entries.set(host, entry);
    return entry;
  }
}

function updateButton(
  button: HTMLButtonElement,
  model: BranchControlModel,
): void {
  const action = model.collapsed ? "Expand" : "Collapse";
  const label = `${action} branch with ${formatDescendantCount(model.descendantCount)}`;
  const title = `${label}. Right-click or press Shift+F10 to choose visible levels.`;

  button.textContent = model.collapsed ? "+" : "−";
  button.title = title;
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-keyshortcuts", "Shift+F10");
  button.setAttribute("aria-label", label);
}

export function isBranchMenuKeyboardEvent(
  event: Pick<KeyboardEvent, "key" | "shiftKey">,
): boolean {
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

function blockCanvasInteraction(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

function openContextMenuAfterPointerRelease(
  event: MouseEvent,
  openContextMenu: (position: BranchMenuPosition) => void,
): void {
  const position = { x: event.clientX, y: event.clientY };
  const button = event.currentTarget as HTMLButtonElement | null;
  if (button === null || event.buttons === 0) {
    openContextMenu(position);
    return;
  }

  const { ownerDocument } = button;
  const finishPointerInteraction = (): void => {
    ownerDocument.removeEventListener("pointerup", finishPointerInteraction, true);
    ownerDocument.removeEventListener(
      "pointercancel",
      finishPointerInteraction,
      true,
    );
    const ownerWindow = ownerDocument.defaultView;
    if (ownerWindow === null) {
      openContextMenu(position);
    } else {
      ownerWindow.setTimeout(() => {
        openContextMenu(position);
      }, 0);
    }
  };

  ownerDocument.addEventListener("pointerup", finishPointerInteraction, true);
  ownerDocument.addEventListener(
    "pointercancel",
    finishPointerInteraction,
    true,
  );
}

function hasModelForHost(
  context: ActiveCanvasContext,
  host: CanvasNodeElementHandle,
  modelsByNodeId: ReadonlyMap<string, BranchControlModel>,
): boolean {
  const nodeView = context.nodeViews.find((view) => view.element === host);
  return nodeView !== undefined && modelsByNodeId.has(nodeView.id);
}
