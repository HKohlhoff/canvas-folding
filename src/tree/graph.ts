import type {
  CanvasGraphData,
  CanvasGraphEdgeData,
  CanvasGraphNodeData,
} from "../canvas/adapter";

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
  if (!graph.childrenByNode.has(nodeId)) {
    return [];
  }

  const descendants: string[] = [];
  const visited = new Set([nodeId]);
  const queue = [...(graph.childrenByNode.get(nodeId) ?? [])];

  for (let index = 0; index < queue.length; index += 1) {
    const descendantId = queue[index];
    if (descendantId === undefined || visited.has(descendantId)) {
      continue;
    }

    visited.add(descendantId);
    descendants.push(descendantId);
    queue.push(...(graph.childrenByNode.get(descendantId) ?? []));
  }

  return descendants;
}
