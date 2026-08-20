import { getDescendantIds, type CanvasGraph } from "./graph";

export class BranchCollapseState {
  private readonly collapsedNodeIds = new Set<string>();
  private readonly revealedNodeIdsByCollapse = new Map<string, Set<string>>();

  collapse(nodeId: string): void {
    this.collapsedNodeIds.add(nodeId);
    this.revealedNodeIdsByCollapse.delete(nodeId);
  }

  expand(nodeId: string): void {
    this.collapsedNodeIds.delete(nodeId);
    this.revealedNodeIdsByCollapse.delete(nodeId);
  }

  expandAll(): void {
    this.collapsedNodeIds.clear();
    this.revealedNodeIdsByCollapse.clear();
  }

  isCollapsed(nodeId: string): boolean {
    return this.collapsedNodeIds.has(nodeId);
  }

  isBranchCollapsed(graph: CanvasGraph, nodeId: string): boolean {
    const hiddenNodeIds = this.getHiddenNodeIds(graph);
    return (graph.childrenByNode.get(nodeId) ?? []).some((childId) =>
      hiddenNodeIds.has(childId),
    );
  }

  revealBranch(graph: CanvasGraph, nodeId: string): boolean {
    const childIds = graph.childrenByNode.get(nodeId) ?? [];
    let changed = false;

    for (const collapsedNodeId of this.collapsedNodeIds) {
      const hiddenByCollapse = this.getHiddenNodeIdsForCollapse(
        graph,
        collapsedNodeId,
      );
      if (!childIds.some((childId) => hiddenByCollapse.has(childId))) {
        continue;
      }

      const revealedNodeIds =
        this.revealedNodeIdsByCollapse.get(collapsedNodeId) ?? new Set<string>();
      revealedNodeIds.add(nodeId);
      this.revealedNodeIdsByCollapse.set(collapsedNodeId, revealedNodeIds);
      changed = true;
    }

    return changed;
  }

  getHiddenNodeIds(graph: CanvasGraph): ReadonlySet<string> {
    const hiddenNodeIds = new Set<string>();
    for (const collapsedNodeId of this.collapsedNodeIds) {
      for (const descendantId of this.getHiddenNodeIdsForCollapse(
        graph,
        collapsedNodeId,
      )) {
        hiddenNodeIds.add(descendantId);
      }
    }
    return hiddenNodeIds;
  }

  private getHiddenNodeIdsForCollapse(
    graph: CanvasGraph,
    collapsedNodeId: string,
  ): Set<string> {
    const hiddenNodeIds = new Set(getDescendantIds(graph, collapsedNodeId));
    for (const revealedNodeId of
      this.revealedNodeIdsByCollapse.get(collapsedNodeId) ?? []) {
      for (const descendantId of getDescendantIds(graph, revealedNodeId)) {
        hiddenNodeIds.delete(descendantId);
      }
    }
    return hiddenNodeIds;
  }
}
