import {
  getDescendantDepths,
  getDescendantIds,
  type CanvasGraph,
} from "./graph";

export class BranchCollapseState {
  private readonly revealedNodeIdsByRestriction = new Map<
    string,
    Set<string>
  >();
  private readonly visibleDepthByNodeId = new Map<string, number>();

  collapse(nodeId: string): void {
    this.setVisibleDepth(nodeId, 0);
  }

  setVisibleDepth(nodeId: string, visibleDepth: number): void {
    if (!Number.isSafeInteger(visibleDepth) || visibleDepth < 0) {
      throw new Error("Visible branch depth must be a non-negative integer.");
    }

    this.visibleDepthByNodeId.set(nodeId, visibleDepth);
    this.revealedNodeIdsByRestriction.delete(nodeId);
  }

  expand(nodeId: string): void {
    this.visibleDepthByNodeId.delete(nodeId);
    this.revealedNodeIdsByRestriction.delete(nodeId);
  }

  expandAll(): void {
    this.visibleDepthByNodeId.clear();
    this.revealedNodeIdsByRestriction.clear();
  }

  resetBranch(graph: CanvasGraph, nodeId: string): void {
    const branchNodeIds = new Set([nodeId, ...getDescendantIds(graph, nodeId)]);
    for (const branchNodeId of branchNodeIds) {
      this.visibleDepthByNodeId.delete(branchNodeId);
      this.revealedNodeIdsByRestriction.delete(branchNodeId);
    }

    for (const [restrictedNodeId, revealedNodeIds] of
      this.revealedNodeIdsByRestriction) {
      for (const branchNodeId of branchNodeIds) {
        revealedNodeIds.delete(branchNodeId);
      }
      if (revealedNodeIds.size === 0) {
        this.revealedNodeIdsByRestriction.delete(restrictedNodeId);
      }
    }
  }

  isCollapsed(nodeId: string): boolean {
    return this.visibleDepthByNodeId.get(nodeId) === 0;
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

    for (const restrictedNodeId of this.visibleDepthByNodeId.keys()) {
      const hiddenByRestriction = this.getHiddenNodeIdsForRestriction(
        graph,
        restrictedNodeId,
      );
      if (!childIds.some((childId) => hiddenByRestriction.has(childId))) {
        continue;
      }

      const revealedNodeIds =
        this.revealedNodeIdsByRestriction.get(restrictedNodeId) ??
        new Set<string>();
      revealedNodeIds.add(nodeId);
      this.revealedNodeIdsByRestriction.set(
        restrictedNodeId,
        revealedNodeIds,
      );
      changed = true;
    }

    return changed;
  }

  revealEntireBranch(graph: CanvasGraph, nodeId: string): boolean {
    const descendantIds = new Set(getDescendantIds(graph, nodeId));
    let changed = false;

    for (const restrictedNodeId of this.visibleDepthByNodeId.keys()) {
      const hiddenByRestriction = this.getHiddenNodeIdsForRestriction(
        graph,
        restrictedNodeId,
      );
      if (
        ![...descendantIds].some((descendantId) =>
          hiddenByRestriction.has(descendantId),
        )
      ) {
        continue;
      }

      const revealedNodeIds =
        this.revealedNodeIdsByRestriction.get(restrictedNodeId) ??
        new Set<string>();
      revealedNodeIds.add(nodeId);
      this.revealedNodeIdsByRestriction.set(
        restrictedNodeId,
        revealedNodeIds,
      );
      changed = true;
    }

    return changed;
  }

  getHiddenNodeIds(graph: CanvasGraph): ReadonlySet<string> {
    const hiddenNodeIds = new Set<string>();
    for (const restrictedNodeId of this.visibleDepthByNodeId.keys()) {
      for (const descendantId of this.getHiddenNodeIdsForRestriction(
        graph,
        restrictedNodeId,
      )) {
        hiddenNodeIds.add(descendantId);
      }
    }
    return hiddenNodeIds;
  }

  private getHiddenNodeIdsForRestriction(
    graph: CanvasGraph,
    restrictedNodeId: string,
  ): Set<string> {
    const visibleDepth = this.visibleDepthByNodeId.get(restrictedNodeId);
    if (visibleDepth === undefined) {
      return new Set();
    }

    const hiddenNodeIds = new Set(
      [...getDescendantDepths(graph, restrictedNodeId)]
        .filter(([, depth]) => depth > visibleDepth)
        .map(([descendantId]) => descendantId),
    );
    for (const revealedNodeId of
      this.revealedNodeIdsByRestriction.get(restrictedNodeId) ?? []) {
      for (const descendantId of getDescendantIds(graph, revealedNodeId)) {
        hiddenNodeIds.delete(descendantId);
      }
    }
    return hiddenNodeIds;
  }
}
