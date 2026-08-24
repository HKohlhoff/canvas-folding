import { App, Plugin, PluginSettingTab } from "obsidian";
import {
  getCanvasFoldingSettingDefinitions,
  type CanvasFoldingSettingsDefinitionHost,
} from "./settings-definitions";
import type { CanvasFoldingSettings } from "./settings-data";

export {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasFoldingSettings,
} from "./settings-data";

type CanvasFoldingSettingKey = keyof CanvasFoldingSettings;

interface CanvasFoldingSettingsHost
  extends Plugin, CanvasFoldingSettingsDefinitionHost {
  settings: CanvasFoldingSettings;
  updateSettings(update: Partial<CanvasFoldingSettings>): Promise<void>;
}

export class CanvasFoldingSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: CanvasFoldingSettingsHost) {
    super(app, plugin);
  }

  getSettingDefinitions() {
    return getCanvasFoldingSettingDefinitions(this.plugin, () => this.update());
  }

  getControlValue(key: string): unknown {
    return isSettingKey(key) ? this.plugin.settings[key] : undefined;
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isSettingKey(key)) return;

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
