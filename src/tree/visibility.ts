import type { CanvasGraph, CanvasGraphNodeData } from "./graph";

export interface CanvasVisibility {
  dimmedEdgeIds: ReadonlySet<string>;
  dimmedNodeIds: ReadonlySet<string>;
  hiddenEdgeIds: ReadonlySet<string>;
  hiddenNodeIds: ReadonlySet<string>;
}

export interface CanvasVisibilitySummary {
  activeNodeCount: number;
  dimmedNodeCount: number;
  hiddenNodeCount: number;
}

export function deriveCanvasVisibility(
  graph: Pick<CanvasGraph, "edges" | "nodes">,
  hiddenNodeIds: ReadonlySet<string>,
  dimmedNodeIds: ReadonlySet<string> = new Set(),
): CanvasVisibility {
  const normalizedHiddenNodeIds = new Set(hiddenNodeIds);
  addGroupsWithOnlyHiddenContents(graph.nodes, normalizedHiddenNodeIds);
  const normalizedDimmedNodeIds = new Set(
    [...dimmedNodeIds].filter((nodeId) => !normalizedHiddenNodeIds.has(nodeId)),
  );
  keepGroupsActiveWithActiveContents(
    graph.nodes,
    normalizedHiddenNodeIds,
    normalizedDimmedNodeIds,
  );
  const hiddenEdgeIds = getIncidentEdgeIds(graph, normalizedHiddenNodeIds);
  const dimmedEdgeIds = new Set(
    graph.edges
      .filter(
        (edge) =>
          !hiddenEdgeIds.has(edge.id) &&
          (normalizedDimmedNodeIds.has(edge.fromNode) ||
            normalizedDimmedNodeIds.has(edge.toNode)),
      )
      .map((edge) => edge.id),
  );

  return {
    dimmedEdgeIds,
    dimmedNodeIds: normalizedDimmedNodeIds,
    hiddenEdgeIds,
    hiddenNodeIds: normalizedHiddenNodeIds,
  };
}

export function summarizeCanvasVisibility(
  graph: Pick<CanvasGraph, "edges" | "nodes">,
  hiddenNodeIds: ReadonlySet<string>,
  dimmedNodeIds: ReadonlySet<string> = new Set(),
): CanvasVisibilitySummary {
  const visibility = deriveCanvasVisibility(
    graph,
    hiddenNodeIds,
    dimmedNodeIds,
  );
  return {
    activeNodeCount:
      graph.nodes.length -
      visibility.hiddenNodeIds.size -
      visibility.dimmedNodeIds.size,
    dimmedNodeCount: visibility.dimmedNodeIds.size,
    hiddenNodeCount: visibility.hiddenNodeIds.size,
  };
}

function keepGroupsActiveWithActiveContents(
  nodes: readonly CanvasGraphNodeData[],
  hiddenNodeIds: ReadonlySet<string>,
  dimmedNodeIds: Set<string>,
): void {
  const contentNodes = nodes.filter((node) => node.type !== "group");

  for (const group of nodes) {
    if (
      group.type !== "group" ||
      !dimmedNodeIds.has(group.id) ||
      !hasCompleteBounds(group)
    ) {
      continue;
    }

    const containsActiveNode = contentNodes.some(
      (node) =>
        hasCompleteBounds(node) &&
        isFullyContained(node, group) &&
        !hiddenNodeIds.has(node.id) &&
        !dimmedNodeIds.has(node.id),
    );
    if (containsActiveNode) dimmedNodeIds.delete(group.id);
  }
}

function addGroupsWithOnlyHiddenContents(
  nodes: readonly CanvasGraphNodeData[],
  hiddenNodeIds: Set<string>,
): void {
  const contentNodes = nodes.filter((node) => node.type !== "group");

  for (const group of nodes) {
    if (group.type !== "group" || !hasCompleteBounds(group)) {
      continue;
    }

    const containedNodes = contentNodes.filter(
      (node) => hasCompleteBounds(node) && isFullyContained(node, group),
    );
    if (
      containedNodes.length > 0 &&
      containedNodes.every((node) => hiddenNodeIds.has(node.id))
    ) {
      hiddenNodeIds.add(group.id);
    }
  }
}

function hasCompleteBounds(
  node: CanvasGraphNodeData,
): node is CanvasGraphNodeData & Required<Pick<CanvasGraphNodeData, "x" | "y" | "width" | "height">> {
  return (
    node.x !== undefined &&
    node.y !== undefined &&
    node.width !== undefined &&
    node.height !== undefined
  );
}

function isFullyContained(
  node: CanvasGraphNodeData & Required<Pick<CanvasGraphNodeData, "x" | "y" | "width" | "height">>,
  group: CanvasGraphNodeData & Required<Pick<CanvasGraphNodeData, "x" | "y" | "width" | "height">>,
): boolean {
  return (
    node.x >= group.x &&
    node.y >= group.y &&
    node.x + node.width <= group.x + group.width &&
    node.y + node.height <= group.y + group.height
  );
}

export function getIncidentEdgeIds(
  graph: Pick<CanvasGraph, "edges">,
  nodeIds: ReadonlySet<string>,
): ReadonlySet<string> {
  return new Set(
    graph.edges
      .filter(
        (edge) => nodeIds.has(edge.fromNode) || nodeIds.has(edge.toNode),
      )
      .map((edge) => edge.id),
  );
}
