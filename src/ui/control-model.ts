import { getDescendantIds, type CanvasGraph } from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";

export interface BranchControlModel {
  collapsed: boolean;
  descendantCount: number;
  nodeId: string;
}

export function formatDescendantCount(count: number): string {
  return `${count} descendant${count === 1 ? "" : "s"}`;
}

export function buildBranchControlModels(
  graph: CanvasGraph,
  state: Pick<BranchCollapseState, "getHiddenNodeIds">,
): readonly BranchControlModel[] {
  const hiddenNodeIds = state.getHiddenNodeIds(graph);

  return getNodesInVisualOrder(graph.nodes).flatMap((node) => {
    if (hiddenNodeIds.has(node.id)) {
      return [];
    }
    const descendantIds = getDescendantIds(graph, node.id);
    if (descendantIds.length === 0) {
      return [];
    }

    return [
      {
        nodeId: node.id,
        collapsed: (graph.childrenByNode.get(node.id) ?? []).some((childId) =>
          hiddenNodeIds.has(childId),
        ),
        descendantCount: descendantIds.length,
      },
    ];
  });
}

function getNodesInVisualOrder(
  nodes: CanvasGraph["nodes"],
): CanvasGraph["nodes"] {
  const indexedNodes = nodes.map((node, index) => ({ index, node }));
  if (
    indexedNodes.some(
      ({ node }) => node.x === undefined || node.y === undefined,
    )
  ) {
    return nodes;
  }

  const byTopEdge = [...indexedNodes].sort(
    (left, right) =>
      (left.node.y ?? 0) - (right.node.y ?? 0) ||
      (left.node.x ?? 0) - (right.node.x ?? 0) ||
      left.index - right.index,
  );
  const rows: Array<typeof indexedNodes> = [];
  const rowTopEdges: number[] = [];
  const rowTolerancePixels = 24;
  for (const indexedNode of byTopEdge) {
    const nodeTop = indexedNode.node.y ?? 0;
    const lastRowTop = rowTopEdges[rowTopEdges.length - 1];
    if (lastRowTop === undefined || nodeTop - lastRowTop > rowTolerancePixels) {
      rows.push([indexedNode]);
      rowTopEdges.push(nodeTop);
    } else {
      rows[rows.length - 1]?.push(indexedNode);
    }
  }

  return rows.flatMap((row) =>
    row
      .sort(
        (left, right) =>
          (left.node.x ?? 0) - (right.node.x ?? 0) || left.index - right.index,
      )
      .map(({ node }) => node),
  );
}
