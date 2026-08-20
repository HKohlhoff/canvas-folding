import { getDescendantIds, type CanvasGraph } from "../tree/graph";
import type { BranchCollapseState } from "../tree/state";

export interface BranchControlModel {
  collapsed: boolean;
  descendantCount: number;
  nodeId: string;
}

export function buildBranchControlModels(
  graph: CanvasGraph,
  state: Pick<BranchCollapseState, "isCollapsed">,
): readonly BranchControlModel[] {
  return graph.nodes.flatMap((node) => {
    const descendantIds = getDescendantIds(graph, node.id);
    if (descendantIds.length === 0) {
      return [];
    }

    return [
      {
        nodeId: node.id,
        collapsed: state.isCollapsed(node.id),
        descendantCount: descendantIds.length,
      },
    ];
  });
}
