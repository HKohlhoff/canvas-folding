import {
  getDescendantDepths,
  getDescendantIds,
  type CanvasGraph,
} from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";

export interface BranchControlModel {
  collapsed: boolean;
  descendantCount: number;
  externallyCollapsedDescendantCount?: number;
  nodeId: string;
}

export interface BranchControlRuntimeState {
  externallyCollapsedNodeIds: ReadonlySet<string>;
}

export function formatDescendantCount(count: number): string {
  return `${count} descendant${count === 1 ? "" : "s"}`;
}

export function buildBranchControlModels(
  graph: CanvasGraph,
  state: Pick<BranchCollapseState, "getHiddenNodeIds">,
  runtime?: BranchControlRuntimeState,
): readonly BranchControlModel[] {
  const hiddenNodeIds = state.getHiddenNodeIds(graph);

  return getNodesInDepthFirstOrder(graph).flatMap((node) => {
    if (hiddenNodeIds.has(node.id)) {
      return [];
    }
    const descendantIds = getDescendantIds(graph, node.id);
    if (descendantIds.length === 0) {
      return [];
    }

    const collapsed = (graph.childrenByNode.get(node.id) ?? []).some(
      (childId) => hiddenNodeIds.has(childId),
    );
    const externallyCollapsedDescendantCount = runtime === undefined
      ? 0
      : descendantIds.filter((descendantId) =>
        runtime.externallyCollapsedNodeIds.has(descendantId),
      ).length;

    return [{
      nodeId: node.id,
      collapsed,
      ...(externallyCollapsedDescendantCount > 0
        ? { externallyCollapsedDescendantCount }
        : {}),
      descendantCount: descendantIds.length,
    }];
  });
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
