import { setIcon } from "obsidian";

import type {
  ActiveCanvasContext,
  CanvasNodeElementHandle,
} from "../canvas/adapter";
import {
  formatDescendantCount,
  type BranchControlModel,
  type FocusControlModel,
} from "./control-model";

type NodeControlKind = "branch" | "focus";

interface ControlEntry {
  activateBranch: () => void;
  activateFocus: () => void;
  branchButton: HTMLButtonElement | null;
  container: HTMLDivElement;
  focusButton: HTMLButtonElement | null;
  leaf: object;
  nodeId: string;
  openContextMenu: (position: BranchMenuPosition) => void;
  toolbarHost: HTMLElement;
}

export interface BranchMenuPosition {
  x: number;
  y: number;
}

export class CanvasNodeControlManager {
  private readonly entries = new Map<CanvasNodeElementHandle, ControlEntry>();
  private readonly controlOrderByLeaf = new Map<object, readonly string[]>();

  sync(
    context: ActiveCanvasContext,
    branchModels: readonly BranchControlModel[],
    focusModels: readonly FocusControlModel[],
    onToggleBranch: (context: ActiveCanvasContext, nodeId: string) => void,
    onToggleFocus: (context: ActiveCanvasContext, nodeId: string) => void,
    onContextMenu: (
      context: ActiveCanvasContext,
      nodeId: string,
      position: BranchMenuPosition,
    ) => void,
  ): void {
    const branchModelsByNodeId = new Map(
      branchModels.map((model) => [model.nodeId, model]),
    );
    const focusModelsByNodeId = new Map(
      focusModels.map((model) => [model.nodeId, model]),
    );
    const orderedNodeIds = getNodeControlTabOrder(
      [
        ...focusModels.map((model) => model.nodeId),
        ...branchModels
          .map((model) => model.nodeId)
          .filter((nodeId) => !focusModelsByNodeId.has(nodeId)),
      ],
      context.selectedNodeIds,
    );
    const controlOrder = orderedNodeIds.flatMap((nodeId) => [
      ...(focusModelsByNodeId.has(nodeId)
        ? [getControlKey(nodeId, "focus")]
        : []),
      ...(branchModelsByNodeId.has(nodeId)
        ? [getControlKey(nodeId, "branch")]
        : []),
    ]);
    if (controlOrder.length === 0) {
      this.controlOrderByLeaf.delete(context.leaf);
    } else {
      this.controlOrderByLeaf.set(context.leaf, controlOrder);
    }

    const currentHosts = new Set(context.nodeViews.map((view) => view.element));
    for (const [host, entry] of this.entries) {
      if (
        entry.leaf === context.leaf &&
        (!currentHosts.has(host) || !hasModelForHost(
          context,
          host,
          branchModelsByNodeId,
          focusModelsByNodeId,
        ))
      ) {
        entry.container.remove();
        this.entries.delete(host);
      }
    }

    for (const nodeView of context.nodeViews) {
      const branchModel = branchModelsByNodeId.get(nodeView.id);
      const focusModel = focusModelsByNodeId.get(nodeView.id);
      if (branchModel === undefined && focusModel === undefined) continue;

      const entry = this.getOrCreateEntry(
        nodeView.element,
        context.leaf,
        nodeView.id,
        context.toolbarHost,
      );
      entry.activateBranch = () => onToggleBranch(context, nodeView.id);
      entry.activateFocus = () => onToggleFocus(context, nodeView.id);
      entry.openContextMenu = (position) => {
        onContextMenu(context, nodeView.id, position);
      };
      this.syncFocusButton(entry, focusModel);
      this.syncBranchButton(entry, branchModel);
    }

    const firstControlKey = controlOrder[0];
    for (const entry of this.entries.values()) {
      if (entry.leaf !== context.leaf) continue;
      if (entry.focusButton !== null) {
        entry.focusButton.tabIndex =
          getControlKey(entry.nodeId, "focus") === firstControlKey ? 0 : -1;
      }
      if (entry.branchButton !== null) {
        entry.branchButton.tabIndex =
          getControlKey(entry.nodeId, "branch") === firstControlKey ? 0 : -1;
      }
    }
  }

  removeAll(): void {
    for (const entry of this.entries.values()) entry.container.remove();
    this.entries.clear();
    this.controlOrderByLeaf.clear();
  }

  removeDetached(): void {
    const affectedLeaves = new Set<object>();
    for (const [host, entry] of this.entries) {
      if (entry.container.isConnected) continue;
      entry.container.remove();
      this.entries.delete(host);
      affectedLeaves.add(entry.leaf);
    }
    for (const leaf of affectedLeaves) {
      const hasRemainingEntry = [...this.entries.values()].some(
        (entry) => entry.leaf === leaf,
      );
      if (!hasRemainingEntry) this.controlOrderByLeaf.delete(leaf);
    }
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

    const container = host.createDiv();
    container.className = "canvas-folding-node-controls";
    const entry: ControlEntry = {
      activateBranch: () => undefined,
      activateFocus: () => undefined,
      branchButton: null,
      container,
      focusButton: null,
      leaf,
      nodeId,
      openContextMenu: () => undefined,
      toolbarHost,
    };
    this.entries.set(host, entry);
    return entry;
  }

  private syncFocusButton(
    entry: ControlEntry,
    model: FocusControlModel | undefined,
  ): void {
    if (model === undefined) {
      entry.focusButton?.remove();
      entry.focusButton = null;
      return;
    }
    if (entry.focusButton === null) {
      const button = entry.container.createEl("button");
      button.type = "button";
      button.className = "canvas-folding-focus-control";
      setIcon(button, "focus");
      this.installSharedButtonEvents(button, entry, "focus");
      if (entry.branchButton !== null) {
        entry.container.insertBefore(button, entry.branchButton);
      }
      entry.focusButton = button;
    }
    updateFocusButton(entry.focusButton, model);
  }

  private syncBranchButton(
    entry: ControlEntry,
    model: BranchControlModel | undefined,
  ): void {
    if (model === undefined) {
      entry.branchButton?.remove();
      entry.branchButton = null;
      return;
    }
    if (entry.branchButton === null) {
      const button = entry.container.createEl("button");
      button.type = "button";
      button.className = "canvas-folding-branch-control";
      this.installSharedButtonEvents(button, entry, "branch");
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
      entry.branchButton = button;
    }
    updateBranchButton(entry.branchButton, model);
  }

  private installSharedButtonEvents(
    button: HTMLButtonElement,
    entry: ControlEntry,
    kind: NodeControlKind,
  ): void {
    button.addEventListener("pointerdown", blockCanvasInteraction);
    button.addEventListener("click", (event) => {
      blockCanvasInteraction(event);
      if (kind === "focus") entry.activateFocus();
      else entry.activateBranch();
      if (event.detail === 0) this.restoreControlFocus(entry, kind);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === " ") {
        blockCanvasInteraction(event);
        if (!event.repeat) {
          if (kind === "focus") entry.activateFocus();
          else entry.activateBranch();
        }
        this.restoreControlFocus(entry, kind);
        return;
      }
      if (event.key === "Tab") this.moveControlFocus(entry, kind, event);
    });
  }

  private moveControlFocus(
    entry: ControlEntry,
    kind: NodeControlKind,
    event: KeyboardEvent,
  ): void {
    const order = this.controlOrderByLeaf.get(entry.leaf) ?? [];
    const nextControlKey = getAdjacentNodeControlKey(
      order,
      getControlKey(entry.nodeId, kind),
      event.shiftKey,
    );
    const nextButton = nextControlKey === null
      ? null
      : this.getButtonByControlKey(entry.leaf, nextControlKey);
    if (nextButton !== null) {
      blockCanvasInteraction(event);
      nextButton.focus({ preventScroll: true });
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

  private getButtonByControlKey(
    leaf: object,
    controlKey: string,
  ): HTMLButtonElement | null {
    for (const entry of this.entries.values()) {
      if (entry.leaf !== leaf) continue;
      if (getControlKey(entry.nodeId, "focus") === controlKey) {
        return entry.focusButton;
      }
      if (getControlKey(entry.nodeId, "branch") === controlKey) {
        return entry.branchButton;
      }
    }
    return null;
  }

  private restoreControlFocus(
    entry: ControlEntry,
    kind: NodeControlKind,
  ): void {
    const current = [...this.entries.values()].find(
      (candidate) =>
        candidate.leaf === entry.leaf && candidate.nodeId === entry.nodeId,
    );
    const button = kind === "focus"
      ? current?.focusButton
      : current?.branchButton;
    button?.focus({ preventScroll: true });
  }
}

function updateBranchButton(
  button: HTMLButtonElement,
  model: BranchControlModel,
): void {
  const action = model.collapsed ? "Expand" : "Collapse";
  const hiddenNodeLabel = model.hiddenDescendantCount === undefined
    ? null
    : `${model.hiddenDescendantCount} hidden node${model.hiddenDescendantCount === 1 ? "" : "s"}`;
  const hiddenConnectionLabel = model.hiddenConnectionCount === undefined
    ? null
    : `${model.hiddenConnectionCount} hidden connection${model.hiddenConnectionCount === 1 ? "" : "s"}`;
  const label = `${action} branch with ${hiddenNodeLabel ?? hiddenConnectionLabel ?? formatDescendantCount(model.descendantCount)}`;
  const externalGroupHint = model.externallyCollapsedDescendantCount !== undefined
    ? ` Advanced Canvas currently hides ${formatDescendantCount(model.externallyCollapsedDescendantCount)} inside collapsed groups. Canvas Folding preserves those group states when this branch is collapsed or expanded.`
    : "";
  const tooltip = `${label}.${externalGroupHint} Open the context menu for branch display options.`;

  button.textContent = model.hiddenDescendantCount === undefined
    ? model.collapsed ? "+" : "−"
    : String(model.hiddenDescendantCount);
  button.classList.toggle(
    "has-hidden-count",
    model.hiddenDescendantCount !== undefined,
  );
  button.removeAttribute("title");
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-keyshortcuts", "ContextMenu");
  button.setAttribute("aria-label", tooltip);
  button.removeAttribute("aria-description");
}

function updateFocusButton(
  button: HTMLButtonElement,
  model: FocusControlModel,
): void {
  const label = model.active
    ? "Exit branch focus"
    : model.descendantCount === 0
      ? "Focus node"
      : `Focus branch with ${formatDescendantCount(model.descendantCount)}`;
  button.classList.toggle("is-active", model.active);
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(model.active));
  button.setAttribute("title", label);
}

export function isBranchMenuKeyboardEvent(
  event: Pick<KeyboardEvent, "key">,
): boolean {
  return event.key === "ContextMenu";
}

export function getNodeControlTabOrder(
  orderedNodeIds: readonly string[],
  selectedNodeIds: readonly string[],
): readonly string[] {
  if (selectedNodeIds.length !== 1) return orderedNodeIds;
  const selectedIndex = orderedNodeIds.indexOf(selectedNodeIds[0] ?? "");
  if (selectedIndex <= 0) return orderedNodeIds;
  return [
    ...orderedNodeIds.slice(selectedIndex),
    ...orderedNodeIds.slice(0, selectedIndex),
  ];
}

export const getBranchControlTabOrder = getNodeControlTabOrder;

export function getAdjacentNodeControlKey(
  orderedControlKeys: readonly string[],
  currentControlKey: string,
  reverse: boolean,
): string | null {
  const currentIndex = orderedControlKeys.indexOf(currentControlKey);
  if (currentIndex < 0) return null;
  return orderedControlKeys[currentIndex + (reverse ? -1 : 1)] ?? null;
}

export function getAdjacentBranchControlId(
  orderedNodeIds: readonly string[],
  currentNodeId: string,
  reverse: boolean,
): string | null {
  return getAdjacentNodeControlKey(orderedNodeIds, currentNodeId, reverse);
}

function getControlKey(nodeId: string, kind: NodeControlKind): string {
  return `${nodeId}:${kind}`;
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
      ownerWindow.setTimeout(() => openContextMenu(position), 0);
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
  branchModelsByNodeId: ReadonlyMap<string, BranchControlModel>,
  focusModelsByNodeId: ReadonlyMap<string, FocusControlModel>,
): boolean {
  const nodeView = context.nodeViews.find((view) => view.element === host);
  return nodeView !== undefined && (
    branchModelsByNodeId.has(nodeView.id) || focusModelsByNodeId.has(nodeView.id)
  );
}
