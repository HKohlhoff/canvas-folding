import type {
  CanvasGraphData,
  CanvasGraphEdgeData,
  CanvasGraphNodeData,
} from "../tree/graph";

export function parseCanvasGraphData(value: unknown): CanvasGraphData | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null;
  }

  const expanded = expandCollapsedCanvasRecords(value.nodes, value.edges);
  const nodes: CanvasGraphNodeData[] = [];
  for (const valueNode of expanded.nodes) {
    if (!isRecord(valueNode) || typeof valueNode.id !== "string") {
      return null;
    }

    const geometry = readCanvasNodeGeometry(valueNode);
    nodes.push({
      id: valueNode.id,
      type: typeof valueNode.type === "string" ? valueNode.type : "unknown",
      ...geometry,
    });
  }

  const edges: CanvasGraphEdgeData[] = [];
  for (const valueEdge of expanded.edges) {
    if (
      !isRecord(valueEdge) ||
      typeof valueEdge.id !== "string" ||
      typeof valueEdge.fromNode !== "string" ||
      typeof valueEdge.toNode !== "string"
    ) {
      return null;
    }

    edges.push({
      id: valueEdge.id,
      fromNode: valueEdge.fromNode,
      toNode: valueEdge.toNode,
    });
  }

  return { nodes, edges };
}

interface ExpandedCanvasRecords {
  edges: unknown[];
  nodes: unknown[];
}

function expandCollapsedCanvasRecords(
  topLevelNodes: readonly unknown[],
  topLevelEdges: readonly unknown[],
): ExpandedCanvasRecords {
  const nodes: unknown[] = [];
  const edges: unknown[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  collectTopLevelEdges(topLevelEdges, edges, edgeIds);
  collectTopLevelNodes(topLevelNodes, nodes, nodeIds);
  for (const value of topLevelNodes) {
    if (isRecord(value)) {
      collectCollapsedNodes(value, nodes, edges, nodeIds, edgeIds);
    }
  }
  return { edges, nodes };
}

function collectTopLevelNodes(
  values: readonly unknown[],
  nodes: unknown[],
  nodeIds: Set<string>,
): void {
  for (const value of values) {
    nodes.push(value);
    if (isRecord(value) && typeof value.id === "string") {
      nodeIds.add(value.id);
    }
  }
}

function collectNestedNodes(
  values: readonly unknown[],
  offsetX: number,
  offsetY: number,
  nodes: unknown[],
  edges: unknown[],
  nodeIds: Set<string>,
  edgeIds: Set<string>,
): void {
  for (const value of values) {
    if (!isRecord(value) || typeof value.id !== "string") continue;

    const normalized = translateNode(value, offsetX, offsetY);
    const nodeId = normalized.id as string;
    if (nodeIds.has(nodeId)) continue;
    nodes.push(normalized);
    nodeIds.add(nodeId);

    collectCollapsedNodes(normalized, nodes, edges, nodeIds, edgeIds);
  }
}

function collectCollapsedNodes(
  node: Record<string, unknown>,
  nodes: unknown[],
  edges: unknown[],
  nodeIds: Set<string>,
  edgeIds: Set<string>,
): void {
  const collapsedData = node.collapsedData;
  if (
    !isRecord(collapsedData) ||
    !Array.isArray(collapsedData.nodes) ||
    !Array.isArray(collapsedData.edges)
  ) {
    return;
  }

  collectNestedEdges(collapsedData.edges, edges, edgeIds);
  collectNestedNodes(
    collapsedData.nodes,
    readFiniteNumber(node.x),
    readFiniteNumber(node.y),
    nodes,
    edges,
    nodeIds,
    edgeIds,
  );
}

function collectTopLevelEdges(
  values: readonly unknown[],
  edges: unknown[],
  edgeIds: Set<string>,
): void {
  for (const value of values) {
    edges.push(value);
    if (isRecord(value) && typeof value.id === "string") {
      edgeIds.add(value.id);
    }
  }
}

function collectNestedEdges(
  values: readonly unknown[],
  edges: unknown[],
  edgeIds: Set<string>,
): void {
  for (const value of values) {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      typeof value.fromNode !== "string" ||
      typeof value.toNode !== "string"
    ) {
      continue;
    }
    const edgeId = value.id;
    if (edgeIds.has(edgeId)) continue;
    edges.push(value);
    edgeIds.add(edgeId);
  }
}

function translateNode(
  node: Record<string, unknown>,
  offsetX: number,
  offsetY: number,
): Record<string, unknown> {
  if (offsetX === 0 && offsetY === 0) return node;
  return {
    ...node,
    ...(typeof node.x === "number" && Number.isFinite(node.x)
      ? { x: node.x + offsetX }
      : {}),
    ...(typeof node.y === "number" && Number.isFinite(node.y)
      ? { y: node.y + offsetY }
      : {}),
  };
}

function readCanvasNodeGeometry(
  node: Record<string, unknown>,
): Pick<CanvasGraphNodeData, "x" | "y" | "width" | "height"> | undefined {
  const { x, y, width, height } = node;
  if (
    typeof x !== "number" ||
    !Number.isFinite(x) ||
    typeof y !== "number" ||
    !Number.isFinite(y) ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width < 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height < 0
  ) {
    return undefined;
  }

  return { x, y, width, height };
}

function readFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
