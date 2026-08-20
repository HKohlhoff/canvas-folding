import { setIcon } from "obsidian";

import type { ActiveCanvasContext } from "../canvas/adapter";
import { getDescendantIds, getRootDepths, type CanvasGraph } from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";

export type ToolbarAction =
  | "collapse-selected"
  | "expand-selected"
  | "focus-selected"
  | "exit-focus"
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
    { action: "collapse-selected", disabled: !hasSelectedDescendants || selectedBranchCollapsed, icon: "chevron-down", label: "Collapse selected branch" },
    { action: "expand-selected", disabled: !selectedBranchCollapsed, icon: "chevron-up", label: "Expand selected branch" },
    { action: "focus-selected", disabled: selectedNodeId === undefined, icon: "focus", label: "Focus selected branch", separatorBefore: true },
    { action: "exit-focus", disabled: !state.isFocusActive(), icon: "circle-off", label: "Exit branch focus" },
    { action: "collapse-all", disabled: !hasRootedBranches, icon: "minimize-2", label: "Collapse all branches", separatorBefore: true },
    { action: "expand-all", icon: "maximize-2", label: "Expand all branches" },
    { action: "show-level", disabled: !hasRootDepths, icon: "layers", label: "Show canvas through level…" },
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
  ): void {
    let entry = this.entries.get(context.leaf);
    if (entry !== undefined && entry.host !== context.toolbarHost) {
      entry.toolbar.remove();
      this.entries.delete(context.leaf);
      entry = undefined;
    }
    if (entry === undefined) {
      const toolbar = context.toolbarHost.createDiv({
        cls: "canvas-tree-toolbar",
        attr: { "aria-label": "Canvas Tree commands", role: "toolbar" },
      });
      toolbar.addEventListener("pointerdown", blockCanvasInteraction);
      entry = { host: context.toolbarHost, toolbar };
      this.entries.set(context.leaf, entry);
    }

    entry.toolbar.empty();
    for (const model of models) {
      if (model.separatorBefore) {
        entry.toolbar.createDiv({ cls: "canvas-tree-toolbar-separator" });
      }
      const button = entry.toolbar.createEl("button", {
        cls: "clickable-icon canvas-tree-toolbar-button",
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

function blockCanvasInteraction(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}
