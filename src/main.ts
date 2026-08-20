import { Notice, Plugin } from "obsidian";

import {
  CanvasTreeSettingTab,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasTreeSettings,
} from "./settings";

export default class CanvasTreePlugin extends Plugin {
  settings: CanvasTreeSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new CanvasTreeSettingTab(this.app, this));

    this.addCommand({
      id: "show-status",
      name: "Show current status",
      callback: () => {
        new Notice("Canvas tree is loaded. Phase 1 foundation is active.");
      },
    });

    this.debug("Plugin loaded", { version: this.manifest.version });
  }

  async updateSettings(update: Partial<CanvasTreeSettings>): Promise<void> {
    this.settings = normalizeSettings({ ...this.settings, ...update });
    await this.saveData(this.settings);
  }

  private async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  private debug(message: string, details?: unknown): void {
    if (!this.settings.debugLogging) {
      return;
    }

    console.debug(`[Canvas Tree] ${message}`, details ?? "");
  }
}
