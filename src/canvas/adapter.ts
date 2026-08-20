import { App, ItemView } from "obsidian";

import {
  extractCanvasEdgeViews,
  extractCanvasNodeViews,
  extractSelectedNodeIds,
  type CanvasEdgeView,
  type CanvasNodeView,
} from "./runtime-elements";

export type {
  CanvasEdgeView,
  CanvasElementHandle,
  CanvasNodeView,
} from "./runtime-elements";

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

export interface ActiveCanvasContext {
  key: string;
  data: CanvasGraphData;
  selectedNodeIds: readonly string[];
  nodeViews: readonly CanvasNodeView[];
  edgeViews: readonly CanvasEdgeView[];
}

type CanvasReadFailure = {
  ok: false;
  reason: "no-active-canvas" | "canvas-api-unavailable" | "invalid-data";
  message: string;
};

export type CanvasSnapshotResult =
  | { ok: true; data: CanvasGraphData }
  | CanvasReadFailure;

export type ActiveCanvasContextResult =
  | { ok: true; context: ActiveCanvasContext }
  | CanvasReadFailure;

interface CanvasRuntime {
  getData(): unknown;
}

interface InteractiveCanvasRuntime extends CanvasRuntime {
  edges: RuntimeValueCollection;
  nodes: RuntimeValueCollection;
  selection: Iterable<unknown>;
}

interface RuntimeValueCollection {
  values(): Iterable<unknown>;
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

export function readActiveCanvasContext(
  app: App,
): ActiveCanvasContextResult {
  const snapshot = readActiveCanvasSnapshot(app);
  if (!snapshot.ok) {
    return snapshot;
  }

  const view = app.workspace.getActiveViewOfType(ItemView);
  const canvas = view === null ? undefined : (view as CanvasItemView).canvas;
  if (!isInteractiveCanvasRuntime(canvas)) {
    return {
      ok: false,
      reason: "canvas-api-unavailable",
      message: "The active canvas does not expose compatible view elements.",
    };
  }

  const nodeViews = extractCanvasNodeViews(canvas.nodes.values());
  const edgeViews = extractCanvasEdgeViews(canvas.edges.values());
  const filePath = app.workspace.getActiveFile()?.path;

  return {
    ok: true,
    context: {
      key: filePath ?? "canvas-view:active",
      data: snapshot.data,
      selectedNodeIds: extractSelectedNodeIds(canvas.selection),
      nodeViews,
      edgeViews,
    },
  };
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

function isInteractiveCanvasRuntime(
  value: unknown,
): value is InteractiveCanvasRuntime {
  if (!isCanvasRuntime(value)) {
    return false;
  }

  const candidate = value as CanvasRuntime & Record<string, unknown>;
  return (
    isRuntimeValueCollection(candidate.nodes) &&
    isRuntimeValueCollection(candidate.edges) &&
    isIterable(candidate.selection)
  );
}

function isRuntimeValueCollection(value: unknown): value is RuntimeValueCollection {
  return isRecord(value) && typeof value.values === "function";
}

function isIterable(value: unknown): value is Iterable<unknown> {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return false;
  }

  return typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
