export interface CanvasElementHandle {
  classList: {
    remove(...tokens: string[]): void;
    toggle(token: string, force?: boolean): boolean;
  };
}

export interface CanvasNodeView {
  id: string;
  element: CanvasNodeElementHandle;
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
      nodeViews.push({ id: value.id, element });
    }
  }
  return nodeViews;
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
    const elements = [value.lineGroupEl, value.lineEndGroupEl, labelWrapper]
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
