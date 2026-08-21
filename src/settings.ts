import {
  App,
  Plugin,
  PluginSettingTab,
  type SettingDefinitionItem,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  type CanvasFoldingSettings,
} from "./settings-data";

export {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasFoldingSettings,
} from "./settings-data";

type CanvasFoldingSettingKey = keyof CanvasFoldingSettings;

interface CanvasFoldingSettingsHost extends Plugin {
  settings: CanvasFoldingSettings;
  cleanupSavedCanvasStates(): Promise<void>;
  clearSavedCanvasStates(): Promise<void>;
  hasSavedCanvasStates(): boolean;
  updateSettings(update: Partial<CanvasFoldingSettings>): Promise<void>;
}

export class CanvasFoldingSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: CanvasFoldingSettingsHost) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<CanvasFoldingSettingKey>[] {
    return [
      {
        type: "group",
        heading: "Behavior",
        items: [
          {
            name: "Show canvas toolbar initially",
            desc: "Show the Canvas Folding command toolbar when the plugin loads. Use the command palette to show, hide, or toggle it at any time.",
            control: {
              type: "toggle",
              key: "showCanvasToolbar",
              defaultValue: DEFAULT_SETTINGS.showCanvasToolbar,
            },
          },
          {
            name: "Background opacity during branch focus",
            desc: "Set the opacity of nodes and edges outside the focused branch.",
            control: {
              type: "slider",
              key: "focusBackgroundOpacity",
              defaultValue: DEFAULT_SETTINGS.focusBackgroundOpacity,
              min: 5,
              max: 60,
              step: 5,
              displayFormat: (value) => `${value}%`,
            },
          },
          {
            name: "Show branch controls initially",
            desc: "Set the initial visibility of +/− controls when Canvas Folding loads. Use the command palette at any time to show, hide, or toggle them.",
            control: {
              type: "toggle",
              key: "showBranchControls",
              defaultValue: DEFAULT_SETTINGS.showBranchControls,
            },
          },
          {
            name: "Show status notices",
            desc: "Show confirmations after Canvas Folding actions.",
            control: {
              type: "toggle",
              key: "showStatusNotices",
              defaultValue: DEFAULT_SETTINGS.showStatusNotices,
            },
          },
          {
            name: "Remember canvas states between sessions",
            desc: "Canvas Folding remembers states in each open tab for back navigation. Enable this to also restore them in newly opened tabs and after Obsidian or the plugin restarts. Canvas files remain unchanged.",
            control: {
              type: "toggle",
              key: "rememberCanvasStates",
              defaultValue: DEFAULT_SETTINGS.rememberCanvasStates,
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Persisted canvas states",
        items: [
          {
            name: "Clean up persisted canvas states",
            desc: "Remove persisted entries for canvas files and nodes that no longer exist.",
            render: (setting) => {
              setting.addButton((button) => {
                button
                  .setButtonText("Clean up")
                  .setDisabled(!this.plugin.hasSavedCanvasStates())
                  .onClick(async () => {
                    await this.plugin.cleanupSavedCanvasStates();
                    this.update();
                  });
              });
            },
          },
          {
            name: "Clear all persisted canvas states",
            desc: "Delete all states stored between sessions. States and visibility in currently open tabs remain unchanged.",
            render: (setting) => {
              setting.addButton((button) => {
                button
                  .setButtonText("Clear all")
                  .setDestructive()
                  .setDisabled(!this.plugin.hasSavedCanvasStates())
                  .onClick(async () => {
                    await this.plugin.clearSavedCanvasStates();
                    this.update();
                  });
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
            desc: "Write Canvas Folding diagnostics to the developer console.",
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
    if (!isSettingKey(key)) {
      return;
    }

    if (key === "focusBackgroundOpacity") {
      if (typeof value === "number") {
        await this.plugin.updateSettings({ [key]: value });
      }
      return;
    }
    if (typeof value !== "boolean") return;

    await this.plugin.updateSettings({ [key]: value });
  }
}

function isSettingKey(key: string): key is CanvasFoldingSettingKey {
  return (
    key === "debugLogging" ||
    key === "focusBackgroundOpacity" ||
    key === "rememberCanvasStates" ||
    key === "showBranchControls" ||
    key === "showCanvasToolbar" ||
    key === "showStatusNotices"
  );
}
