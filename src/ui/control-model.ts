import { getDescendantIds, type CanvasGraph } from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";

export interface BranchControlModel {
  collapsed: boolean;
  descendantCount: number;
  nodeId: string;
}

export function buildBranchControlModels(
  graph: CanvasGraph,
  state: Pick<BranchCollapseState, "getHiddenNodeIds">,
): readonly BranchControlModel[] {
  const hiddenNodeIds = state.getHiddenNodeIds(graph);

  return graph.nodes.flatMap((node) => {
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
