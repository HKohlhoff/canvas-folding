import { Menu, Notice, Plugin, TFile } from "obsidian";

import {
  readActiveCanvasContext,
  readActiveCanvasSnapshot,
  parseCanvasGraphData,
  type ActiveCanvasContext,
  type ActiveCanvasContextResult,
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
  getRootDepths,
} from "./tree/graph";
import {
  BranchCollapseState,
  type BranchCollapseStateData,
} from "./tree/state";
import { CanvasBranchControlManager } from "./ui/branch-controls";
import { CanvasDepthModal } from "./ui/canvas-depth-modal";
import { buildBranchControlModels } from "./ui/control-model";
import {
  buildToolbarButtonModels,
  CanvasToolbarManager,
  type ToolbarAction,
} from "./ui/toolbar";

const MAX_DEPTH_MENU_LEVELS = 5;
const CANVAS_STATE_PRUNE_DELAY_MS = 750;

export default class CanvasTreePlugin extends Plugin {
  settings: CanvasTreeSettings = { ...DEFAULT_SETTINGS };
  private readonly branchControls = new CanvasBranchControlManager();
  private readonly canvasToolbar = new CanvasToolbarManager();
  private activeCanvasPath: string | null = null;
  private branchControlsVisible = DEFAULT_SETTINGS.showBranchControls;
  private canvasToolbarVisible = DEFAULT_SETTINGS.showCanvasToolbar;
  private readonly collapseStates = new Map<
    object,
    Map<string, BranchCollapseState>
  >();
  private dataSaveChain: Promise<void> = Promise.resolve();
  private dataSaveTimer: number | null = null;
  private readonly nodePruneTimers = new Map<string, number>();
  private readonly savedCanvasStates = new Map<
    string,
    BranchCollapseStateData
  >();
  private readonly visibility = new CanvasVisibilityManager();

  async onload(): Promise<void> {
    await this.loadPluginData();
    this.cleanupMissingCanvasStates();
    await this.pruneAllSavedCanvasNodeStates();
    await this.writePluginData();
    this.branchControlsVisible = this.settings.showBranchControls;
    this.canvasToolbarVisible = this.settings.showCanvasToolbar;
    this.rememberOpenedCanvas(this.app.workspace.getActiveFile());

    this.addSettingTab(new CanvasTreeSettingTab(this.app, this));

    this.addCommand({
      id: "show-status",
      name: "Show current status",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.showCurrentStatus(context);
        }),
    });

    this.addCommand({
      id: "show-canvas-toolbar",
      name: "Show canvas toolbar",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.canvasToolbarVisible = true;
          this.syncToolbar(context);
          this.notifySuccess("Canvas toolbar is visible.");
        }),
    });

    this.addCommand({
      id: "hide-canvas-toolbar",
      name: "Hide canvas toolbar",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, () => {
          this.canvasToolbarVisible = false;
          this.canvasToolbar.removeAll();
          this.notifySuccess("Canvas toolbar is hidden.");
        }),
    });

    this.addCommand({
      id: "toggle-canvas-toolbar",
      name: "Toggle canvas toolbar",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.canvasToolbarVisible = !this.canvasToolbarVisible;
          if (this.canvasToolbarVisible) this.syncToolbar(context);
          else this.canvasToolbar.removeAll();
          this.notifySuccess(
            `Canvas toolbar is ${this.canvasToolbarVisible ? "visible" : "hidden"}.`,
          );
        }),
    });

    this.addCommand({
      id: "reset-canvas-toolbar-position",
      name: "Reset canvas toolbar position",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          void this.updateSettings({
            toolbarPositionXPercent: DEFAULT_SETTINGS.toolbarPositionXPercent,
            toolbarPositionYPixels: DEFAULT_SETTINGS.toolbarPositionYPixels,
          }).then(() => this.syncToolbar(context));
        }),
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
        this.runActiveCanvasCommand(checking, (context) => {
          this.branchControlsVisible = false;
          this.branchControls.removeAll();
          this.syncToolbar(context);
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
            this.syncToolbar(context);
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
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension.toLowerCase() === "canvas") {
          this.scheduleCanvasNodeStatePrune(file);
        }
      }),
    );
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
      this.app.workspace.on("file-open", (file) => {
        this.rememberOpenedCanvas(file);
        this.refreshActiveCanvasState();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.cleanupDetachedSessionStates();
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
      id: "focus-selected-branch",
      name: "Focus selected branch",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.focusSelectedBranch(context);
        }),
    });

    this.addCommand({
      id: "exit-branch-focus",
      name: "Exit branch focus",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.exitBranchFocus(context);
        }),
    });

    this.addCommand({
      id: "collapse-all-branches",
      name: "Collapse all branches",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.collapseAllBranches(context);
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

    this.addCommand({
      id: "show-canvas-through-level",
      name: "Show canvas through level…",
      checkCallback: (checking) =>
        this.runActiveCanvasCommand(checking, (context) => {
          this.openCanvasDepthModal(context);
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
    for (const timer of this.nodePruneTimers.values()) {
      window.clearTimeout(timer);
    }
    this.nodePruneTimers.clear();
    this.branchControls.removeAll();
    this.canvasToolbar.removeAll();
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
      for (const statesByPath of this.collapseStates.values()) {
        for (const [canvasPath, state] of [...statesByPath]) {
          if (state.isEmpty() && this.savedCanvasStates.has(canvasPath)) {
            statesByPath.delete(canvasPath);
            continue;
          }
          this.storeCanvasState(canvasPath, state);
        }
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

    if (typeof update.showCanvasToolbar === "boolean") {
      this.canvasToolbarVisible = update.showCanvasToolbar;
      if (this.canvasToolbarVisible) this.refreshActiveCanvasState();
      else this.canvasToolbar.removeAll();
    }

    if (typeof update.rememberCanvasStates === "boolean") {
      this.refreshActiveCanvasState();
    }
    if (typeof update.focusBackgroundOpacity === "number") {
      this.refreshActiveCanvasState();
    }
  }

  hasSavedCanvasStates(): boolean {
    return this.savedCanvasStates.size > 0;
  }

  async cleanupSavedCanvasStates(): Promise<void> {
    const removedCount =
      this.cleanupMissingCanvasStates() +
      (await this.pruneAllSavedCanvasNodeStates());
    if (removedCount > 0) {
      await this.flushPluginDataSave();
    }
    new Notice(
      removedCount === 0
        ? "Canvas Tree: no stale saved states found."
        : `Canvas Tree: cleaned ${removedCount} saved canvas state${removedCount === 1 ? "" : "s"}.`,
    );
  }

  async clearSavedCanvasStates(): Promise<void> {
    this.savedCanvasStates.clear();
    await this.flushPluginDataSave();
    new Notice("Canvas tree: cleared all persisted canvas states.");
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

  private async pruneAllSavedCanvasNodeStates(): Promise<number> {
    let changedCanvasCount = 0;
    for (const canvasPath of [...this.savedCanvasStates.keys()]) {
      const file = this.app.vault.getAbstractFileByPath(canvasPath);
      if (
        file instanceof TFile &&
        file.extension.toLowerCase() === "canvas" &&
        (await this.pruneCanvasNodeStates(file))
      ) {
        changedCanvasCount += 1;
      }
    }
    return changedCanvasCount;
  }

  private scheduleCanvasNodeStatePrune(file: TFile): void {
    const existing = this.nodePruneTimers.get(file.path);
    if (existing !== undefined) {
      window.clearTimeout(existing);
    }
    const timer = window.setTimeout(() => {
      this.nodePruneTimers.delete(file.path);
      void this.pruneCanvasNodeStates(file).then((changed) => {
        if (changed) this.schedulePluginDataSave();
      });
    }, CANVAS_STATE_PRUNE_DELAY_MS);
    this.nodePruneTimers.set(file.path, timer);
  }

  private async pruneCanvasNodeStates(file: TFile): Promise<boolean> {
    let graphData: ReturnType<typeof parseCanvasGraphData>;
    try {
      graphData = parseCanvasGraphData(JSON.parse(await this.app.vault.cachedRead(file)));
    } catch (error: unknown) {
      this.debug("Skipped node-state cleanup for unreadable canvas", {
        error,
        path: file.path,
      });
      return false;
    }
    if (graphData === null) {
      this.debug("Skipped node-state cleanup for invalid canvas data", {
        path: file.path,
      });
      return false;
    }

    const graph = buildCanvasGraph(graphData);
    let persistedChanged = false;
    const savedData = this.savedCanvasStates.get(file.path);
    if (savedData !== undefined) {
      const savedState = BranchCollapseState.fromData(savedData);
      if (savedState.prune(graph)) {
        persistedChanged = true;
        if (savedState.isEmpty()) {
          this.savedCanvasStates.delete(file.path);
        } else {
          this.savedCanvasStates.set(file.path, savedState.toData());
        }
      }
    }

    for (const statesByPath of this.collapseStates.values()) {
      const sessionState = statesByPath.get(file.path);
      sessionState?.prune(graph);
    }
    return persistedChanged;
  }

  private removeCanvasStatePath(path: string): void {
    const removedSavedCount = removePathEntries(this.savedCanvasStates, path);
    for (const statesByPath of this.collapseStates.values()) {
      removePathEntries(statesByPath, path);
    }
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
    for (const statesByPath of this.collapseStates.values()) {
      renamePathEntries(statesByPath, oldPath, newPath);
    }
    if (renamedSavedCount > 0) {
      this.schedulePluginDataSave();
    }
  }

  private storeCanvasState(
    canvasPath: string,
    state: BranchCollapseState,
  ): void {
    if (!this.settings.rememberCanvasStates) {
      return;
    }
    if (!isCanvasPath(canvasPath)) {
      console.warn("[Canvas Tree] Skipped state persistence: invalid canvas path", {
        canvasPath,
      });
      return;
    }

    if (state.isEmpty()) {
      this.savedCanvasStates.delete(canvasPath);
    } else {
      this.savedCanvasStates.set(canvasPath, state.toData());
    }
    void this.writePluginData().catch(() => undefined);
  }

  private schedulePluginDataSave(): void {
    if (this.dataSaveTimer !== null) {
      window.clearTimeout(this.dataSaveTimer);
    }
    this.dataSaveTimer = window.setTimeout(() => {
      this.dataSaveTimer = null;
      void this.writePluginData();
    }, 250);
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

    new Notice(
      `Canvas tree: ${summary.nodeCount} nodes, ${summary.edgeCount} edges, ${summary.rootIds.length} roots.`,
    );
  }

  private runActiveCanvasCommand(
    checking: boolean,
    action: (context: ActiveCanvasContext) => void,
  ): boolean {
    const result = this.readActiveCanvasContext();
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

    const state = this.getCollapseState(context, graph);
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
    const state = this.getCollapseState(context, graph);
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
    const result = this.applyVisibilityState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Expanded branch", { selectedNodeId, ...result });
    this.notifySuccess("Expanded selected branch.");
  }

  private focusSelectedBranch(context: ActiveCanvasContext): void {
    const selectedNodeId = this.getSingleSelectedNodeId(context);
    if (selectedNodeId === null) return;
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    state.focusBranch(selectedNodeId);
    this.storeCanvasState(context.key, state);
    const result = this.applyCollapsedState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Focused selected branch", {
      selectedNodeId,
      ...result,
    });
    this.notifySuccess("Focused selected branch.");
  }

  private exitBranchFocus(context: ActiveCanvasContext): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    if (!state.exitFocus()) {
      new Notice("Branch focus is not active.");
      return;
    }
    this.storeCanvasState(context.key, state);
    const result = this.applyVisibilityState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Exited branch focus", result);
    this.notifySuccess("Exited branch focus.");
  }

  private expandAllBranches(context: ActiveCanvasContext): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    state.expandAll();
    this.storeCanvasState(context.key, state);

    const result = this.applyVisibilityState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Expanded all branches", result);
    this.notifySuccess("Expanded all branches.");
  }

  private collapseAllBranches(context: ActiveCanvasContext): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    const collapsedRootCount = state.collapseAllRootBranches(graph);
    if (collapsedRootCount === 0) {
      new Notice("The canvas has no rooted branches to collapse.");
      return;
    }

    this.storeCanvasState(context.key, state);
    const result = this.applyCollapsedState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Collapsed all branches", { collapsedRootCount, ...result });
    this.notifySuccess(
      `Collapsed ${collapsedRootCount} root branch${collapsedRootCount === 1 ? "" : "es"}.`,
    );
  }

  private openCanvasDepthModal(context: ActiveCanvasContext): void {
    const graph = buildCanvasGraph(context.data);
    const maximumDepth = Math.max(0, ...getRootDepths(graph).values());
    if (maximumDepth === 0) {
      new Notice("The canvas has no rooted levels to show.");
      return;
    }
    const canvasKey = context.key;
    new CanvasDepthModal(this.app, maximumDepth, (depth) => {
      const current = this.readActiveCanvasContext();
      if (!current.ok || current.context.key !== canvasKey) {
        new Notice("Reopen the canvas and choose a level again.");
        return;
      }
      this.showCanvasThroughDepth(current.context, depth);
    }).open();
  }

  private showCanvasThroughDepth(
    context: ActiveCanvasContext,
    depth: number,
  ): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    state.showAllRootBranchesThroughDepth(graph, depth);
    this.storeCanvasState(context.key, state);
    const result = this.applyCollapsedState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Set global canvas depth", { depth, ...result });
    this.notifySuccess(`Showing canvas through level ${depth}.`);
  }

  private getSingleSelectedNodeId(context: ActiveCanvasContext): string | null {
    if (context.selectedNodeIds.length !== 1) {
      new Notice("Select exactly one canvas node first.");
      return null;
    }

    return context.selectedNodeIds[0] ?? null;
  }

  private getCollapseState(
    context: ActiveCanvasContext,
    _graph: ReturnType<typeof buildCanvasGraph>,
  ): BranchCollapseState {
    let statesByPath = this.collapseStates.get(context.leaf);
    if (statesByPath === undefined) {
      statesByPath = new Map();
      this.collapseStates.set(context.leaf, statesByPath);
    }
    const existing = statesByPath.get(context.key);
    if (existing !== undefined) {
      return existing;
    }

    const savedState = this.settings.rememberCanvasStates
      ? this.savedCanvasStates.get(context.key)
      : undefined;
    const state = BranchCollapseState.fromData(savedState);
    statesByPath.set(context.key, state);
    return state;
  }

  private cleanupDetachedSessionStates(): void {
    const attachedLeaves = new Set<object>();
    this.app.workspace.iterateAllLeaves((leaf) => {
      attachedLeaves.add(leaf);
    });
    for (const leaf of this.collapseStates.keys()) {
      if (!attachedLeaves.has(leaf)) {
        this.collapseStates.delete(leaf);
      }
    }
  }

  private notifySuccess(message: string): void {
    if (this.settings.showStatusNotices) {
      new Notice(message);
    }
  }

  private showCurrentStatus(context: ActiveCanvasContext): void {
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    const hiddenNodeIds = state.getHiddenNodeIds(graph);
    const dimmedNodeIds = new Set(
      [...state.getDimmedNodeIds(graph)].filter(
        (nodeId) => !hiddenNodeIds.has(nodeId),
      ),
    );
    const activeNodeCount =
      graph.nodes.length - hiddenNodeIds.size - dimmedNodeIds.size;
    const persistenceStatus = !this.settings.rememberCanvasStates
      ? "current state is kept for this tab only"
      : state.isEmpty()
        ? "current state is the default; persistence is enabled"
        : this.savedCanvasStates.has(context.key)
          ? "current state is stored between sessions"
          : "current state is being saved";
    new Notice(
      `Canvas tree: ${activeNodeCount} active, ${hiddenNodeIds.size} hidden, ${dimmedNodeIds.size} dimmed · ${graph.edges.length} edges, ${graph.rootIds.length} roots · focus ${state.isFocusActive() ? "on" : "off"} · controls ${this.branchControlsVisible ? "on" : "off"} · ${persistenceStatus}.`,
    );
  }

  private refreshActiveCanvasState(): void {
    const result = this.readActiveCanvasContext();
    if (!result.ok) {
      this.branchControls.removeAll();
      this.canvasToolbar.removeAll();
      return;
    }

    const { context } = result;
    const graph = buildCanvasGraph(context.data);
    const state = this.getCollapseState(context, graph);
    const visibility = this.applyVisibilityState(context, graph, state);
    this.syncBranchControls(context, graph, state);
    this.debug("Refreshed active canvas state", visibility);
  }

  private syncBranchControls(
    context: ActiveCanvasContext,
    graph = buildCanvasGraph(context.data),
    state = this.getCollapseState(context, graph),
  ): void {
    this.syncToolbar(context, graph, state);
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

  private syncToolbar(
    context: ActiveCanvasContext,
    graph = buildCanvasGraph(context.data),
    state = this.getCollapseState(context, graph),
  ): void {
    if (!this.canvasToolbarVisible) {
      this.canvasToolbar.removeAll();
      return;
    }
    this.canvasToolbar.sync(
      context,
      buildToolbarButtonModels(
        graph,
        state,
        context.selectedNodeIds,
        this.branchControlsVisible,
      ),
      (action) => this.runToolbarAction(action),
      {
        xPercent: this.settings.toolbarPositionXPercent,
        yPixels: this.settings.toolbarPositionYPixels,
      },
      (position) => {
        void this.updateSettings({
          toolbarPositionXPercent: position.xPercent,
          toolbarPositionYPixels: position.yPixels,
        });
      },
    );
  }

  private runToolbarAction(action: ToolbarAction): void {
    const result = this.readActiveCanvasContext();
    if (!result.ok) {
      new Notice(result.message);
      return;
    }
    const context = result.context;
    switch (action) {
      case "collapse-selected": this.collapseSelectedBranch(context); break;
      case "expand-selected": this.expandSelectedBranch(context); break;
      case "toggle-focus":
        if (this.getCollapseState(context, buildCanvasGraph(context.data)).isFocusActive()) {
          this.exitBranchFocus(context);
        } else {
          this.focusSelectedBranch(context);
        }
        break;
      case "collapse-all": this.collapseAllBranches(context); break;
      case "expand-all": this.expandAllBranches(context); break;
      case "show-level": this.openCanvasDepthModal(context); break;
      case "toggle-controls":
        this.branchControlsVisible = !this.branchControlsVisible;
        if (!this.branchControlsVisible) this.branchControls.removeAll();
        this.syncBranchControls(context);
        break;
      case "inspect-graph": this.logCanvasGraph(context.data); break;
      case "show-status": this.showCurrentStatus(context); break;
      case "hide-toolbar":
        this.canvasToolbarVisible = false;
        this.canvasToolbar.removeAll();
        break;
    }
  }

  private refreshControlContext(
    fallbackContext: ActiveCanvasContext,
  ): ActiveCanvasContext {
    const result = this.readActiveCanvasContext();
    return result.ok ? result.context : fallbackContext;
  }

  private readActiveCanvasContext(): ActiveCanvasContextResult {
    const result = readActiveCanvasContext(this.app);
    if (!result.ok) {
      return result;
    }
    if (isCanvasPath(result.context.key)) {
      this.activeCanvasPath = result.context.key;
      return result;
    }
    if (this.activeCanvasPath !== null) {
      return {
        ok: true,
        context: { ...result.context, key: this.activeCanvasPath },
      };
    }
    return result;
  }

  private rememberOpenedCanvas(file: TFile | null): void {
    this.activeCanvasPath =
      file !== null && file.extension.toLowerCase() === "canvas"
        ? file.path
        : null;
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
    const state = this.getCollapseState(context, graph);
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
    const state = this.getCollapseState(context, graph);
    state.resetBranch(graph, nodeId);
    state.revealEntireBranch(graph, nodeId);
    this.storeCanvasState(context.key, state);

    const result = this.applyVisibilityState(context, graph, state);
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

    const state = this.getCollapseState(context, graph);
    const expanding = state.isBranchCollapsed(graph, nodeId);
    if (expanding) {
      if (state.isCollapsed(nodeId)) {
        state.expand(nodeId);
      }
      if (state.isBranchCollapsed(graph, nodeId)) {
        state.revealBranch(graph, nodeId);
      }
    } else {
      state.collapse(nodeId);
    }
    this.storeCanvasState(context.key, state);

    const result = expanding
      ? this.applyVisibilityState(context, graph, state)
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
    const dimmedNodeIds = state.getDimmedNodeIds(graph);
    const hiddenItemIds = new Set([
      ...hiddenNodeIds,
      ...dimmedNodeIds,
      ...getHiddenEdgeIds(context, hiddenNodeIds),
      ...getHiddenEdgeIds(context, dimmedNodeIds),
    ]);
    const deselectedItemCount = context.deselectItems(hiddenItemIds);

    return {
      ...this.visibility.apply(
        context,
        hiddenNodeIds,
        dimmedNodeIds,
        this.settings.focusBackgroundOpacity,
      ),
      deselectedItemCount,
    };
  }

  private applyVisibilityState(
    context: ActiveCanvasContext,
    graph: ReturnType<typeof buildCanvasGraph>,
    state: BranchCollapseState,
  ): VisibilityResult {
    return this.visibility.apply(
      context,
      state.getHiddenNodeIds(graph),
      state.getDimmedNodeIds(graph),
      this.settings.focusBackgroundOpacity,
    );
  }
}
