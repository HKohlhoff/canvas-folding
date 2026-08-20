import { Notice, Plugin } from "obsidian";

import {
  readActiveCanvasContext,
  readActiveCanvasSnapshot,
  type ActiveCanvasContext,
} from "./canvas/adapter";
import { CanvasVisibilityManager } from "./canvas/visibility";
import {
  CanvasTreeSettingTab,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasTreeSettings,
} from "./settings";
import {
  buildCanvasGraph,
  describeCanvasGraph,
  getDescendantIds,
} from "./tree/graph";
import { BranchCollapseState } from "./tree/state";

export default class CanvasTreePlugin extends Plugin {
  settings: CanvasTreeSettings = { ...DEFAULT_SETTINGS };
  private readonly collapseStates = new Map<string, BranchCollapseState>();
  private readonly visibility = new CanvasVisibilityManager();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new CanvasTreeSettingTab(this.app, this));

    this.addCommand({
      id: "show-status",
      name: "Show current status",
      callback: () => {
        new Notice("Canvas tree branch prototype is active.");
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

    this.addCommand({
      id: "collapse-selected-branch",
      name: "Collapse selected branch",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.collapseSelectedBranch(context);
        }),
    });

    this.addCommand({
      id: "expand-selected-branch",
      name: "Expand selected branch",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.expandSelectedBranch(context);
        }),
    });

    this.addCommand({
      id: "expand-all-branches",
      name: "Expand all branches",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.expandAllBranches(context);
        }),
    });

    this.debug("Plugin loaded", { version: this.manifest.version });
  }

  onunload(): void {
    this.visibility.restoreAll();
    this.collapseStates.clear();
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

  private runActiveCanvasCommand(
    checking: boolean,
    action: (context: ActiveCanvasContext) => void,
  ): boolean {
    const result = readActiveCanvasContext(this.app);
    if (!result.ok) {
      if (!checking) {
        new Notice(result.message);
      }
      return false;
    }

    if (!checking) {
      action(result.context);
    }
    return true;
  }

  private collapseSelectedBranch(context: ActiveCanvasContext): void {
    const selectedNodeId = this.getSingleSelectedNodeId(context);
    if (selectedNodeId === null) {
      return;
    }

    const graph = buildCanvasGraph(context.data);
    const descendants = getDescendantIds(graph, selectedNodeId);
    if (descendants.length === 0) {
      new Notice("The selected node has no descendants to collapse.");
      return;
    }

    const state = this.getCollapseState(context.key);
    if (state.isCollapsed(selectedNodeId)) {
      new Notice("The selected branch is already collapsed.");
      return;
    }

    state.collapse(selectedNodeId);
    const result = this.visibility.apply(context, state.getHiddenNodeIds(graph));
    this.debug("Collapsed branch", { selectedNodeId, ...result });
    this.notifySuccess(`Collapsed branch with ${descendants.length} descendants.`);
  }

  private expandSelectedBranch(context: ActiveCanvasContext): void {
    const selectedNodeId = this.getSingleSelectedNodeId(context);
    if (selectedNodeId === null) {
      return;
    }

    const state = this.getCollapseState(context.key);
    if (!state.isCollapsed(selectedNodeId)) {
      new Notice("The selected branch is not collapsed.");
      return;
    }

    state.expand(selectedNodeId);
    const graph = buildCanvasGraph(context.data);
    const result = this.visibility.apply(context, state.getHiddenNodeIds(graph));
    this.debug("Expanded branch", { selectedNodeId, ...result });
    this.notifySuccess("Expanded selected branch.");
  }

  private expandAllBranches(context: ActiveCanvasContext): void {
    const state = this.getCollapseState(context.key);
    state.expandAll();

    const result = this.visibility.apply(context, new Set());
    this.debug("Expanded all branches", result);
    this.notifySuccess("Expanded all branches.");
  }

  private getSingleSelectedNodeId(context: ActiveCanvasContext): string | null {
    if (context.selectedNodeIds.length !== 1) {
      new Notice("Select exactly one canvas node first.");
      return null;
    }

    return context.selectedNodeIds[0] ?? null;
  }

  private getCollapseState(canvasKey: string): BranchCollapseState {
    const existing = this.collapseStates.get(canvasKey);
    if (existing !== undefined) {
      return existing;
    }

    const state = new BranchCollapseState();
    this.collapseStates.set(canvasKey, state);
    return state;
  }

  private notifySuccess(message: string): void {
    if (this.settings.showStatusNotices) {
      new Notice(message);
    }
  }
}
