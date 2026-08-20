import { App, ItemView } from "obsidian";

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

export type CanvasSnapshotResult =
  | { ok: true; data: CanvasGraphData }
  | {
      ok: false;
      reason: "no-active-canvas" | "canvas-api-unavailable" | "invalid-data";
      message: string;
    };

interface CanvasRuntime {
  getData(): unknown;
}

type CanvasItemView = ItemView & { canvas?: unknown };

export function readActiveCanvasSnapshot(app: App): CanvasSnapshotResult {
  const view = app.workspace.getActiveViewOfType(ItemView);
  if (view?.getViewType() !== "canvas") {
    return {
      ok: false,
      reason: "no-active-canvas",
      message: "Open a canvas before running this command.",
    };
  }

  const canvas = (view as CanvasItemView).canvas;
  if (!isCanvasRuntime(canvas)) {
    return {
      ok: false,
      reason: "canvas-api-unavailable",
      message: "The active canvas does not expose a compatible data API.",
    };
  }

  const data = parseCanvasGraphData(canvas.getData());
  if (data === null) {
    return {
      ok: false,
      reason: "invalid-data",
      message: "The active canvas returned invalid node or edge data.",
    };
  }

  return { ok: true, data };
}

export function parseCanvasGraphData(value: unknown): CanvasGraphData | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null;
  }

  const nodes: CanvasGraphNodeData[] = [];
  for (const valueNode of value.nodes) {
    if (!isRecord(valueNode) || typeof valueNode.id !== "string") {
      return null;
    }

    nodes.push({
      id: valueNode.id,
      type: typeof valueNode.type === "string" ? valueNode.type : "unknown",
    });
  }

  const edges: CanvasGraphEdgeData[] = [];
  for (const valueEdge of value.edges) {
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

function isCanvasRuntime(value: unknown): value is CanvasRuntime {
  return isRecord(value) && typeof value.getData === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
