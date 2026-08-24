import type { CanvasGraph } from "./tree/graph";
import {
  BranchCollapseState,
  type BranchCollapseStateData,
} from "./tree/state";
import { deriveCanvasVisibility } from "./tree/visibility";

export const CANVAS_FOLDING_API_VERSION = 1 as const;

export type CanvasFoldStateSource = "active-leaf" | "persisted";

export interface CanvasFoldStateSnapshot {
  readonly canvasPath: string;
  readonly hiddenEdgeIds: readonly string[];
  readonly hiddenNodeIds: readonly string[];
  readonly source: CanvasFoldStateSource;
}

export interface CanvasFoldingApi {
  readonly apiVersion: typeof CANVAS_FOLDING_API_VERSION;
  getFoldState(canvasPath: string): Promise<CanvasFoldStateSnapshot | null>;
}

export interface ActiveCanvasFoldState {
  readonly canvasPath: string;
  readonly data: BranchCollapseStateData;
}

export interface SelectedCanvasFoldState {
  readonly data: BranchCollapseStateData;
  readonly source: CanvasFoldStateSource;
}

export function selectCanvasFoldState(
  canvasPath: string,
  activeState: ActiveCanvasFoldState | null,
  persistedState: BranchCollapseStateData | undefined,
  persistenceEnabled: boolean,
): SelectedCanvasFoldState | null {
  if (activeState?.canvasPath === canvasPath) {
    return { data: activeState.data, source: "active-leaf" };
  }
  if (!persistenceEnabled || persistedState === undefined) {
    return null;
  }
  return { data: persistedState, source: "persisted" };
}

export function createCanvasFoldStateSnapshot(
  canvasPath: string,
  source: CanvasFoldStateSource,
  data: BranchCollapseStateData,
  graph: CanvasGraph,
): CanvasFoldStateSnapshot {
  const state = BranchCollapseState.fromData(data);
  const visibility = deriveCanvasVisibility(
    graph,
    state.getHiddenNodeIds(graph),
  );
  return Object.freeze({
    canvasPath,
    hiddenEdgeIds: Object.freeze([...visibility.hiddenEdgeIds]),
    hiddenNodeIds: Object.freeze([...visibility.hiddenNodeIds]),
    source,
  });
}
