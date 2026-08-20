import { Menu, Notice, Plugin, TFile } from "obsidian";

import {
  readActiveCanvasContext,
  readActiveCanvasSnapshot,
  type ActiveCanvasContext,
} from "./canvas/adapter";
import {
  CanvasVisibilityManager,
  getHiddenEdgeIds,
  type VisibilityResult,
} from "./canvas/visibility";
import {
  isCanvasPath,
  normalizePluginData,
  PLUGIN_DATA_VERSION,
  removePathEntries,
  renamePathEntries,
  type CanvasTreePluginData,
} from "./plugin-data";
import {
  CanvasTreeSettingTab,
  DEFAULT_SETTINGS,
  normalizeSettings,
  type CanvasTreeSettings,
} from "./settings";
import {
  buildCanvasGraph,
  describeCanvasGraph,
  getDescendantDepths,
  getDescendantIds,
} from "./tree/graph";
import {
  BranchCollapseState,
  type BranchCollapseStateData,
} from "./tree/state";
import { CanvasBranchControlManager } from "./ui/branch-controls";
import { buildBranchControlModels } from "./ui/control-model";

const MAX_DEPTH_MENU_LEVELS = 5;
const PERSISTENCE_SAVE_DELAY_MS = 250;

export default class CanvasTreePlugin extends Plugin {
  settings: CanvasTreeSettings = { ...DEFAULT_SETTINGS };
  private readonly branchControls = new CanvasBranchControlManager();
  private branchControlsVisible = DEFAULT_SETTINGS.showBranchControls;
  private readonly collapseStates = new Map<string, BranchCollapseState>();
  private dataSaveChain: Promise<void> = Promise.resolve();
  private dataSaveTimer: number | null = null;
  private readonly savedCanvasStates = new Map<
    string,
    BranchCollapseStateData
  >();
  private readonly visibility = new CanvasVisibilityManager();

  async onload(): Promise<void> {
    await this.loadPluginData();
    this.cleanupMissingCanvasStates();
    await this.writePluginData();
    this.branchControlsVisible = this.settings.showBranchControls;

    this.addSettingTab(new CanvasTreeSettingTab(this.app, this));

    this.addCommand({
      id: "show-status",
      name: "Show current status",
      callback: () => {
        new Notice("Canvas tree branch prototype is active.");
      },
    });

    this.addCommand({
      id: "show-branch-controls",
      name: "Show branch controls",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.branchControlsVisible = true;
          this.syncBranchControls(context);
          this.notifySuccess("Branch controls are visible.");
        }),
    });

    this.addCommand({
      id: "hide-branch-controls",
      name: "Hide branch controls",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, () => {
          this.branchControlsVisible = false;
          this.branchControls.removeAll();
          this.notifySuccess("Branch controls are hidden.");
        }),
    });

    this.addCommand({
      id: "toggle-branch-controls",
      name: "Toggle branch controls",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.branchControlsVisible = !this.branchControlsVisible;
          if (this.branchControlsVisible) {
            this.syncBranchControls(context);
          } else {
            this.branchControls.removeAll();
          }
          this.notifySuccess(
            `Branch controls are ${this.branchControlsVisible ? "visible" : "hidden"}.`,
          );
        }),
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

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshActiveCanvasState();
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.removeCanvasStatePath(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.renameCanvasStatePath(oldPath, file.path);
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.refreshActiveCanvasState();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.refreshActiveCanvasState();
      }),
    );
    this.app.workspace.onLayoutReady(() => {
      this.refreshActiveCanvasState();
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
    if (this.dataSaveTimer !== null) {
      window.clearTimeout(this.dataSaveTimer);
      this.dataSaveTimer = null;
      void this.writePluginData();
    }
    this.branchControls.removeAll();
    this.visibility.restoreAll();
    this.collapseStates.clear();
  }

  async updateSettings(update: Partial<CanvasTreeSettings>): Promise<void> {
    const wasRememberingCanvasStates = this.settings.rememberCanvasStates;
    this.settings = normalizeSettings({ ...this.settings, ...update });

    if (
      !wasRememberingCanvasStates &&
      this.settings.rememberCanvasStates
    ) {
      for (const [canvasPath, state] of [...this.collapseStates]) {
        if (state.isEmpty() && this.savedCanvasStates.has(canvasPath)) {
          this.collapseStates.delete(canvasPath);
          continue;
        }
        this.storeCanvasState(canvasPath, state);
      }
    }

    await this.flushPluginDataSave();

    if (typeof update.showBranchControls === "boolean") {
      this.branchControlsVisible = update.showBranchControls;
      if (this.branchControlsVisible) {
        this.refreshActiveCanvasState();
      } else {
        this.branchControls.removeAll();
      }
    }

    if (typeof update.rememberCanvasStates === "boolean") {
      this.refreshActiveCanvasState();
    }
  }

  hasSavedCanvasStates(): boolean {
    return this.savedCanvasStates.size > 0;
  }

  async cleanupSavedCanvasStates(): Promise<void> {
    const removedCount = this.cleanupMissingCanvasStates();
    if (removedCount > 0) {
      await this.flushPluginDataSave();
    }
    new Notice(
      removedCount === 0
        ? "Canvas Tree: no stale saved states found."
        : `Canvas Tree: removed ${removedCount} stale saved state${removedCount === 1 ? "" : "s"}.`,
    );
  }

  async clearSavedCanvasStates(): Promise<void> {
    this.savedCanvasStates.clear();
    await this.flushPluginDataSave();
    new Notice("Canvas tree: cleared all saved canvas states.");
  }

  private async loadPluginData(): Promise<void> {
    const data = normalizePluginData(await this.loadData());
    this.settings = data.settings;
    this.savedCanvasStates.clear();
    for (const [canvasPath, state] of Object.entries(data.canvasStates)) {
      this.savedCanvasStates.set(canvasPath, state);
    }
  }

  private cleanupMissingCanvasStates(): number {
    let removedCount = 0;
    for (const canvasPath of this.savedCanvasStates.keys()) {
      const file = this.app.vault.getAbstractFileByPath(canvasPath);
      if (
        !(file instanceof TFile) ||
        file.extension.toLowerCase() !== "canvas"
      ) {
        this.savedCanvasStates.delete(canvasPath);
        removedCount += 1;
      }
    }
    return removedCount;
  }

  private removeCanvasStatePath(path: string): void {
    const removedSavedCount = removePathEntries(this.savedCanvasStates, path);
    removePathEntries(this.collapseStates, path);
    if (removedSavedCount > 0) {
      this.schedulePluginDataSave();
    }
  }

  private renameCanvasStatePath(oldPath: string, newPath: string): void {
    const renamedSavedCount = renamePathEntries(
      this.savedCanvasStates,
      oldPath,
      newPath,
    );
    renamePathEntries(this.collapseStates, oldPath, newPath);
    if (renamedSavedCount > 0) {
      this.schedulePluginDataSave();
    }
  }

  private storeCanvasState(
    canvasPath: string,
    state: BranchCollapseState,
  ): void {
    if (!this.settings.rememberCanvasStates || !isCanvasPath(canvasPath)) {
      return;
    }

    if (state.isEmpty()) {
      this.savedCanvasStates.delete(canvasPath);
    } else {
      this.savedCanvasStates.set(canvasPath, state.toData());
    }
    this.schedulePluginDataSave();
  }

  private schedulePluginDataSave(): void {
    if (this.dataSaveTimer !== null) {
      window.clearTimeout(this.dataSaveTimer);
    }
    this.dataSaveTimer = window.setTimeout(() => {
      this.dataSaveTimer = null;
      void this.writePluginData();
    }, PERSISTENCE_SAVE_DELAY_MS);
  }

  private async flushPluginDataSave(): Promise<void> {
    if (this.dataSaveTimer !== null) {
      window.clearTimeout(this.dataSaveTimer);
      this.dataSaveTimer = null;
    }
    await this.writePluginData();
  }

  private writePluginData(): Promise<void> {
    const data: CanvasTreePluginData = {
      canvasStates: Object.fromEntries(this.savedCanvasStates),
      dataVersion: PLUGIN_DATA_VERSION,
      settings: this.settings,
    };
    const write = this.dataSaveChain.then(async () => {
      await this.saveData(data);
    });
    this.dataSaveChain = write.catch((error: unknown) => {
      console.error("[Canvas Tree] Failed to save plugin data", error);
    });
    return write;
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

    const state = this.getCollapseState(context.key, graph);
    if (state.isBranchCollapsed(graph, selectedNodeId)) {
      new Notice("The selected branch is already collapsed.");
      return;
    }

    state.collapse(selectedNodeId);
    this.storeCanvasState(context.key, state);
    const result = this.applyCollapsedState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Collapsed branch", { selectedNodeId, ...result });
    this.notifySuccess(`Collapsed branch with ${descendants.length} descendants.`);
  }

  private expandSelectedBranch(context: ActiveCanvasContext): void {
    const selectedNodeId = this.getSingleSelectedNodeId(context);
    if (selectedNodeId === null) {
      return;
    }

    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context.key, graph);
    if (!state.isBranchCollapsed(graph, selectedNodeId)) {
      new Notice("The selected branch is not collapsed.");
      return;
    }

    if (state.isCollapsed(selectedNodeId)) {
      state.expand(selectedNodeId);
    } else {
      state.revealBranch(graph, selectedNodeId);
    }
    this.storeCanvasState(context.key, state);
    const result = this.visibility.apply(context, state.getHiddenNodeIds(graph));
    this.syncBranchControls(context, graph, state);
    this.debug("Expanded branch", { selectedNodeId, ...result });
    this.notifySuccess("Expanded selected branch.");
  }

  private expandAllBranches(context: ActiveCanvasContext): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context.key, graph);
    state.expandAll();
    this.storeCanvasState(context.key, state);

    const result = this.visibility.apply(context, new Set());
    this.syncBranchControls(context, graph, state);
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

  private getCollapseState(
    canvasKey: string,
    graph: ReturnType<typeof buildCanvasGraph>,
  ): BranchCollapseState {
    const existing = this.collapseStates.get(canvasKey);
    if (existing !== undefined) {
      if (existing.prune(graph)) {
        this.storeCanvasState(canvasKey, existing);
      }
      return existing;
    }

    const savedState = this.settings.rememberCanvasStates
      ? this.savedCanvasStates.get(canvasKey)
      : undefined;
    const state = BranchCollapseState.fromData(savedState);
    if (state.prune(graph)) {
      this.storeCanvasState(canvasKey, state);
    }
    this.collapseStates.set(canvasKey, state);
    return state;
  }

  private notifySuccess(message: string): void {
    if (this.settings.showStatusNotices) {
      new Notice(message);
    }
  }

  private refreshActiveCanvasState(): void {
    const result = readActiveCanvasContext(this.app);
    if (!result.ok) {
      this.branchControls.removeAll();
      return;
    }

    const { context } = result;
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context.key, graph);
    const visibility = this.visibility.apply(
      context,
      state.getHiddenNodeIds(graph),
    );
    this.syncBranchControls(context, graph, state);
    this.debug("Refreshed active canvas state", visibility);
  }

  private syncBranchControls(
    context: ActiveCanvasContext,
    graph = buildCanvasGraph(context.data),
    state = this.getCollapseState(context.key, graph),
  ): void {
    if (!this.branchControlsVisible) {
      this.branchControls.removeAll();
      return;
    }

    this.branchControls.sync(
      context,
      buildBranchControlModels(graph, state),
      (controlContext, nodeId) => {
        this.toggleBranchFromControl(
          this.refreshControlContext(controlContext),
          nodeId,
        );
      },
      (controlContext, nodeId, event) => {
        this.showBranchDepthMenu(
          this.refreshControlContext(controlContext),
          nodeId,
          event,
        );
      },
    );
  }

  private refreshControlContext(
    fallbackContext: ActiveCanvasContext,
  ): ActiveCanvasContext {
    const result = readActiveCanvasContext(this.app);
    return result.ok ? result.context : fallbackContext;
  }

  private showBranchDepthMenu(
    context: ActiveCanvasContext,
    nodeId: string,
    event: MouseEvent,
  ): void {
    const graph = buildCanvasGraph(context.data);
    const descendantDepths = getDescendantDepths(graph, nodeId);
    let maximumDepth = 0;
    for (const depth of descendantDepths.values()) {
      maximumDepth = Math.max(maximumDepth, depth);
    }
    if (maximumDepth === 0) {
      return;
    }

    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle("Show node only").onClick(() => {
        this.setBranchVisibleDepth(context, nodeId, 0);
      }),
    );
    menu.addSeparator();

    const listedDepth = Math.min(maximumDepth, MAX_DEPTH_MENU_LEVELS);
    for (let depth = 1; depth <= listedDepth; depth += 1) {
      menu.addItem((item) =>
        item.setTitle(`Show through level ${depth}`).onClick(() => {
          this.setBranchVisibleDepth(context, nodeId, depth);
        }),
      );
    }

    menu.addSeparator();
    menu.addItem((item) =>
      item.setTitle("Show entire branch").onClick(() => {
        this.showEntireBranch(context, nodeId);
      }),
    );
    menu.showAtMouseEvent(event);
  }

  private setBranchVisibleDepth(
    context: ActiveCanvasContext,
    nodeId: string,
    visibleDepth: number,
  ): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context.key, graph);
    state.resetBranch(graph, nodeId);
    state.revealEntireBranch(graph, nodeId);
    state.setVisibleDepth(nodeId, visibleDepth);
    this.storeCanvasState(context.key, state);

    const result = this.applyCollapsedState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Set visible branch depth", { nodeId, visibleDepth, ...result });
    this.notifySuccess(
      visibleDepth === 0
        ? "Collapsed selected branch."
        : `Showing branch through level ${visibleDepth}.`,
    );
  }

  private showEntireBranch(
    context: ActiveCanvasContext,
    nodeId: string,
  ): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context.key, graph);
    state.resetBranch(graph, nodeId);
    state.revealEntireBranch(graph, nodeId);
    this.storeCanvasState(context.key, state);

    const result = this.visibility.apply(context, state.getHiddenNodeIds(graph));
    this.syncBranchControls(context, graph, state);
    this.debug("Showed entire branch", { nodeId, ...result });
    this.notifySuccess("Showing entire branch.");
  }

  private toggleBranchFromControl(
    context: ActiveCanvasContext,
    nodeId: string,
  ): void {
    const graph = buildCanvasGraph(context.data);
    const descendants = getDescendantIds(graph, nodeId);
    if (descendants.length === 0) {
      this.syncBranchControls(context, graph);
      return;
    }

    const state = this.getCollapseState(context.key, graph);
    const expanding = state.isBranchCollapsed(graph, nodeId);
    if (expanding) {
      if (state.isCollapsed(nodeId)) {
        state.expand(nodeId);
      } else {
        state.revealBranch(graph, nodeId);
      }
    } else {
      state.collapse(nodeId);
    }
    this.storeCanvasState(context.key, state);

    const result = expanding
      ? this.visibility.apply(context, state.getHiddenNodeIds(graph))
      : this.applyCollapsedState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug(expanding ? "Expanded branch control" : "Collapsed branch control", {
      nodeId,
      ...result,
    });
    this.notifySuccess(
      expanding
        ? "Expanded selected branch."
        : `Collapsed branch with ${descendants.length} descendants.`,
    );
  }

  private applyCollapsedState(
    context: ActiveCanvasContext,
    graph: ReturnType<typeof buildCanvasGraph>,
    state: BranchCollapseState,
  ): VisibilityResult & { deselectedItemCount: number } {
    const hiddenNodeIds = state.getHiddenNodeIds(graph);
    const hiddenItemIds = new Set([
      ...hiddenNodeIds,
      ...getHiddenEdgeIds(context, hiddenNodeIds),
    ]);
    const deselectedItemCount = context.deselectItems(hiddenItemIds);

    return {
      ...this.visibility.apply(context, hiddenNodeIds),
      deselectedItemCount,
    };
  }
}
