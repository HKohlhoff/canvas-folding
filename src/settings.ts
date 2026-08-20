import {
  App,
  Plugin,
  PluginSettingTab,
  type SettingDefinitionItem,
} from "obsidian";

export interface CanvasTreeSettings {
  debugLogging: boolean;
  showStatusNotices: boolean;
}

export const DEFAULT_SETTINGS: Readonly<CanvasTreeSettings> = {
  debugLogging: false,
  showStatusNotices: true,
};

export function normalizeSettings(data: unknown): CanvasTreeSettings {
  if (!isRecord(data)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    debugLogging: readBoolean(data, "debugLogging", DEFAULT_SETTINGS.debugLogging),
    showStatusNotices: readBoolean(
      data,
      "showStatusNotices",
      DEFAULT_SETTINGS.showStatusNotices,
    ),
  };
}

type CanvasTreeSettingKey = keyof CanvasTreeSettings;

interface CanvasTreeSettingsHost extends Plugin {
  settings: CanvasTreeSettings;
  updateSettings(update: Partial<CanvasTreeSettings>): Promise<void>;
}

export class CanvasTreeSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: CanvasTreeSettingsHost) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<CanvasTreeSettingKey>[] {
    return [
      {
        type: "group",
        heading: "Behavior",
        items: [
          {
            name: "Show status notices",
            desc: "Show confirmations after canvas tree actions.",
            control: {
              type: "toggle",
              key: "showStatusNotices",
              defaultValue: DEFAULT_SETTINGS.showStatusNotices,
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Diagnostics",
        items: [
          {
            name: "Debug logging",
            desc: "Write canvas tree diagnostics to the developer console.",
            control: {
              type: "toggle",
              key: "debugLogging",
              defaultValue: DEFAULT_SETTINGS.debugLogging,
            },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    return isSettingKey(key) ? this.plugin.settings[key] : undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingKey(key) || typeof value !== "boolean") {
      return;
    }

    await this.plugin.updateSettings({ [key]: value });
  }
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

function isSettingKey(key: string): key is CanvasTreeSettingKey {
  return key === "debugLogging" || key === "showStatusNotices";
}
