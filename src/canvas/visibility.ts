import type {
  ActiveCanvasContext,
  CanvasElementHandle,
} from "./adapter";

const HIDDEN_CLASS = "canvas-tree-hidden";

export interface VisibilityResult {
  hiddenEdgeCount: number;
  hiddenNodeCount: number;
}

export class CanvasVisibilityManager {
  private readonly managedElements = new Set<CanvasElementHandle>();

  apply(
    context: ActiveCanvasContext,
    hiddenNodeIds: ReadonlySet<string>,
  ): VisibilityResult {
    let hiddenNodeCount = 0;
    for (const nodeView of context.nodeViews) {
      const hidden = hiddenNodeIds.has(nodeView.id);
      this.setHidden(nodeView.element, hidden);
      if (hidden) {
        hiddenNodeCount += 1;
      }
    }

    const edgesById = new Map(context.data.edges.map((edge) => [edge.id, edge]));
    let hiddenEdgeCount = 0;
    for (const edgeView of context.edgeViews) {
      const edge = edgesById.get(edgeView.id);
      const hidden =
        edge !== undefined &&
        (hiddenNodeIds.has(edge.fromNode) || hiddenNodeIds.has(edge.toNode));

      for (const element of edgeView.elements) {
        this.setHidden(element, hidden);
      }
      if (hidden) {
        hiddenEdgeCount += 1;
      }
    }

    return { hiddenEdgeCount, hiddenNodeCount };
  }

  restoreAll(): void {
    for (const element of this.managedElements) {
      element.classList.remove(HIDDEN_CLASS);
    }
    this.managedElements.clear();
  }

  private setHidden(element: CanvasElementHandle, hidden: boolean): void {
    element.classList.toggle(HIDDEN_CLASS, hidden);
    if (hidden) {
      this.managedElements.add(element);
    } else {
      this.managedElements.delete(element);
    }
  }
}
