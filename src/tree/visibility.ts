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
  restrictedEdgeIds: ReadonlySet<string> = new Set(),
): CanvasVisibility {
  const normalizedHiddenNodeIds = new Set(hiddenNodeIds);
  addContentsOfHiddenGroups(graph.nodes, normalizedHiddenNodeIds);
  addGroupsWithOnlyHiddenContents(
    graph.nodes,
    graph.edges,
    normalizedHiddenNodeIds,
  );
  const normalizedDimmedNodeIds = new Set(
    [...dimmedNodeIds].filter((nodeId) => !normalizedHiddenNodeIds.has(nodeId)),
  );
  keepGroupsActiveWithActiveContents(
    graph.nodes,
    normalizedHiddenNodeIds,
    normalizedDimmedNodeIds,
  );
  const knownEdgeIds = new Set(graph.edges.map((edge) => edge.id));
  const hiddenEdgeIds = new Set([
    ...getIncidentEdgeIds(graph, normalizedHiddenNodeIds),
    ...[...restrictedEdgeIds].filter((edgeId) => knownEdgeIds.has(edgeId)),
  ]);
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

function addContentsOfHiddenGroups(
  nodes: readonly CanvasGraphNodeData[],
  hiddenNodeIds: Set<string>,
): void {
  for (const nodeId of getNodeIdsHiddenByGroups(nodes, hiddenNodeIds)) {
    hiddenNodeIds.add(nodeId);
  }
}

export function getNodeIdsHiddenByGroups(
  nodes: readonly CanvasGraphNodeData[],
  hiddenNodeIds: ReadonlySet<string>,
): ReadonlySet<string> {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const containedNodeIdsByGroup = new Map<string, readonly string[]>();
  for (const group of nodes) {
    if (group.type !== "group" || !hasCompleteBounds(group)) continue;
    containedNodeIdsByGroup.set(
      group.id,
      nodes
        .filter(
          (node) =>
            node.id !== group.id &&
            hasCompleteBounds(node) &&
            isFullyContained(node, group),
        )
        .map((node) => node.id),
    );
  }

  const pendingGroupIds = [...hiddenNodeIds].filter(
    (nodeId) => nodesById.get(nodeId)?.type === "group",
  );
  const processedGroupIds = new Set<string>();
  const groupHiddenNodeIds = new Set<string>();
  for (let index = 0; index < pendingGroupIds.length; index += 1) {
    const groupId = pendingGroupIds[index];
    if (groupId === undefined || processedGroupIds.has(groupId)) continue;
    processedGroupIds.add(groupId);
    for (const nodeId of containedNodeIdsByGroup.get(groupId) ?? []) {
      groupHiddenNodeIds.add(nodeId);
      if (
        nodesById.get(nodeId)?.type === "group" &&
        !processedGroupIds.has(nodeId)
      ) {
        pendingGroupIds.push(nodeId);
      }
    }
  }
  return groupHiddenNodeIds;
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
  edges: CanvasGraph["edges"],
  hiddenNodeIds: Set<string>,
): void {
  const contentNodes = nodes.filter((node) => node.type !== "group");
  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const graphControlledGroupIds = new Set<string>();
  for (const edge of edges) {
    if (!knownNodeIds.has(edge.fromNode) || !knownNodeIds.has(edge.toNode)) {
      continue;
    }
    graphControlledGroupIds.add(edge.fromNode);
    graphControlledGroupIds.add(edge.toNode);
  }

  for (const group of nodes) {
    if (
      group.type !== "group" ||
      graphControlledGroupIds.has(group.id) ||
      !hasCompleteBounds(group)
    ) {
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
