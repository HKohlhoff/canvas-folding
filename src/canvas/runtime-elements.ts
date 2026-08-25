export interface CanvasElementHandle {
  classList: {
    remove(...tokens: string[]): void;
    toggle(token: string, force?: boolean): boolean;
  };
  style: {
    removeProperty(property: string): string;
    setProperty(property: string, value: string): void;
  };
}

export interface CanvasNodeView {
  id: string;
  element: CanvasNodeElementHandle;
  externallyCollapsedNodeIds?: readonly string[];
}

export interface CanvasNodeElementHandle extends CanvasElementHandle {
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
  ): HTMLElementTagNameMap[K];
}

export interface CanvasEdgeView {
  id: string;
  elements: readonly CanvasElementHandle[];
}

export interface CanvasNodeInteractionLayer {
  target?: unknown;
  setTarget(target: unknown): void;
}

export interface CanvasSelectionRuntime {
  selection: Set<unknown>;
  updateSelection(update: () => void): void;
}

interface CanvasNodeDataRuntime {
  getData(): unknown;
}

export function extractCanvasNodeViews(
  values: Iterable<unknown>,
): CanvasNodeView[] {
  const nodeViews: CanvasNodeView[] = [];
  for (const value of values) {
    if (!isRecord(value) || typeof value.id !== "string") {
      continue;
    }

    const element = asCanvasNodeElement(value.nodeEl);
    if (element !== null) {
      const externallyCollapsedNodeIds = readExternallyCollapsedNodeIds(value);
      nodeViews.push({
        id: value.id,
        element,
        ...(externallyCollapsedNodeIds.length > 0
          ? { externallyCollapsedNodeIds }
          : {}),
      });
    }
  }
  return nodeViews;
}

function readExternallyCollapsedNodeIds(
  value: Record<string, unknown>,
): readonly string[] {
  if (typeof value.getData !== "function") return [];
  try {
    const data = (value as unknown as CanvasNodeDataRuntime).getData();
    if (
      !isRecord(data) ||
      data.type !== "group" ||
      data.collapsed !== true ||
      !isRecord(data.collapsedData) ||
      !Array.isArray(data.collapsedData.nodes)
    ) {
      return [];
    }
    return data.collapsedData.nodes.flatMap((node) =>
      isRecord(node) && typeof node.id === "string" ? [node.id] : [],
    );
  } catch {
    return [];
  }
}

export function extractCanvasEdgeViews(
  values: Iterable<unknown>,
): CanvasEdgeView[] {
  const edgeViews: CanvasEdgeView[] = [];
  for (const value of values) {
    if (!isRecord(value) || typeof value.id !== "string") {
      continue;
    }

    const labelWrapper = isRecord(value.labelElement)
      ? value.labelElement.wrapperEl
      : undefined;
    const interactionPath = isRecord(value.path)
      ? value.path.interaction
      : undefined;
    const elements = [
      value.lineGroupEl,
      value.lineEndGroupEl,
      interactionPath,
      labelWrapper,
    ]
      .map(asCanvasElement)
      .filter((element): element is CanvasElementHandle => element !== null);
    if (elements.length > 0) {
      edgeViews.push({ id: value.id, elements: [...new Set(elements)] });
    }
  }
  return edgeViews;
}

export function extractSelectedNodeIds(selection: Iterable<unknown>): string[] {
  const nodeIds: string[] = [];
  for (const value of selection) {
    if (
      isRecord(value) &&
      typeof value.id === "string" &&
      asCanvasNodeElement(value.nodeEl) !== null
    ) {
      nodeIds.push(value.id);
    }
  }
  return nodeIds;
}

export function extractCanvasNodeInteractionLayer(
  value: unknown,
): CanvasNodeInteractionLayer | null {
  if (!isRecord(value) || typeof value.setTarget !== "function") {
    return null;
  }

  return value as unknown as CanvasNodeInteractionLayer;
}

export function extractCanvasItemId(value: unknown): string | null {
  return isRecord(value) && typeof value.id === "string" ? value.id : null;
}

export function resolveCanvasKey(...candidatePaths: unknown[]): string {
  for (const candidatePath of candidatePaths) {
    if (typeof candidatePath === "string" && candidatePath.length > 0) {
      return candidatePath;
    }
  }
  return "canvas-view:active";
}

export function extractCanvasPathFromViewState(value: unknown): unknown {
  return isRecord(value) ? value.file : undefined;
}

export function removeSelectionByIds(
  canvas: CanvasSelectionRuntime,
  itemIds: ReadonlySet<string>,
): number {
  const retainedItems = new Set<unknown>();
  let removedCount = 0;

  for (const item of canvas.selection) {
    if (isRecord(item) && typeof item.id === "string" && itemIds.has(item.id)) {
      removedCount += 1;
    } else {
      retainedItems.add(item);
    }
  }

  if (removedCount > 0) {
    canvas.updateSelection(() => {
      canvas.selection = retainedItems;
    });
  }

  return removedCount;
}

function asCanvasNodeElement(value: unknown): CanvasNodeElementHandle | null {
  const element = asCanvasElement(value);
  if (
    element === null ||
    !isRecord(value) ||
    typeof value.createEl !== "function"
  ) {
    return null;
  }

  return value as unknown as CanvasNodeElementHandle;
}

function asCanvasElement(value: unknown): CanvasElementHandle | null {
  if (!isRecord(value) || !isRecord(value.classList)) {
    return null;
  }

  const { classList } = value;
  if (typeof classList.remove !== "function" || typeof classList.toggle !== "function") {
    return null;
  }

  return value as unknown as CanvasElementHandle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
