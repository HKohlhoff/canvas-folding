import { Notice, Plugin } from "obsidian";

import { readActiveCanvasSnapshot } from "./canvas/adapter";
import {
  CanvasTreeSettingTab,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasTreeSettings,
} from "./settings";
import { buildCanvasGraph, describeCanvasGraph } from "./tree/graph";

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

    this.addCommand({
      id: "inspect-active-canvas-graph",
      name: "Inspect active canvas graph",
      checkCallback: (checking) => {
        const snapshot = readActiveCanvasSnapshot(this.app);
        if (!snapshot.ok) {
          if (!checking && this.settings.showStatusNotices) {
            new Notice(snapshot.message);
          }
          return false;
        }

        if (!checking) {
          this.logCanvasGraph(snapshot.data);
        }
        return true;
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

  private logCanvasGraph(
    data: Parameters<typeof buildCanvasGraph>[0],
  ): void {
    const summary = describeCanvasGraph(buildCanvasGraph(data));
    const filePath = this.app.workspace.getActiveFile()?.path ?? null;

    this.debug("Active canvas graph", {
      filePath,
      ...summary,
    });

    if (this.settings.showStatusNotices) {
      new Notice(
        `Canvas tree: ${summary.nodeCount} nodes, ${summary.edgeCount} edges, ${summary.rootIds.length} roots.`,
      );
    }
  }
}
