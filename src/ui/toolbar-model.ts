import {
  getDescendantIds,
  getRootDepths,
  type CanvasGraph,
} from "../tree/graph";
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
  const selectedNodeId =
    selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;
  const hasSelectedDescendants =
    selectedNodeId !== undefined &&
    getDescendantIds(graph, selectedNodeId).length > 0;
  const selectedBranchCollapsed =
    selectedNodeId !== undefined &&
    state.isBranchCollapsed(graph, selectedNodeId);
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
    { action: "toggle-controls", active: branchControlsVisible, icon: branchControlsVisible ? "eye" : "eye-off", label: "Toggle branch controls", separatorBefore: true },
    { action: "inspect-graph", icon: "network", label: "Inspect active canvas graph", separatorBefore: true },
    { action: "show-status", icon: "info", label: "Show current status" },
    { action: "hide-toolbar", icon: "x", label: "Hide canvas toolbar", separatorBefore: true },
  ];
}
