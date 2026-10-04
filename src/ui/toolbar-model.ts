import { getRootDepths, type CanvasGraph } from "../tree/graph";
import { getGroupLabelCounts } from "../tree/group-filters";
import type { BranchCollapseState } from "../tree/state";

export type ToolbarAction =
  | "collapse-selected"
  | "expand-selected"
  | "toggle-focus"
  | "collapse-all"
  | "expand-all"
  | "show-level"
  | "toggle-controls"
  | "toggle-focus-controls"
  | "filter-groups"
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

export interface ToolbarPosition {
  xPercent: number;
  yPixels: number;
}

export interface ToolbarActionPosition {
  x: number;
  y: number;
}

export interface ToolbarPositionBounds {
  maxXPercent: number;
  maxYPixels: number;
  minXPercent: number;
}

export interface SelectedBranchActionNodeIds {
  collapsibleNodeIds: readonly string[];
  expandableNodeIds: readonly string[];
}

export const TOOLBAR_POINTER_EVENT_NAMES = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
] as const;

export function getToolbarActionPosition(
  bounds: Pick<DOMRect, "bottom" | "left">,
): ToolbarActionPosition {
  return { x: bounds.left, y: bounds.bottom };
}

export function getToolbarLeftPosition(
  xPercent: number,
  renderedWidth: number,
): string {
  return `calc(${xPercent}% - ${Math.max(0, renderedWidth) / 2}px)`;
}

export function getToolbarButtonAriaPressed(
  model: Pick<ToolbarButtonModel, "active">,
): string | null {
  return model.active === undefined ? null : String(model.active);
}

export function isToolbarSpaceKey(key: string): boolean {
  return key === " ";
}

export function moveToolbarPositionWithArrowKey(
  position: ToolbarPosition,
  key: string,
  bounds: ToolbarPositionBounds,
): ToolbarPosition | null {
  const horizontalStep = 2;
  const verticalStep = 8;
  let next = { ...position };
  switch (key) {
    case "ArrowLeft": next.xPercent -= horizontalStep; break;
    case "ArrowRight": next.xPercent += horizontalStep; break;
    case "ArrowUp": next.yPixels -= verticalStep; break;
    case "ArrowDown": next.yPixels += verticalStep; break;
    default: return null;
  }
  next = {
    xPercent: Math.min(
      bounds.maxXPercent,
      Math.max(bounds.minXPercent, next.xPercent),
    ),
    yPixels: Math.min(bounds.maxYPixels, Math.max(0, next.yPixels)),
  };
  return next;
}

export function clampToolbarPosition(
  position: ToolbarPosition,
  bounds: ToolbarPositionBounds,
): ToolbarPosition {
  return {
    xPercent: Math.min(
      bounds.maxXPercent,
      Math.max(bounds.minXPercent, position.xPercent),
    ),
    yPixels: Math.min(bounds.maxYPixels, Math.max(0, position.yPixels)),
  };
}

export function buildToolbarButtonModels(
  graph: CanvasGraph,
  state: BranchCollapseState,
  selectedNodeIds: readonly string[],
  branchControlsVisible: boolean,
  focusControlsVisible: boolean,
): readonly ToolbarButtonModel[] {
  const selectedNodeId =
    selectedNodeIds.length === 1 ? selectedNodeIds[0] : undefined;
  const selectedBranchLabel =
    selectedNodeIds.length > 1 ? "selected branches" : "selected branch";
  const selectedBranchActions = getSelectedBranchActionNodeIds(
    graph,
    state,
    selectedNodeIds,
  );
  const hasRootedBranches = graph.rootIds.some(
    (rootId) => (graph.childrenByNode.get(rootId) ?? []).length > 0,
  );
  const hasRootDepths = Math.max(0, ...getRootDepths(graph).values()) > 0;
  const hasNamedGroups = getGroupLabelCounts(graph.nodes).length > 0;

  return [
    { action: "collapse-selected", disabled: selectedBranchActions.collapsibleNodeIds.length === 0, icon: "minus", label: `Collapse ${selectedBranchLabel}` },
    { action: "expand-selected", disabled: selectedBranchActions.expandableNodeIds.length === 0, icon: "plus", label: `Expand ${selectedBranchLabel}` },
    { action: "collapse-all", disabled: !hasRootedBranches, icon: "minus", label: "Collapse all branches", separatorBefore: true },
    { action: "show-level", disabled: !hasRootDepths, icon: "layers", label: "Show canvas through level…" },
    { action: "expand-all", icon: "plus", label: "Expand all branches" },
    { action: "toggle-controls", icon: branchControlsVisible ? "eye" : "eye-closed", label: branchControlsVisible ? "Hide branch controls" : "Show branch controls", separatorBefore: true },
    { action: "toggle-focus-controls", icon: focusControlsVisible ? "eye" : "eye-closed", label: focusControlsVisible ? "Hide focus controls" : "Show focus controls", separatorBefore: true },
    { action: "toggle-focus", active: state.isFocusActive(), disabled: !state.isFocusActive() && selectedNodeId === undefined, icon: "focus", label: state.isFocusActive() ? "Exit branch focus" : "Focus selected branch" },
    { action: "filter-groups", active: state.hasHiddenGroupLabels(), disabled: !hasNamedGroups, icon: "list-filter", label: "Filter groups…", separatorBefore: true },
    { action: "inspect-graph", icon: "network", label: "Inspect active canvas graph" },
    { action: "show-status", icon: "info", label: "Show current status" },
    { action: "hide-toolbar", icon: "x", label: "Hide canvas toolbar", separatorBefore: true },
  ];
}

export function getCollapsibleSelectedNodeIds(
  graph: CanvasGraph,
  state: BranchCollapseState,
  selectedNodeIds: readonly string[],
): readonly string[] {
  return getSelectedBranchActionNodeIds(
    graph,
    state,
    selectedNodeIds,
  ).collapsibleNodeIds;
}

export function getExpandableSelectedNodeIds(
  graph: CanvasGraph,
  state: BranchCollapseState,
  selectedNodeIds: readonly string[],
): readonly string[] {
  return getSelectedBranchActionNodeIds(
    graph,
    state,
    selectedNodeIds,
  ).expandableNodeIds;
}

export function getSelectedBranchActionNodeIds(
  graph: CanvasGraph,
  state: BranchCollapseState,
  selectedNodeIds: readonly string[],
): SelectedBranchActionNodeIds {
  const uniqueSelectedNodeIds = new Set(selectedNodeIds);
  if (uniqueSelectedNodeIds.size === 0) {
    return { collapsibleNodeIds: [], expandableNodeIds: [] };
  }

  const hiddenNodeIds = state.getHiddenNodeIds(graph);
  const collapsibleNodeIds: string[] = [];
  const expandableNodeIds: string[] = [];

  for (const nodeId of uniqueSelectedNodeIds) {
    const childIds = graph.childrenByNode.get(nodeId) ?? [];
    const collapsed = state.isCollapsed(nodeId) ||
      childIds.some((childId) => hiddenNodeIds.has(childId));
    if (collapsed) {
      expandableNodeIds.push(nodeId);
    } else if (childIds.length > 0) {
      collapsibleNodeIds.push(nodeId);
    }
  }

  return { collapsibleNodeIds, expandableNodeIds };
}
