import type {
  ActiveCanvasContext,
  CanvasGroupGeometryView,
  CanvasGroupRuntime,
} from "./adapter";

interface CanvasBoundsRecord {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  [key: string]: unknown;
}

interface ManagedGroupGeometry {
  hadOwnGetBBox: boolean;
  leaf: object;
  originalGetBBox: CanvasGroupRuntime["getBBox"];
  view: CanvasGroupGeometryView;
}

export class CanvasGroupGeometryManager {
  private readonly managed = new Map<CanvasGroupRuntime, ManagedGroupGeometry>();

  sync(
    context: ActiveCanvasContext,
    collapsedGroupIds: ReadonlySet<string>,
  ): void {
    const geometryViews = context.groupGeometryViews ?? [];
    const currentRuntimes = new Set(
      geometryViews.map((view) => view.runtime),
    );
    for (const [runtime, entry] of this.managed) {
      if (
        entry.leaf === context.leaf &&
        (!currentRuntimes.has(runtime) || !collapsedGroupIds.has(entry.view.id))
      ) {
        this.restore(runtime, entry);
      }
    }

    for (const view of geometryViews) {
      if (!collapsedGroupIds.has(view.id) || this.managed.has(view.runtime)) {
        continue;
      }
      this.install(context.leaf, view);
    }
  }

  restoreAll(): void {
    for (const [runtime, entry] of this.managed) {
      this.restore(runtime, entry);
    }
  }

  refresh(context: ActiveCanvasContext): void {
    const currentRuntimes = new Set(
      (context.groupGeometryViews ?? []).map((view) => view.runtime),
    );
    for (const [runtime, entry] of this.managed) {
      if (entry.leaf === context.leaf && currentRuntimes.has(runtime)) {
        entry.view.markMoved();
      }
    }
  }

  restoreLeavesExcept(attachedLeaves: ReadonlySet<object>): void {
    for (const [runtime, entry] of this.managed) {
      if (!attachedLeaves.has(entry.leaf)) this.restore(runtime, entry);
    }
  }

  private install(leaf: object, view: CanvasGroupGeometryView): void {
    const originalGetBBox: CanvasGroupRuntime["getBBox"] = Reflect.get(
      view.runtime,
      "getBBox",
    );
    const entry: ManagedGroupGeometry = {
      hadOwnGetBBox: Object.prototype.hasOwnProperty.call(
        view.runtime,
        "getBBox",
      ),
      leaf,
      originalGetBBox,
      view,
    };
    view.runtime.getBBox = function (...args: unknown[]): unknown {
      const originalBounds = originalGetBBox.apply(this, args);
      const bounds = asCanvasBounds(originalBounds);
      const labelBounds = view.getLabelBounds();
      if (bounds === null || labelBounds === null) return originalBounds;

      const min = view.toCanvasPosition({
        x: labelBounds.left,
        y: labelBounds.top,
      });
      const max = view.toCanvasPosition({
        x: labelBounds.right,
        y: labelBounds.bottom,
      });
      if (min === null || max === null) return originalBounds;

      bounds.minX = Math.min(min.x, max.x);
      bounds.minY = Math.min(min.y, max.y);
      bounds.maxX = Math.max(min.x, max.x);
      bounds.maxY = Math.max(min.y, max.y);
      return bounds;
    };
    this.managed.set(view.runtime, entry);
    view.markMoved();
  }

  private restore(
    runtime: CanvasGroupRuntime,
    entry: ManagedGroupGeometry,
  ): void {
    if (entry.hadOwnGetBBox) runtime.getBBox = entry.originalGetBBox;
    else delete (runtime as Partial<CanvasGroupRuntime>).getBBox;
    this.managed.delete(runtime);
    entry.view.markMoved();
  }
}

function asCanvasBounds(value: unknown): CanvasBoundsRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<CanvasBoundsRecord>;
  return [candidate.minX, candidate.minY, candidate.maxX, candidate.maxY]
      .every((coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
      )
    ? candidate as CanvasBoundsRecord
    : null;
}
