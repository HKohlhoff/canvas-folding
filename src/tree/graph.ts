export interface CanvasGraphNodeData {
  id: string;
  type: string;
}

export interface CanvasGraphEdgeData {
  id: string;
  fromNode: string;
  toNode: string;
}

export interface CanvasGraphData {
  nodes: readonly CanvasGraphNodeData[];
  edges: readonly CanvasGraphEdgeData[];
}

export interface CanvasGraph {
  nodes: readonly CanvasGraphNodeData[];
  edges: readonly CanvasGraphEdgeData[];
  childrenByNode: ReadonlyMap<string, readonly string[]>;
  rootIds: readonly string[];
  isolatedNodeIds: readonly string[];
  danglingEdgeIds: readonly string[];
}

export interface CanvasGraphSummary {
  nodeCount: number;
  edgeCount: number;
  rootIds: readonly string[];
  isolatedNodeIds: readonly string[];
  danglingEdgeIds: readonly string[];
  childrenByNode: Readonly<Record<string, readonly string[]>>;
}

export function buildCanvasGraph(data: CanvasGraphData): CanvasGraph {
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  const children = new Map<string, Set<string>>();
  const incomingCount = new Map<string, number>();
  const connectedNodeIds = new Set<string>();
  const danglingEdgeIds: string[] = [];

  for (const nodeId of nodeIds) {
    children.set(nodeId, new Set());
    incomingCount.set(nodeId, 0);
  }

  for (const edge of data.edges) {
    if (!nodeIds.has(edge.fromNode) || !nodeIds.has(edge.toNode)) {
      danglingEdgeIds.push(edge.id);
      continue;
    }

    connectedNodeIds.add(edge.fromNode);
    connectedNodeIds.add(edge.toNode);

    const nodeChildren = children.get(edge.fromNode);
    if (nodeChildren !== undefined && !nodeChildren.has(edge.toNode)) {
      nodeChildren.add(edge.toNode);
      incomingCount.set(edge.toNode, (incomingCount.get(edge.toNode) ?? 0) + 1);
    }
  }

  const childrenByNode = new Map<string, readonly string[]>();
  for (const [nodeId, nodeChildren] of children) {
    childrenByNode.set(nodeId, [...nodeChildren]);
  }

  return {
    nodes: data.nodes,
    edges: data.edges,
    childrenByNode,
    rootIds: [...nodeIds].filter((nodeId) => incomingCount.get(nodeId) === 0),
    isolatedNodeIds: [...nodeIds].filter((nodeId) => !connectedNodeIds.has(nodeId)),
    danglingEdgeIds,
  };
}


export function describeCanvasGraph(graph: CanvasGraph): CanvasGraphSummary {
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    rootIds: graph.rootIds,
    isolatedNodeIds: graph.isolatedNodeIds,
    danglingEdgeIds: graph.danglingEdgeIds,
    childrenByNode: Object.fromEntries(graph.childrenByNode),
  };
}

export function getDescendantIds(
  graph: Pick<CanvasGraph, "childrenByNode">,
  nodeId: string,
): readonly string[] {
  return [...getDescendantDepths(graph, nodeId).keys()];
}

export function getDescendantDepths(
  graph: Pick<CanvasGraph, "childrenByNode">,
  nodeId: string,
): ReadonlyMap<string, number> {
  if (!graph.childrenByNode.has(nodeId)) {
    return new Map();
  }

  const descendantDepths = new Map<string, number>();
  const visited = new Set([nodeId]);
  const queue = (graph.childrenByNode.get(nodeId) ?? []).map((childId) => ({
    depth: 1,
    nodeId: childId,
  }));

  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];
    if (entry === undefined || visited.has(entry.nodeId)) {
      continue;
    }

    visited.add(entry.nodeId);
    descendantDepths.set(entry.nodeId, entry.depth);
    queue.push(
      ...(graph.childrenByNode.get(entry.nodeId) ?? []).map((childId) => ({
        depth: entry.depth + 1,
        nodeId: childId,
      })),
    );
  }

  return descendantDepths;
}

export function getRootDepths(
  graph: Pick<CanvasGraph, "childrenByNode" | "rootIds">,
): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  const queue = graph.rootIds.map((nodeId) => ({ depth: 0, nodeId }));
  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];
    if (entry === undefined || depths.has(entry.nodeId)) continue;
    depths.set(entry.nodeId, entry.depth);
    queue.push(...(graph.childrenByNode.get(entry.nodeId) ?? []).map((nodeId) => ({
      depth: entry.depth + 1,
      nodeId,
    })));
  }
  return depths;
}
