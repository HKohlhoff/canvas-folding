import type {
  ActiveCanvasContext,
  CanvasEdgeView,
  CanvasElementHandle,
  CanvasNodeInteractionLayer,
  CanvasNodeView,
} from "./adapter";
import { extractCanvasItemId } from "./runtime-elements";
import { deriveCanvasVisibility } from "../tree/visibility";

const HIDDEN_CLASS = "canvas-folding-hidden";
const DIMMED_CLASS = "canvas-folding-dimmed";
const FOCUS_OPACITY_PROPERTY = "--canvas-folding-focus-opacity";

export interface VisibilityResult {
  hiddenEdgeCount: number;
  hiddenNodeCount: number;
  dimmedEdgeCount: number;
  dimmedNodeCount: number;
}

export class CanvasVisibilityManager {
  private readonly interactionLayers = new Map<
    CanvasNodeInteractionLayer,
    ManagedInteractionLayer
  >();
  private readonly managedElements = new Map<CanvasElementHandle, object>();

  constructor(private readonly manageInteractionLayer = true) {}

  apply(
    context: ActiveCanvasContext,
    hiddenNodeIds: ReadonlySet<string>,
    dimmedNodeIds: ReadonlySet<string> = new Set(),
    focusOpacity = 20,
  ): VisibilityResult {
    const currentElements = new Set([
      ...context.nodeViews.map((nodeView) => nodeView.element),
      ...context.edgeViews.flatMap((edgeView) => edgeView.elements),
    ]);
    this.restoreMissingElements(context.leaf, currentElements);
    if (this.manageInteractionLayer) {
      this.restoreReplacedInteractionLayers(
        context.leaf,
        context.nodeInteractionLayer,
      );
    }

    const visibility = deriveCanvasVisibility(
      context.data,
      hiddenNodeIds,
      dimmedNodeIds,
    );
    const storedNodeIds = new Set(context.data.nodes.map((node) => node.id));
    const storedEdgeIds = new Set(context.data.edges.map((edge) => edge.id));
    const nodeViewVisibility = context.nodeViews.map((nodeView) => ({
      nodeView,
      visibility: resolveViewVisibility(
        nodeView,
        storedNodeIds,
        visibility.hiddenNodeIds,
        visibility.dimmedNodeIds,
        storedNodeIds,
        visibility.hiddenNodeIds,
        visibility.dimmedNodeIds,
      ),
    }));
    const edgeViewVisibility = context.edgeViews.map((edgeView) => ({
      edgeView,
      visibility: resolveViewVisibility(
        edgeView,
        storedEdgeIds,
        visibility.hiddenEdgeIds,
        visibility.dimmedEdgeIds,
        storedNodeIds,
        visibility.hiddenNodeIds,
        visibility.dimmedNodeIds,
      ),
    }));
    const inactiveNodeIds = new Set([
      ...visibility.hiddenNodeIds,
      ...visibility.dimmedNodeIds,
      ...nodeViewVisibility
        .filter(({ visibility: viewVisibility }) =>
          viewVisibility.hidden || viewVisibility.dimmed,
        )
        .map(({ nodeView }) => nodeView.id),
    ]);
    if (this.manageInteractionLayer) {
      this.updateInteractionLayer(
        context.nodeInteractionLayer,
        inactiveNodeIds,
        context.leaf,
      );
    }

    let hiddenNodeCount = 0;
    let dimmedNodeCount = 0;
    for (const { nodeView, visibility: viewVisibility } of nodeViewVisibility) {
      const { hidden, dimmed } = viewVisibility;
      this.setHidden(nodeView.element, hidden, context.leaf);
      this.setDimmed(
        nodeView.element,
        dimmed,
        focusOpacity,
        context.leaf,
      );
      if (hidden) {
        hiddenNodeCount += 1;
      }
      if (dimmed) dimmedNodeCount += 1;
    }

    let hiddenEdgeCount = 0;
    let dimmedEdgeCount = 0;
    for (const { edgeView, visibility: viewVisibility } of edgeViewVisibility) {
      const { hidden, dimmed } = viewVisibility;

      for (const element of edgeView.elements) {
        this.setHidden(element, hidden, context.leaf);
        this.setDimmed(element, dimmed, focusOpacity, context.leaf);
      }
      if (hidden) {
        hiddenEdgeCount += 1;
      }
      if (dimmed) dimmedEdgeCount += 1;
    }

    return { dimmedEdgeCount, dimmedNodeCount, hiddenEdgeCount, hiddenNodeCount };
  }

  restoreAll(): void {
    for (const element of this.managedElements.keys()) {
      this.restoreElement(element);
    }
    this.managedElements.clear();

    for (const [layer, managed] of this.interactionLayers) {
      this.restoreInteractionLayer(layer, managed);
    }
    this.interactionLayers.clear();
  }

  private updateInteractionLayer(
    layer: CanvasNodeInteractionLayer | null,
    hiddenNodeIds: ReadonlySet<string>,
    leaf: object,
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
        leaf,
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

  private restoreReplacedInteractionLayers(
    leaf: object,
    currentLayer: CanvasNodeInteractionLayer | null,
  ): void {
    for (const [layer, managed] of this.interactionLayers) {
      if (managed.leaf === leaf && layer !== currentLayer) {
        this.restoreInteractionLayer(layer, managed);
        this.interactionLayers.delete(layer);
      }
    }
  }

  private restoreInteractionLayer(
    layer: CanvasNodeInteractionLayer,
    managed: ManagedInteractionLayer,
  ): void {
    if (managed.hadOwnSetTarget) {
      layer.setTarget = managed.originalSetTarget;
    } else {
      delete (layer as Partial<CanvasNodeInteractionLayer>).setTarget;
    }
  }

  private restoreMissingElements(
    leaf: object,
    currentElements: ReadonlySet<CanvasElementHandle>,
  ): void {
    for (const [element, ownerLeaf] of this.managedElements) {
      if (ownerLeaf === leaf && !currentElements.has(element)) {
        this.restoreElement(element);
        this.managedElements.delete(element);
      }
    }
  }

  private restoreElement(element: CanvasElementHandle): void {
    element.classList.remove(HIDDEN_CLASS);
    element.classList.remove(DIMMED_CLASS);
    element.style.removeProperty(FOCUS_OPACITY_PROPERTY);
  }

  private setHidden(
    element: CanvasElementHandle,
    hidden: boolean,
    leaf: object,
  ): void {
    element.classList.toggle(HIDDEN_CLASS, hidden);
    if (hidden) {
      this.managedElements.set(element, leaf);
    } else {
      this.managedElements.delete(element);
    }
  }

  private setDimmed(
    element: CanvasElementHandle,
    dimmed: boolean,
    focusOpacity: number,
    leaf: object,
  ): void {
    element.classList.toggle(DIMMED_CLASS, dimmed);
    if (dimmed) {
      element.style.setProperty(FOCUS_OPACITY_PROPERTY, String(focusOpacity / 100));
      this.managedElements.set(element, leaf);
    } else {
      element.style.removeProperty(FOCUS_OPACITY_PROPERTY);
    }
  }
}

interface ManagedInteractionLayer {
  hadOwnSetTarget: boolean;
  hiddenNodeIds: Set<string>;
  leaf: object;
  originalSetTarget: CanvasNodeInteractionLayer["setTarget"];
}

interface RuntimeViewWithVisibilityOwner {
  id: string;
  visibilityOwnerNodeId?: string;
}

interface RuntimeViewVisibility {
  dimmed: boolean;
  hidden: boolean;
}

function resolveViewVisibility(
  view: CanvasNodeView | CanvasEdgeView | RuntimeViewWithVisibilityOwner,
  storedViewIds: ReadonlySet<string>,
  directlyHiddenIds: ReadonlySet<string>,
  directlyDimmedIds: ReadonlySet<string>,
  storedNodeIds: ReadonlySet<string>,
  hiddenNodeIds: ReadonlySet<string>,
  dimmedNodeIds: ReadonlySet<string>,
): RuntimeViewVisibility {
  const directlyHidden = directlyHiddenIds.has(view.id);
  const directlyDimmed = directlyDimmedIds.has(view.id);
  const ownerNodeId = view.visibilityOwnerNodeId;
  const inheritsOwnerVisibility =
    !storedViewIds.has(view.id) &&
    ownerNodeId !== undefined &&
    ownerNodeId.length > 0 &&
    storedNodeIds.has(ownerNodeId);
  const hidden =
    directlyHidden ||
    (inheritsOwnerVisibility && hiddenNodeIds.has(ownerNodeId));
  const dimmed =
    !hidden &&
    (directlyDimmed ||
      (inheritsOwnerVisibility && dimmedNodeIds.has(ownerNodeId)));

  return { dimmed, hidden };
}
