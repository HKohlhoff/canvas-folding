import type {
  ActiveCanvasContext,
  CanvasElementHandle,
  CanvasNodeInteractionLayer,
} from "./adapter";
import { extractCanvasItemId } from "./runtime-elements";

const HIDDEN_CLASS = "canvas-tree-hidden";

export interface VisibilityResult {
  hiddenEdgeCount: number;
  hiddenNodeCount: number;
}

export function getHiddenEdgeIds(
  context: Pick<ActiveCanvasContext, "data">,
  hiddenNodeIds: ReadonlySet<string>,
): ReadonlySet<string> {
  return new Set(
    context.data.edges
      .filter(
        (edge) =>
          hiddenNodeIds.has(edge.fromNode) || hiddenNodeIds.has(edge.toNode),
      )
      .map((edge) => edge.id),
  );
}

export class CanvasVisibilityManager {
  private readonly interactionLayers = new Map<
    CanvasNodeInteractionLayer,
    ManagedInteractionLayer
  >();
  private readonly managedElements = new Set<CanvasElementHandle>();

  apply(
    context: ActiveCanvasContext,
    hiddenNodeIds: ReadonlySet<string>,
  ): VisibilityResult {
    this.updateInteractionLayer(context.nodeInteractionLayer, hiddenNodeIds);

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

    for (const [layer, managed] of this.interactionLayers) {
      if (managed.hadOwnSetTarget) {
        layer.setTarget = managed.originalSetTarget;
      } else {
        delete (layer as Partial<CanvasNodeInteractionLayer>).setTarget;
      }
    }
    this.interactionLayers.clear();
  }

  private updateInteractionLayer(
    layer: CanvasNodeInteractionLayer | null,
    hiddenNodeIds: ReadonlySet<string>,
  ): void {
    if (layer === null) {
      return;
    }

    let managed = this.interactionLayers.get(layer);
    if (managed === undefined) {
      const originalSetTarget = Reflect.get(layer, "setTarget");
      const entry: ManagedInteractionLayer = {
        hadOwnSetTarget: Object.prototype.hasOwnProperty.call(
          layer,
          "setTarget",
        ),
        hiddenNodeIds: new Set(),
        originalSetTarget,
      };
      this.interactionLayers.set(layer, entry);
      managed = entry;

      layer.setTarget = (target) => {
        const targetId = extractCanvasItemId(target);
        entry.originalSetTarget.call(
          layer,
          targetId !== null && entry.hiddenNodeIds.has(targetId)
            ? null
            : target,
        );
      };
    }

    managed.hiddenNodeIds = new Set(hiddenNodeIds);
    const targetId = extractCanvasItemId(layer.target);
    if (targetId !== null && managed.hiddenNodeIds.has(targetId)) {
      layer.setTarget(null);
    }
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

interface ManagedInteractionLayer {
  hadOwnSetTarget: boolean;
  hiddenNodeIds: Set<string>;
  originalSetTarget: CanvasNodeInteractionLayer["setTarget"];
}
