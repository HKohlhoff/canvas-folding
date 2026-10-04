import { App, ItemView } from "obsidian";

import type {
  CanvasGraphData,
} from "../tree/graph";

import {
  parseCanvasGraphData,
  restoreCollapsedCanvasData,
} from "./graph-data";

import {
  extractCanvasEdgeViews,
  extractCanvasPathFromViewState,
  extractCanvasNodeInteractionLayer,
  extractCanvasNodeViews,
  extractSelectedNodeIds,
  removeSelectionByIds,
  resolveCanvasKey,
  type CanvasEdgeView,
  type CanvasNodeInteractionLayer,
  type CanvasNodeView,
  type CanvasSelectionRuntime,
} from "./runtime-elements";

export { parseCanvasGraphData } from "./graph-data";

export type {
  CanvasEdgeView,
  CanvasElementHandle,
  CanvasNodeGroupLabelHandle,
  CanvasNodeElementHandle,
  CanvasNodeInteractionLayer,
  CanvasNodeView,
} from "./runtime-elements";

export interface ActiveCanvasContext {
  key: string;
  leaf: object;
  data: CanvasGraphData;
  deselectItems(itemIds: ReadonlySet<string>): number;
  selectedNodeIds: readonly string[];
  nodeViews: readonly CanvasNodeView[];
  edgeViews: readonly CanvasEdgeView[];
  groupGeometryViews?: readonly CanvasGroupGeometryView[];
  nodeInteractionLayer: CanvasNodeInteractionLayer | null;
  restoreCollapsedGroups?(): boolean;
  toolbarHost: HTMLElement;
}

export interface CanvasGroupGeometryView {
  id: string;
  getLabelBounds(): CanvasClientBounds | null;
  markMoved(): void;
  runtime: CanvasGroupRuntime;
  toCanvasPosition(point: CanvasClientPosition): CanvasClientPosition | null;
}

export interface CanvasClientBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface CanvasClientPosition {
  x: number;
  y: number;
}

export interface CanvasGroupRuntime {
  getBBox(...args: unknown[]): unknown;
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
  markMoved?(node: unknown): void;
  posFromClient?(point: CanvasClientPosition): unknown;
  requestSave?(): void;
  setData?(data: unknown): void;
  view?: {
    file?: { path?: unknown } | null;
  };
}

interface InteractiveCanvasRuntime extends CanvasRuntime, CanvasSelectionRuntime {
  edges: RuntimeValueCollection;
  nodeInteractionLayer?: unknown;
  nodes: RuntimeValueCollection;
}

interface RuntimeValueCollection {
  values(): Iterable<unknown>;
}

type CanvasItemView = ItemView & {
  canvas?: unknown;
  file?: { path?: unknown } | null;
};

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
  const canvasView: CanvasItemView | null = view;
  const canvas = canvasView?.canvas;
  if (canvasView === null || !isInteractiveCanvasRuntime(canvas)) {
    return {
      ok: false,
      reason: "canvas-api-unavailable",
      message: "The active canvas does not expose compatible view elements.",
    };
  }

  const nodeViews = extractCanvasNodeViews(canvas.nodes.values());
  const edgeViews = extractCanvasEdgeViews(canvas.edges.values());
  const groupGeometryViews = extractGroupGeometryViews(canvas);
  const canvasKey = resolveCanvasKey(
    canvas.view?.file?.path,
    canvasView?.file?.path,
    extractCanvasPathFromViewState(canvasView?.getState()),
    extractCanvasPathFromViewState(canvasView?.leaf.getViewState().state),
    app.workspace.getActiveFile()?.path,
  );

  return {
    ok: true,
    context: {
      key: canvasKey,
      leaf: canvasView.leaf,
      data: snapshot.data,
      deselectItems: (itemIds) => removeSelectionByIds(canvas, itemIds),
      selectedNodeIds: extractSelectedNodeIds(canvas.selection),
      nodeViews,
      edgeViews,
      groupGeometryViews,
      nodeInteractionLayer: extractCanvasNodeInteractionLayer(
        canvas.nodeInteractionLayer,
      ),
      restoreCollapsedGroups: () => {
        if (typeof canvas.setData !== "function") return false;
        const canvasData = canvas.getData();
        const restoredData = restoreCollapsedCanvasData(canvasData) ??
          (hasRecoverableRuntimeCollapsedGroup(canvas.nodes.values(), nodeViews)
            ? asCanvasDataRecord(canvasData)
            : null);
        if (restoredData === null) return false;
        canvas.setData(restoredData);
        markGroupNodesMoved(canvas);
        canvas.requestSave?.();
        return true;
      },
      toolbarHost: canvasView.contentEl,
    },
  };
}

function extractGroupGeometryViews(
  canvas: InteractiveCanvasRuntime,
): CanvasGroupGeometryView[] {
  if (
    typeof canvas.markMoved !== "function" ||
    typeof canvas.posFromClient !== "function"
  ) {
    return [];
  }

  const views: CanvasGroupGeometryView[] = [];
  for (const value of canvas.nodes.values()) {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      typeof value.getBBox !== "function" ||
      !isRecord(value.labelEl) ||
      typeof value.labelEl.getBoundingClientRect !== "function"
    ) {
      continue;
    }
    const data = readNodeData(value);
    if (!isRecord(data) || data.type !== "group") continue;

    const runtime = value as unknown as CanvasGroupRuntime;
    const nodeElement = value.nodeEl;
    const labelElement = value.labelEl as unknown as {
      getBoundingClientRect(): DOMRect;
    };
    views.push({
      id: value.id,
      getLabelBounds: () => {
        try {
          const labelBounds = labelElement.getBoundingClientRect();
          if (!hasFiniteBounds(labelBounds)) return null;
          const controlBounds = readGroupControlBounds(nodeElement);
          return controlBounds === null
            ? labelBounds
            : {
                bottom: Math.max(labelBounds.bottom, controlBounds.bottom),
                left: Math.min(labelBounds.left, controlBounds.left),
                right: Math.max(labelBounds.right, controlBounds.right),
                top: Math.min(labelBounds.top, controlBounds.top),
              };
        } catch {
          return null;
        }
      },
      markMoved: () => canvas.markMoved?.(value),
      runtime,
      toCanvasPosition: (point) => {
        try {
          const position = canvas.posFromClient?.(point);
          return isRecord(position) &&
              typeof position.x === "number" &&
              Number.isFinite(position.x) &&
              typeof position.y === "number" &&
              Number.isFinite(position.y)
            ? { x: position.x, y: position.y }
            : null;
        } catch {
          return null;
        }
      },
    });
  }
  return views;
}

function readNodeData(value: Record<string, unknown>): unknown {
  if (typeof value.getData !== "function") return null;
  try {
    return (value as unknown as CanvasNodeDataRuntime).getData();
  } catch {
    return null;
  }
}

function areFiniteNumbers(...values: number[]): boolean {
  return values.every((value) => Number.isFinite(value));
}

function hasFiniteBounds(value: CanvasClientBounds): boolean {
  return areFiniteNumbers(value.left, value.top, value.right, value.bottom);
}

function readGroupControlBounds(nodeElement: unknown): CanvasClientBounds | null {
  if (!isRecord(nodeElement) || typeof nodeElement.querySelector !== "function") {
    return null;
  }
  try {
    const queriedNode = nodeElement as unknown as {
      querySelector(selector: string): unknown;
    };
    const control = queriedNode.querySelector(
      ":scope > .canvas-folding-group-control-host",
    );
    if (!isRecord(control) || typeof control.getBoundingClientRect !== "function") {
      return null;
    }
    const boundedControl = control as unknown as {
      getBoundingClientRect(): CanvasClientBounds;
    };
    const bounds = boundedControl.getBoundingClientRect();
    return hasFiniteBounds(bounds) ? bounds : null;
  } catch {
    return null;
  }
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
    candidate.selection instanceof Set &&
    typeof candidate.updateSelection === "function"
  );
}

function isRuntimeValueCollection(value: unknown): value is RuntimeValueCollection {
  return isRecord(value) && typeof value.values === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asCanvasDataRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) && Array.isArray(value.nodes) && Array.isArray(value.edges)
    ? value
    : null;
}

function hasRecoverableRuntimeCollapsedGroup(
  values: Iterable<unknown>,
  nodeViews: readonly CanvasNodeView[],
): boolean {
  const recoverableGroupIds = new Set(
    nodeViews
      .filter((nodeView) => nodeView.externalGroupControl === undefined)
      .map((nodeView) => nodeView.id),
  );
  for (const value of values) {
    if (
      !isRecord(value) ||
      typeof value.id !== "string" ||
      !recoverableGroupIds.has(value.id) ||
      typeof value.getData !== "function"
    ) {
      continue;
    }
    try {
      const data = (value as unknown as CanvasNodeDataRuntime).getData();
      if (
        isRecord(data) &&
        isRecord(data.collapsedData) &&
        Array.isArray(data.collapsedData.nodes) &&
        Array.isArray(data.collapsedData.edges)
      ) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

interface CanvasNodeDataRuntime {
  getData(): unknown;
}

function markGroupNodesMoved(canvas: InteractiveCanvasRuntime): void {
  if (typeof canvas.markMoved !== "function") return;
  for (const node of canvas.nodes.values()) {
    if (!isRecord(node) || typeof node.getData !== "function") continue;
    try {
      const data = (node as unknown as CanvasNodeDataRuntime).getData();
      if (isRecord(data) && data.type === "group") canvas.markMoved(node);
    } catch {
      continue;
    }
  }
}
