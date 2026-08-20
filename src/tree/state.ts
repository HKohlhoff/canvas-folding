import { getDescendantIds, type CanvasGraph } from "./graph";

export class BranchCollapseState {
  private readonly collapsedNodeIds = new Set<string>();

  collapse(nodeId: string): void {
    this.collapsedNodeIds.add(nodeId);
  }

  expand(nodeId: string): void {
    this.collapsedNodeIds.delete(nodeId);
  }

  expandAll(): void {
    this.collapsedNodeIds.clear();
  }

  isCollapsed(nodeId: string): boolean {
    return this.collapsedNodeIds.has(nodeId);
  }

  getHiddenNodeIds(graph: CanvasGraph): ReadonlySet<string> {
    const hiddenNodeIds = new Set<string>();
    for (const collapsedNodeId of this.collapsedNodeIds) {
      for (const descendantId of getDescendantIds(graph, collapsedNodeId)) {
        hiddenNodeIds.add(descendantId);
      }
    }
    return hiddenNodeIds;
  }
}
