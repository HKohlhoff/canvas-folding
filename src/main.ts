import { Notice, Plugin } from "obsidian";

type PluginTemplateSettings = {
  exampleSetting: string;
};

const DEFAULT_SETTINGS: PluginTemplateSettings = {
  exampleSetting: "Ready",
};

function normalizeSettings(data: unknown): PluginTemplateSettings {
  if (typeof data !== "object" || data === null) {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = data as Partial<PluginTemplateSettings>;
  return {
    exampleSetting:
      typeof candidate.exampleSetting === "string"
        ? candidate.exampleSetting
        : DEFAULT_SETTINGS.exampleSetting,
  };
}

export default class PluginTemplate extends Plugin {
  settings: PluginTemplateSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "show-status",
      name: "Show status",
      callback: () => {
        new Notice(`Plugin template: ${this.settings.exampleSetting}`);
      },
    });
  }

  private async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
