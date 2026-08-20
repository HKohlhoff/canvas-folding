export interface CanvasTreeSettings {
  debugLogging: boolean;
  rememberCanvasStates: boolean;
  showBranchControls: boolean;
  showStatusNotices: boolean;
}

export const DEFAULT_SETTINGS: Readonly<CanvasTreeSettings> = {
  debugLogging: false,
  rememberCanvasStates: false,
  showBranchControls: true,
  showStatusNotices: true,
};

export function normalizeSettings(data: unknown): CanvasTreeSettings {
  if (!isRecord(data)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    debugLogging: readBoolean(data, "debugLogging", DEFAULT_SETTINGS.debugLogging),
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
    showStatusNotices: readBoolean(
      data,
      "showStatusNotices",
      DEFAULT_SETTINGS.showStatusNotices,
    ),
  };
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
