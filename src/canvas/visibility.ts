import type {
  ActiveCanvasContext,
  CanvasElementHandle,
  CanvasNodeInteractionLayer,
} from "./adapter";
import { extractCanvasItemId } from "./runtime-elements";

const HIDDEN_CLASS = "canvas-folding-hidden";
const DIMMED_CLASS = "canvas-folding-dimmed";
const FOCUS_OPACITY_PROPERTY = "--canvas-folding-focus-opacity";

export interface VisibilityResult {
  hiddenEdgeCount: number;
  hiddenNodeCount: number;
  dimmedEdgeCount: number;
  dimmedNodeCount: number;
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
    dimmedNodeIds: ReadonlySet<string> = new Set(),
    focusOpacity = 20,
  ): VisibilityResult {
    const inactiveNodeIds = new Set([...hiddenNodeIds, ...dimmedNodeIds]);
    this.updateInteractionLayer(context.nodeInteractionLayer, inactiveNodeIds);

    let hiddenNodeCount = 0;
    let dimmedNodeCount = 0;
    for (const nodeView of context.nodeViews) {
      const hidden = hiddenNodeIds.has(nodeView.id);
      const dimmed = !hidden && dimmedNodeIds.has(nodeView.id);
      this.setHidden(nodeView.element, hidden);
      this.setDimmed(nodeView.element, dimmed, focusOpacity);
      if (hidden) {
        hiddenNodeCount += 1;
      }
      if (dimmed) dimmedNodeCount += 1;
    }

    const edgesById = new Map(context.data.edges.map((edge) => [edge.id, edge]));
    let hiddenEdgeCount = 0;
    let dimmedEdgeCount = 0;
    for (const edgeView of context.edgeViews) {
      const edge = edgesById.get(edgeView.id);
      const hidden =
        edge !== undefined &&
        (hiddenNodeIds.has(edge.fromNode) || hiddenNodeIds.has(edge.toNode));
      const dimmed =
        !hidden &&
        edge !== undefined &&
        (dimmedNodeIds.has(edge.fromNode) || dimmedNodeIds.has(edge.toNode));

      for (const element of edgeView.elements) {
        this.setHidden(element, hidden);
        this.setDimmed(element, dimmed, focusOpacity);
      }
      if (hidden) {
        hiddenEdgeCount += 1;
      }
      if (dimmed) dimmedEdgeCount += 1;
    }

    return { dimmedEdgeCount, dimmedNodeCount, hiddenEdgeCount, hiddenNodeCount };
  }

  restoreAll(): void {
    for (const element of this.managedElements) {
      element.classList.remove(HIDDEN_CLASS);
      element.classList.remove(DIMMED_CLASS);
      element.style.removeProperty(FOCUS_OPACITY_PROPERTY);
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

  private setDimmed(
    element: CanvasElementHandle,
    dimmed: boolean,
    focusOpacity: number,
  ): void {
    element.classList.toggle(DIMMED_CLASS, dimmed);
    if (dimmed) {
      element.style.setProperty(FOCUS_OPACITY_PROPERTY, String(focusOpacity / 100));
      this.managedElements.add(element);
    } else {
      element.style.removeProperty(FOCUS_OPACITY_PROPERTY);
    }
  }
}

interface ManagedInteractionLayer {
  hadOwnSetTarget: boolean;
  hiddenNodeIds: Set<string>;
  originalSetTarget: CanvasNodeInteractionLayer["setTarget"];
}
