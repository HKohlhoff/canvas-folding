import {
  getDescendantDepths,
  getDescendantIds,
  type CanvasGraph,
} from "./graph";

export interface BranchCollapseStateData {
  revealedBranches: Readonly<Record<string, readonly string[]>>;
  visibleDepths: Readonly<Record<string, number>>;
}

export class BranchCollapseState {
  private readonly revealedNodeIdsByRestriction = new Map<
    string,
    Set<string>
  >();
  private readonly visibleDepthByNodeId = new Map<string, number>();

  static fromData(data: unknown): BranchCollapseState {
    const normalized = normalizeBranchCollapseStateData(data);
    const state = new BranchCollapseState();

    for (const [nodeId, visibleDepth] of Object.entries(
      normalized.visibleDepths,
    )) {
      state.visibleDepthByNodeId.set(nodeId, visibleDepth);
    }
    for (const [restrictedNodeId, revealedNodeIds] of Object.entries(
      normalized.revealedBranches,
    )) {
      if (state.visibleDepthByNodeId.has(restrictedNodeId)) {
        state.revealedNodeIdsByRestriction.set(
          restrictedNodeId,
          new Set(revealedNodeIds),
        );
      }
    }

    return state;
  }

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

  collapseAllRootBranches(graph: CanvasGraph): number {
    const collapsibleRootIds = graph.rootIds.filter(
      (rootId) => (graph.childrenByNode.get(rootId) ?? []).length > 0,
    );
    if (collapsibleRootIds.length === 0) {
      return 0;
    }

    this.expandAll();
    for (const rootId of collapsibleRootIds) {
      this.collapse(rootId);
    }
    return collapsibleRootIds.length;
  }

  isEmpty(): boolean {
    return this.visibleDepthByNodeId.size === 0;
  }

  toData(): BranchCollapseStateData {
    return {
      revealedBranches: Object.fromEntries(
        [...this.revealedNodeIdsByRestriction].map(
          ([restrictedNodeId, revealedNodeIds]) => [
            restrictedNodeId,
            [...revealedNodeIds],
          ],
        ),
      ),
      visibleDepths: Object.fromEntries(this.visibleDepthByNodeId),
    };
  }

  prune(graph: CanvasGraph): boolean {
    const validNodeIds = new Set(graph.nodes.map((node) => node.id));
    let changed = false;

    for (const nodeId of this.visibleDepthByNodeId.keys()) {
      if (!validNodeIds.has(nodeId)) {
        this.visibleDepthByNodeId.delete(nodeId);
        this.revealedNodeIdsByRestriction.delete(nodeId);
        changed = true;
      }
    }

    for (const [restrictedNodeId, revealedNodeIds] of
      this.revealedNodeIdsByRestriction) {
      if (!this.visibleDepthByNodeId.has(restrictedNodeId)) {
        this.revealedNodeIdsByRestriction.delete(restrictedNodeId);
        changed = true;
        continue;
      }

      for (const revealedNodeId of revealedNodeIds) {
        if (!validNodeIds.has(revealedNodeId)) {
          revealedNodeIds.delete(revealedNodeId);
          changed = true;
        }
      }
      if (revealedNodeIds.size === 0) {
        this.revealedNodeIdsByRestriction.delete(restrictedNodeId);
        changed = true;
      }
    }

    return changed;
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

export function normalizeBranchCollapseStateData(
  data: unknown,
): BranchCollapseStateData {
  if (!isRecord(data)) {
    return { revealedBranches: {}, visibleDepths: {} };
  }

  const visibleDepths: Record<string, number> = {};
  if (isRecord(data.visibleDepths)) {
    for (const [nodeId, visibleDepth] of Object.entries(data.visibleDepths)) {
      if (
        nodeId.length > 0 &&
        typeof visibleDepth === "number" &&
        Number.isSafeInteger(visibleDepth) &&
        visibleDepth >= 0
      ) {
        visibleDepths[nodeId] = visibleDepth;
      }
    }
  }

  const revealedBranches: Record<string, readonly string[]> = {};
  if (isRecord(data.revealedBranches)) {
    for (const [restrictedNodeId, value] of Object.entries(
      data.revealedBranches,
    )) {
      if (!(restrictedNodeId in visibleDepths) || !Array.isArray(value)) {
        continue;
      }

      const revealedNodeIds = [
        ...new Set(
          value.filter(
            (nodeId): nodeId is string =>
              typeof nodeId === "string" && nodeId.length > 0,
          ),
        ),
      ];
      if (revealedNodeIds.length > 0) {
        revealedBranches[restrictedNodeId] = revealedNodeIds;
      }
    }
  }

  return { revealedBranches, visibleDepths };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
