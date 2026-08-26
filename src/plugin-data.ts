import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasFoldingSettings,
} from "./settings-data";
import {
  normalizeBranchCollapseStateData,
  type BranchCollapseStateData,
} from "./tree/state";

export const PLUGIN_DATA_VERSION = 1;

export interface CanvasFoldingPluginData {
  canvasStates: Readonly<Record<string, BranchCollapseStateData>>;
  dataVersion: typeof PLUGIN_DATA_VERSION;
  settings: CanvasFoldingSettings;
}

export function normalizePluginData(data: unknown): CanvasFoldingPluginData {
  const root = isRecord(data) ? data : {};
  const settings = normalizeSettings(
    isRecord(root.settings) ? root.settings : root,
  );
  const canvasStates: Record<string, BranchCollapseStateData> = {};

  if (isRecord(root.canvasStates)) {
    for (const [canvasPath, value] of Object.entries(root.canvasStates)) {
      if (canvasPath.length === 0) {
        continue;
      }

      const state = normalizeBranchCollapseStateData(value);
      if (
        Object.keys(state.visibleDepths).length > 0 ||
        state.globalVisibleDepth !== undefined ||
        state.focusedNodeId !== undefined
      ) {
        canvasStates[canvasPath] = state;
      }
    }
  }

  return {
    canvasStates,
    dataVersion: PLUGIN_DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

export function isCanvasPath(path: string): boolean {
  return path.toLowerCase().endsWith(".canvas");
}

export function getSortedCanvasStatePaths<T>(
  entries: ReadonlyMap<string, T>,
): readonly string[] {
  return [...entries.keys()].sort((left, right) => left.localeCompare(right));
}

export function removePathEntries<T>(
  entries: Map<string, T>,
  path: string,
): number {
  const matchingPaths = [...entries.keys()].filter(
    (entryPath) => entryPath === path || entryPath.startsWith(`${path}/`),
  );
  for (const matchingPath of matchingPaths) {
    entries.delete(matchingPath);
  }
  return matchingPaths.length;
}

export function renamePathEntries<T>(
  entries: Map<string, T>,
  oldPath: string,
  newPath: string,
): number {
  const matchingEntries = [...entries].filter(
    ([entryPath]) =>
      entryPath === oldPath || entryPath.startsWith(`${oldPath}/`),
  );
  for (const [entryPath] of matchingEntries) {
    entries.delete(entryPath);
  }
  for (const [entryPath, value] of matchingEntries) {
    const renamedPath = `${newPath}${entryPath.slice(oldPath.length)}`;
    if (isCanvasPath(renamedPath)) {
      entries.set(renamedPath, value);
    }
  }
  return matchingEntries.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
