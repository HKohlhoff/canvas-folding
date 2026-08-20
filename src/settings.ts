import {
  App,
  Plugin,
  PluginSettingTab,
  type SettingDefinitionItem,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  type CanvasTreeSettings,
} from "./settings-data";

export {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasTreeSettings,
} from "./settings-data";

type CanvasTreeSettingKey = keyof CanvasTreeSettings;

interface CanvasTreeSettingsHost extends Plugin {
  settings: CanvasTreeSettings;
  cleanupSavedCanvasStates(): Promise<void>;
  clearSavedCanvasStates(): Promise<void>;
  hasSavedCanvasStates(): boolean;
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
            name: "Show branch controls",
            desc: "Show +/− buttons on canvas nodes that have descendants.",
            control: {
              type: "toggle",
              key: "showBranchControls",
              defaultValue: DEFAULT_SETTINGS.showBranchControls,
            },
          },
          {
            name: "Remember canvas states",
            desc: "Restore the last Canvas Tree visibility state when a canvas is reopened. Canvas files remain unchanged.",
            control: {
              type: "toggle",
              key: "rememberCanvasStates",
              defaultValue: DEFAULT_SETTINGS.rememberCanvasStates,
            },
          },
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
        heading: "Saved canvas states",
        items: [
          {
            name: "Clean up saved canvas states",
            desc: "Remove entries for canvas files that no longer exist.",
            disabled: () => !this.plugin.hasSavedCanvasStates(),
            action: () => {
              void this.plugin.cleanupSavedCanvasStates().then(() => {
                this.update();
              });
            },
          },
          {
            name: "Clear all saved canvas states",
            desc: "Delete every remembered canvas state. Current session visibility remains unchanged.",
            disabled: () => !this.plugin.hasSavedCanvasStates(),
            action: () => {
              void this.plugin.clearSavedCanvasStates().then(() => {
                this.update();
              });
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

function isSettingKey(key: string): key is CanvasTreeSettingKey {
  return (
    key === "debugLogging" ||
    key === "rememberCanvasStates" ||
    key === "showBranchControls" ||
    key === "showStatusNotices"
  );
}
