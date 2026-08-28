import {
  getDescendantDepths,
  getDescendantIds,
  getRootDepths,
  type CanvasGraph,
} from "./graph";

export interface BranchCollapseStateData {
  focusedNodeId?: string;
  globalRevealedBranches?: readonly string[];
  globalVisibleDepth?: number;
  revealedBranches: Readonly<Record<string, readonly string[]>>;
  visibleDepths: Readonly<Record<string, number>>;
}

export class BranchCollapseState {
  private focusedNodeId: string | null = null;
  private readonly globallyRevealedNodeIds = new Set<string>();
  private globalVisibleDepth: number | null = null;
  private readonly revealedNodeIdsByRestriction = new Map<
    string,
    Set<string>
  >();
  private readonly visibleDepthByNodeId = new Map<string, number>();

  static fromData(data: unknown): BranchCollapseState {
    const normalized = normalizeBranchCollapseStateData(data);
    const state = new BranchCollapseState();
    state.focusedNodeId = normalized.focusedNodeId ?? null;
    state.globalVisibleDepth = normalized.globalVisibleDepth ?? null;
    for (const nodeId of normalized.globalRevealedBranches ?? []) {
      state.globallyRevealedNodeIds.add(nodeId);
    }

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
    this.globallyRevealedNodeIds.delete(nodeId);
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
    this.globalVisibleDepth = null;
    this.globallyRevealedNodeIds.clear();
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

  showAllRootBranchesThroughDepth(graph: CanvasGraph, depth: number): number {
    if (!Number.isSafeInteger(depth) || depth < 0) {
      throw new Error("Visible canvas depth must be a non-negative integer.");
    }
    const count = graph.rootIds.filter(
      (rootId) => (graph.childrenByNode.get(rootId) ?? []).length > 0,
    ).length;
    if (count === 0) return 0;
    this.expandAll();
    this.globalVisibleDepth = depth;
    return count;
  }

  focusBranch(nodeId: string): void {
    this.focusedNodeId = nodeId;
  }

  exitFocus(): boolean {
    if (this.focusedNodeId === null) return false;
    this.focusedNodeId = null;
    return true;
  }

  isFocusActive(): boolean {
    return this.focusedNodeId !== null;
  }

  getFocusedNodeId(): string | null {
    return this.focusedNodeId;
  }

  isEmpty(): boolean {
    return (
      this.visibleDepthByNodeId.size === 0 &&
      this.globalVisibleDepth === null &&
      this.focusedNodeId === null
    );
  }

  toData(): BranchCollapseStateData {
    const data: BranchCollapseStateData = {
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
    const globalData: BranchCollapseStateData =
      this.globalVisibleDepth === null
        ? data
        : {
          ...data,
          globalVisibleDepth: this.globalVisibleDepth,
          ...(this.globallyRevealedNodeIds.size > 0
            ? { globalRevealedBranches: [...this.globallyRevealedNodeIds] }
            : {}),
          };
    return this.focusedNodeId === null
      ? globalData
      : {
          ...globalData,
          focusedNodeId: this.focusedNodeId,
        };
  }

  prune(graph: CanvasGraph): boolean {
    const validNodeIds = new Set(graph.nodes.map((node) => node.id));
    let changed = false;

    if (this.focusedNodeId !== null && !validNodeIds.has(this.focusedNodeId)) {
      this.focusedNodeId = null;
      changed = true;
    }

    for (const nodeId of this.visibleDepthByNodeId.keys()) {
      if (!validNodeIds.has(nodeId)) {
        this.visibleDepthByNodeId.delete(nodeId);
        this.revealedNodeIdsByRestriction.delete(nodeId);
        changed = true;
      }
    }

    for (const nodeId of this.globallyRevealedNodeIds) {
      if (!validNodeIds.has(nodeId)) {
        this.globallyRevealedNodeIds.delete(nodeId);
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
    return this.isCollapsed(nodeId) || (graph.childrenByNode.get(nodeId) ?? [])
      .some((childId) => hiddenNodeIds.has(childId));
  }

  revealBranch(graph: CanvasGraph, nodeId: string): boolean {
    const childIds = graph.childrenByNode.get(nodeId) ?? [];
    let changed = false;
    if (
      this.globalVisibleDepth !== null &&
      childIds.some((childId) => this.getGloballyHiddenNodeIds(graph).has(childId))
    ) {
      this.globallyRevealedNodeIds.add(nodeId);
      changed = true;
    }

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
    if (
      this.globalVisibleDepth !== null &&
      [...descendantIds].some((id) => this.getGloballyHiddenNodeIds(graph).has(id))
    ) {
      this.globallyRevealedNodeIds.add(nodeId);
      changed = true;
    }

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
    const globallyHiddenNodeIds = this.getGloballyHiddenNodeIds(graph);
    const hiddenNodeIds = new Set(globallyHiddenNodeIds);
    for (const restrictedNodeId of this.visibleDepthByNodeId.keys()) {
      for (const descendantId of this.getHiddenNodeIdsForRestriction(
        graph,
        restrictedNodeId,
      )) {
        hiddenNodeIds.add(descendantId);
      }
    }

    const restrictedEdgeIds = this.getRestrictedEdgeIds(graph);
    const knownNodeIds = new Set(graph.nodes.map((node) => node.id));
    const openChildrenByNode = new Map<string, string[]>();
    for (const nodeId of knownNodeIds) openChildrenByNode.set(nodeId, []);
    for (const edge of graph.edges) {
      if (
        restrictedEdgeIds.has(edge.id) ||
        !knownNodeIds.has(edge.fromNode) ||
        !knownNodeIds.has(edge.toNode)
      ) {
        continue;
      }
      openChildrenByNode.get(edge.fromNode)?.push(edge.toNode);
    }

    const reachableNodeIds = new Set(
      [...knownNodeIds].filter((nodeId) => !hiddenNodeIds.has(nodeId)),
    );
    const queue = [...reachableNodeIds];
    for (let index = 0; index < queue.length; index += 1) {
      const nodeId = queue[index];
      if (nodeId === undefined) continue;
      for (const childId of openChildrenByNode.get(nodeId) ?? []) {
        if (
          reachableNodeIds.has(childId) ||
          globallyHiddenNodeIds.has(childId)
        ) {
          continue;
        }
        reachableNodeIds.add(childId);
        hiddenNodeIds.delete(childId);
        queue.push(childId);
      }
    }
    return hiddenNodeIds;
  }

  getRestrictedEdgeIds(graph: CanvasGraph): ReadonlySet<string> {
    const restrictedEdgeIds = new Set<string>();
    for (const [restrictedNodeId, visibleDepth] of this.visibleDepthByNodeId) {
      const descendantDepths = getDescendantDepths(graph, restrictedNodeId);
      for (const edge of graph.edges) {
        const fromDepth = edge.fromNode === restrictedNodeId
          ? 0
          : descendantDepths.get(edge.fromNode);
        const toDepth = descendantDepths.get(edge.toNode);
        if (
          fromDepth !== undefined &&
          fromDepth <= visibleDepth &&
          toDepth !== undefined &&
          toDepth > visibleDepth
        ) {
          restrictedEdgeIds.add(edge.id);
        }
      }
    }
    return restrictedEdgeIds;
  }

  getDimmedNodeIds(graph: CanvasGraph): ReadonlySet<string> {
    if (this.focusedNodeId === null) return new Set();
    const focusedNodeIds = new Set([
      this.focusedNodeId,
      ...getDescendantIds(graph, this.focusedNodeId),
    ]);
    return new Set(
      graph.nodes
        .filter((node) => !focusedNodeIds.has(node.id))
        .map((node) => node.id),
    );
  }

  private getGloballyHiddenNodeIds(graph: CanvasGraph): Set<string> {
    if (this.globalVisibleDepth === null) return new Set();
    const visibleDepth = this.globalVisibleDepth;
    const hidden = new Set(
      [...getRootDepths(graph)]
        .filter(([, depth]) => depth > visibleDepth)
        .map(([nodeId]) => nodeId),
    );
    for (const nodeId of this.globallyRevealedNodeIds) {
      for (const descendantId of getDescendantIds(graph, nodeId)) {
        hidden.delete(descendantId);
      }
    }
    return hidden;
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
  const focusedNodeId =
    typeof data.focusedNodeId === "string" && data.focusedNodeId.length > 0
      ? data.focusedNodeId
      : undefined;
  const globalVisibleDepth =
    typeof data.globalVisibleDepth === "number" &&
    Number.isSafeInteger(data.globalVisibleDepth) &&
    data.globalVisibleDepth >= 0
      ? data.globalVisibleDepth
      : undefined;
  const globalRevealedBranches =
    globalVisibleDepth !== undefined && Array.isArray(data.globalRevealedBranches)
      ? [...new Set(data.globalRevealedBranches.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ))]
      : [];
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

  return {
    revealedBranches,
    visibleDepths,
    ...(focusedNodeId === undefined ? {} : { focusedNodeId }),
    ...(globalVisibleDepth === undefined ? {} : { globalVisibleDepth }),
    ...(globalRevealedBranches.length === 0 ? {} : { globalRevealedBranches }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
