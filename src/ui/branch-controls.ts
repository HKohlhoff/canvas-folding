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
  nodeId: string;
  openContextMenu: (position: BranchMenuPosition) => void;
  toolbarHost: HTMLElement;
}

export interface BranchMenuPosition {
  x: number;
  y: number;
}

export class CanvasBranchControlManager {
  private readonly entries = new Map<CanvasNodeElementHandle, ControlEntry>();
  private readonly nodeOrderByLeaf = new Map<object, readonly string[]>();

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
    this.nodeOrderByLeaf.set(
      context.leaf,
      models.map((model) => model.nodeId),
    );
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
        nodeView.id,
        context.toolbarHost,
      );
      entry.activate = () => {
        onToggle(context, nodeView.id);
      };
      entry.openContextMenu = (position) => {
        onContextMenu(context, nodeView.id, position);
      };
      updateButton(entry.button, model);
    }

    const firstNodeId = models[0]?.nodeId;
    for (const entry of this.entries.values()) {
      if (entry.leaf === context.leaf) {
        entry.button.tabIndex = entry.nodeId === firstNodeId ? 0 : -1;
      }
    }
  }

  removeAll(): void {
    for (const entry of this.entries.values()) {
      entry.button.remove();
    }
    this.entries.clear();
    this.nodeOrderByLeaf.clear();
  }

  private getOrCreateEntry(
    host: CanvasNodeElementHandle,
    leaf: object,
    nodeId: string,
    toolbarHost: HTMLElement,
  ): ControlEntry {
    const existing = this.entries.get(host);
    if (existing !== undefined) {
      existing.nodeId = nodeId;
      existing.toolbarHost = toolbarHost;
      return existing;
    }

    const button = host.createEl("button");
    button.type = "button";
    button.className = "canvas-folding-branch-control";

    const entry: ControlEntry = {
      activate: () => undefined,
      button,
      leaf,
      nodeId,
      openContextMenu: () => undefined,
      toolbarHost,
    };
    button.addEventListener("pointerdown", blockCanvasInteraction);
    button.addEventListener("click", (event) => {
      blockCanvasInteraction(event);
      entry.activate();
      if (event.detail === 0) this.restoreControlFocus(entry);
    });
    button.addEventListener("contextmenu", (event) => {
      blockCanvasInteraction(event);
      openContextMenuAfterPointerRelease(event, entry.openContextMenu);
    });
    button.addEventListener("keydown", (event) => {
      if (isBranchMenuKeyboardEvent(event)) {
        blockCanvasInteraction(event);
        const bounds = button.getBoundingClientRect();
        entry.openContextMenu({ x: bounds.right, y: bounds.bottom });
        return;
      }
      if (event.key === " ") {
        blockCanvasInteraction(event);
        if (!event.repeat) entry.activate();
        this.restoreControlFocus(entry);
        return;
      }
      if (event.key === "Tab") {
        this.moveControlFocus(entry, event);
      }
    });

    this.entries.set(host, entry);
    return entry;
  }

  private moveControlFocus(entry: ControlEntry, event: KeyboardEvent): void {
    const order = this.nodeOrderByLeaf.get(entry.leaf) ?? [];
    const nextNodeId = getAdjacentBranchControlId(
      order,
      entry.nodeId,
      event.shiftKey,
    );
    const nextEntry = nextNodeId === null
      ? undefined
      : [...this.entries.values()].find(
        (candidate) =>
          candidate.leaf === entry.leaf && candidate.nodeId === nextNodeId,
      );
    if (nextEntry !== undefined) {
      blockCanvasInteraction(event);
      nextEntry.button.focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey) return;
    const toolbarButton = entry.toolbarHost.querySelector<HTMLButtonElement>(
      ".canvas-folding-toolbar button",
    );
    if (toolbarButton !== null) {
      blockCanvasInteraction(event);
      toolbarButton.focus({ preventScroll: true });
    }
  }

  private restoreControlFocus(entry: ControlEntry): void {
    const current = [...this.entries.values()].find(
      (candidate) =>
        candidate.leaf === entry.leaf && candidate.nodeId === entry.nodeId,
    );
    current?.button.focus({ preventScroll: true });
  }
}

function updateButton(
  button: HTMLButtonElement,
  model: BranchControlModel,
): void {
  const action = model.collapsed ? "Expand" : "Collapse";
  const label = `${action} branch with ${formatDescendantCount(model.descendantCount)}`;
  const title = `${label}. Right-click, press Shift+F10, or press Alt+Enter to choose visible levels.`;

  button.textContent = model.collapsed ? "+" : "−";
  button.title = title;
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-keyshortcuts", "Shift+F10 Alt+Enter");
  button.setAttribute("aria-label", label);
}

export function isBranchMenuKeyboardEvent(
  event: Pick<KeyboardEvent, "altKey" | "key" | "shiftKey">,
): boolean {
  return (
    event.key === "ContextMenu" ||
    (event.key === "F10" && event.shiftKey) ||
    (event.key === "Enter" && event.altKey)
  );
}

export function getAdjacentBranchControlId(
  orderedNodeIds: readonly string[],
  currentNodeId: string,
  reverse: boolean,
): string | null {
  const currentIndex = orderedNodeIds.indexOf(currentNodeId);
  if (currentIndex < 0) return null;
  return orderedNodeIds[currentIndex + (reverse ? -1 : 1)] ?? null;
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
