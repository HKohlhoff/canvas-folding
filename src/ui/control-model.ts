import {
  getDescendantDepths,
  getDescendantIds,
  type CanvasGraph,
} from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";
import {
  buildGroupContainmentIndex,
  getNodeIdsContainedByGroupIndex,
} from "../tree/visibility";

export interface BranchControlModel {
  collapsed: boolean;
  descendantCount: number;
  disabledByHiddenGroup?: boolean;
  externallyCollapsedDescendantCount?: number;
  hiddenConnectionCount?: number;
  hiddenGroupCount?: number;
  hiddenItemCount?: number;
  hiddenNodeCount?: number;
  nodeId: string;
}

export interface FocusControlModel {
  active: boolean;
  descendantCount: number;
  nodeId: string;
}

export interface BranchControlRuntimeState {
  externallyCollapsedNodeIds: ReadonlySet<string>;
  groupHiddenNodeIds: ReadonlySet<string>;
}

export function formatDescendantCount(count: number): string {
  return `${count} descendant${count === 1 ? "" : "s"}`;
}

export function getExternallyCollapsedDescendantCount(
  graph: CanvasGraph,
  nodeId: string,
  externallyCollapsedNodeIds: ReadonlySet<string>,
): number {
  return getDescendantIds(graph, nodeId).filter((descendantId) =>
    externallyCollapsedNodeIds.has(descendantId),
  ).length;
}

export function buildBranchControlModels(
  graph: CanvasGraph,
  state: Pick<
    BranchCollapseState,
    "getHiddenNodeIds" | "getRestrictedEdgeIds" | "isCollapsed"
  >,
  runtime?: BranchControlRuntimeState,
): readonly BranchControlModel[] {
  const hiddenNodeIds = state.getHiddenNodeIds(graph);
  const restrictedEdgeIds = state.getRestrictedEdgeIds(graph);
  const groupNodeIds = new Set(
    graph.nodes.filter((node) => node.type === "group").map((node) => node.id),
  );
  const groupContainmentIndex = buildGroupContainmentIndex(graph.nodes);

  return getNodesInDepthFirstOrder(graph).flatMap((node) => {
    if (hiddenNodeIds.has(node.id)) {
      return [];
    }
    const descendantIds = getDescendantIds(graph, node.id);
    if (descendantIds.length === 0) {
      return [];
    }

    const collapsed = state.isCollapsed(node.id) ||
      (graph.childrenByNode.get(node.id) ?? []).some((childId) =>
        hiddenNodeIds.has(childId),
      );
    const hiddenDescendantIds = descendantIds.filter((descendantId) =>
      hiddenNodeIds.has(descendantId)
    );
    const hiddenContainedNodeIds = getNodeIdsContainedByGroupIndex(
      groupContainmentIndex,
      new Set(
        hiddenDescendantIds.filter((descendantId) =>
          groupNodeIds.has(descendantId)
        ),
      ),
    );
    const hiddenItemIds = new Set([
      ...hiddenDescendantIds,
      ...hiddenContainedNodeIds,
    ]);
    const hiddenGroupCount = [...hiddenItemIds].filter((nodeId) =>
      groupNodeIds.has(nodeId)
    ).length;
    const hiddenItemCount = hiddenItemIds.size;
    const hiddenNodeCount = hiddenItemCount - hiddenGroupCount;
    const externallyCollapsedDescendantCount = runtime === undefined
      ? 0
      : getExternallyCollapsedDescendantCount(
          graph,
          node.id,
          runtime.externallyCollapsedNodeIds,
        );
    const disabledByHiddenGroup = runtime !== undefined &&
      descendantIds.every((descendantId) =>
        runtime.groupHiddenNodeIds.has(descendantId),
      );
    const branchSourceIds = new Set([node.id, ...descendantIds]);
    const branchTargetIds = new Set(descendantIds);
    const hiddenConnectionCount = graph.edges.filter(
      (edge) =>
        restrictedEdgeIds.has(edge.id) &&
        branchSourceIds.has(edge.fromNode) &&
        branchTargetIds.has(edge.toNode),
    ).length;

    return [{
      nodeId: node.id,
      collapsed,
      ...(disabledByHiddenGroup ? { disabledByHiddenGroup: true } : {}),
      ...(externallyCollapsedDescendantCount > 0
        ? { externallyCollapsedDescendantCount }
        : {}),
      ...(collapsed && hiddenItemCount > 0
        ? {
            hiddenItemCount,
            ...(hiddenGroupCount > 0
              ? { hiddenGroupCount, hiddenNodeCount }
              : {}),
          }
        : {}),
      ...(collapsed && hiddenItemCount === 0 && hiddenConnectionCount > 0
        ? { hiddenConnectionCount }
        : {}),
      descendantCount: descendantIds.length,
    }];
  });
}

export function buildFocusControlModels(
  graph: CanvasGraph,
  state: Pick<
    BranchCollapseState,
    "getFocusedNodeId" | "getHiddenNodeIds" | "isBranchCollapsed"
  >,
): readonly FocusControlModel[] {
  const hiddenNodeIds = state.getHiddenNodeIds(graph);
  const focusedNodeId = state.getFocusedNodeId();

  return getNodesInDepthFirstOrder(graph).flatMap((node) =>
    hiddenNodeIds.has(node.id) || state.isBranchCollapsed(graph, node.id)
      ? []
      : [{
          active: node.id === focusedNodeId,
          descendantCount: getDescendantIds(graph, node.id).length,
          nodeId: node.id,
        }],
  );
}

export function getRenderedDescendantDepths(
  graph: CanvasGraph,
  nodeId: string,
  renderedNodeIds: ReadonlySet<string>,
): readonly number[] {
  const depths = new Set<number>();
  for (const [descendantId, depth] of getDescendantDepths(graph, nodeId)) {
    if (renderedNodeIds.has(descendantId)) depths.add(depth);
  }
  return [...depths].sort((left, right) => left - right);
}

function getNodesInDepthFirstOrder(graph: CanvasGraph): CanvasGraph["nodes"] {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const sourceIndexById = new Map(
    graph.nodes.map((node, index) => [node.id, index]),
  );
  const orderedNodes: CanvasGraph["nodes"][number][] = [];
  const visitedNodeIds = new Set<string>();
  const compareNodeIds = (leftId: string, rightId: string): number => {
    const left = nodesById.get(leftId);
    const right = nodesById.get(rightId);
    if (
      left?.x !== undefined &&
      left.y !== undefined &&
      right?.x !== undefined &&
      right.y !== undefined
    ) {
      return left.y - right.y || left.x - right.x;
    }
    return (
      (sourceIndexById.get(leftId) ?? 0) -
      (sourceIndexById.get(rightId) ?? 0)
    );
  };
  const visit = (startNodeIds: readonly string[]): void => {
    const stack = [...startNodeIds].sort(compareNodeIds).reverse();
    while (stack.length > 0) {
      const nodeId = stack.pop();
      if (nodeId === undefined || visitedNodeIds.has(nodeId)) continue;
      const node = nodesById.get(nodeId);
      if (node === undefined) continue;
      visitedNodeIds.add(nodeId);
      orderedNodes.push(node);
      const children = [...(graph.childrenByNode.get(nodeId) ?? [])]
        .sort(compareNodeIds)
        .reverse();
      stack.push(...children);
    }
  };

  visit(graph.rootIds);
  visit(graph.nodes.map((node) => node.id));
  return orderedNodes;
}
