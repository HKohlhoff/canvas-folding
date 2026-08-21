export interface CanvasFoldingSettings {
  debugLogging: boolean;
  focusBackgroundOpacity: number;
  rememberCanvasStates: boolean;
  showBranchControls: boolean;
  showCanvasToolbar: boolean;
  showStatusNotices: boolean;
  toolbarPositionXPercent: number;
  toolbarPositionYPixels: number;
}

export const DEFAULT_SETTINGS: Readonly<CanvasFoldingSettings> = {
  debugLogging: false,
  focusBackgroundOpacity: 20,
  rememberCanvasStates: false,
  showBranchControls: true,
  showCanvasToolbar: true,
  showStatusNotices: true,
  toolbarPositionXPercent: 50,
  toolbarPositionYPixels: 8,
};

export function normalizeSettings(data: unknown): CanvasFoldingSettings {
  if (!isRecord(data)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    debugLogging: readBoolean(data, "debugLogging", DEFAULT_SETTINGS.debugLogging),
    focusBackgroundOpacity: readNumber(
      data,
      "focusBackgroundOpacity",
      DEFAULT_SETTINGS.focusBackgroundOpacity,
      5,
      60,
    ),
    rememberCanvasStates: readBoolean(
      data,
      "rememberCanvasStates",
      DEFAULT_SETTINGS.rememberCanvasStates,
    ),
    showBranchControls: readBoolean(
      data,
      "showBranchControls",
      DEFAULT_SETTINGS.showBranchControls,
    ),
    showCanvasToolbar: readBoolean(
      data,
      "showCanvasToolbar",
      DEFAULT_SETTINGS.showCanvasToolbar,
    ),
    showStatusNotices: readBoolean(
      data,
      "showStatusNotices",
      DEFAULT_SETTINGS.showStatusNotices,
    ),
    toolbarPositionXPercent: readNumber(
      data,
      "toolbarPositionXPercent",
      DEFAULT_SETTINGS.toolbarPositionXPercent,
      0,
      100,
    ),
    toolbarPositionYPixels: readNumber(
      data,
      "toolbarPositionYPixels",
      DEFAULT_SETTINGS.toolbarPositionYPixels,
      0,
      5000,
    ),
  };
}

function readNumber(
  data: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readBoolean(
  data: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = data[key];
  return typeof value === "boolean" ? value : fallback;
}
