import { setIcon } from "obsidian";

import type { ActiveCanvasContext } from "../canvas/adapter";
import { getDescendantIds, getRootDepths, type CanvasGraph } from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";

export type ToolbarAction =
  | "collapse-selected"
  | "expand-selected"
  | "toggle-focus"
  | "collapse-all"
  | "expand-all"
  | "show-level"
  | "toggle-controls"
  | "inspect-graph"
  | "show-status"
  | "hide-toolbar";

export interface ToolbarButtonModel {
  action: ToolbarAction;
  active?: boolean;
  disabled?: boolean;
  icon: string;
  label: string;
  separatorBefore?: boolean;
}

export function buildToolbarButtonModels(
  graph: CanvasGraph,
  state: BranchCollapseState,
  selectedNodeIds: readonly string[],
  branchControlsVisible: boolean,
): readonly ToolbarButtonModel[] {
  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;
  const hasSelectedDescendants =
    selectedNodeId !== undefined && getDescendantIds(graph, selectedNodeId).length > 0;
  const selectedBranchCollapsed =
    selectedNodeId !== undefined && state.isBranchCollapsed(graph, selectedNodeId);
  const hasRootedBranches = graph.rootIds.some(
    (rootId) => (graph.childrenByNode.get(rootId) ?? []).length > 0,
  );
  const hasRootDepths = Math.max(0, ...getRootDepths(graph).values()) > 0;

  return [
    { action: "collapse-selected", disabled: !hasSelectedDescendants || selectedBranchCollapsed, icon: "minus", label: "Collapse selected branch" },
    { action: "expand-selected", disabled: !selectedBranchCollapsed, icon: "plus", label: "Expand selected branch" },
    { action: "toggle-focus", active: state.isFocusActive(), disabled: !state.isFocusActive() && selectedNodeId === undefined, icon: "focus", label: state.isFocusActive() ? "Exit branch focus" : "Focus selected branch", separatorBefore: true },
    { action: "collapse-all", disabled: !hasRootedBranches, icon: "minus", label: "Collapse all branches", separatorBefore: true },
    { action: "show-level", disabled: !hasRootDepths, icon: "layers", label: "Show canvas through level…" },
    { action: "expand-all", icon: "plus", label: "Expand all branches" },
    { action: "toggle-controls", active: branchControlsVisible, icon: "circle-dot", label: "Toggle branch controls", separatorBefore: true },
    { action: "inspect-graph", icon: "network", label: "Inspect active canvas graph", separatorBefore: true },
    { action: "show-status", icon: "info", label: "Show current status" },
    { action: "hide-toolbar", icon: "x", label: "Hide canvas toolbar", separatorBefore: true },
  ];
}

interface ToolbarEntry {
  host: HTMLElement;
  toolbar: HTMLElement;
}

export class CanvasToolbarManager {
  private readonly entries = new Map<object, ToolbarEntry>();

  sync(
    context: ActiveCanvasContext,
    models: readonly ToolbarButtonModel[],
    onAction: (action: ToolbarAction) => void,
    position: { xPercent: number; yPixels: number },
    onPositionChange: (position: { xPercent: number; yPixels: number }) => void,
  ): void {
    let entry = this.entries.get(context.leaf);
    if (entry !== undefined && entry.host !== context.toolbarHost) {
      entry.toolbar.remove();
      this.entries.delete(context.leaf);
      entry = undefined;
    }
    if (entry === undefined) {
      const toolbar = context.toolbarHost.createDiv({
        cls: "canvas-folding-toolbar",
        attr: { "aria-label": "Canvas Folding commands", role: "toolbar" },
      });
      toolbar.addEventListener("pointerdown", blockCanvasInteraction);
      entry = { host: context.toolbarHost, toolbar };
      this.entries.set(context.leaf, entry);
    }

    entry.toolbar.empty();
    applyPosition(entry.toolbar, position);
    const dragHandle = entry.toolbar.createEl("button", {
      cls: "clickable-icon canvas-folding-toolbar-drag-handle",
      attr: { "aria-label": "Move canvas toolbar", title: "Move canvas toolbar", type: "button" },
    });
    setIcon(dragHandle, "grip-vertical");
    installDrag(dragHandle, entry.toolbar, entry.host, onPositionChange);
    for (const model of models) {
      if (model.separatorBefore) {
        entry.toolbar.createDiv({ cls: "canvas-folding-toolbar-separator" });
      }
      const button = entry.toolbar.createEl("button", {
        cls: "clickable-icon canvas-folding-toolbar-button",
        attr: {
          "aria-label": model.label,
          "aria-pressed": model.active === undefined ? "false" : String(model.active),
          title: model.label,
          type: "button",
        },
      });
      button.disabled = model.disabled === true;
      button.classList.toggle("is-active", model.active === true);
      setIcon(button, model.icon);
      button.addEventListener("click", (event) => {
        blockCanvasInteraction(event);
        if (!button.disabled) onAction(model.action);
      });
    }
  }

  removeAll(): void {
    for (const entry of this.entries.values()) entry.toolbar.remove();
    this.entries.clear();
  }
}

function applyPosition(
  toolbar: HTMLElement,
  position: { xPercent: number; yPixels: number },
): void {
  toolbar.style.left = `${position.xPercent}%`;
  toolbar.style.top = `${position.yPixels}px`;
}

function installDrag(
  handle: HTMLButtonElement,
  toolbar: HTMLElement,
  host: HTMLElement,
  onPositionChange: (position: { xPercent: number; yPixels: number }) => void,
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
      applyPosition(toolbar, latest);
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

function blockCanvasInteraction(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}
