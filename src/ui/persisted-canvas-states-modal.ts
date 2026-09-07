import { App, Modal, Notice, Setting } from "obsidian";

export interface PersistedCanvasStatesModalHost {
  clearAll(): Promise<void>;
  getPaths(): readonly string[];
  isReadOnly(): boolean;
  remove(canvasPath: string): Promise<void>;
}

export type PersistedCanvasStateSortDirection = "asc" | "desc";
export type PersistedCanvasStateSortKey = "canvas" | "path";

interface PersistedCanvasStateRow {
  canvas: string;
  path: string;
}

const PATH_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function getPersistedCanvasName(canvasPath: string): string {
  const filename = canvasPath.split("/").pop() ?? canvasPath;
  return filename.replace(/\.canvas$/iu, "");
}

export function sortPersistedCanvasStatePaths(
  paths: readonly string[],
  key: PersistedCanvasStateSortKey,
  direction: PersistedCanvasStateSortDirection,
): readonly string[] {
  const multiplier = direction === "asc" ? 1 : -1;
  return paths
    .map((path): PersistedCanvasStateRow => ({
      canvas: getPersistedCanvasName(path),
      path,
    }))
    .sort((left, right) => {
      const primary = PATH_COLLATOR.compare(left[key], right[key]);
      const secondary = PATH_COLLATOR.compare(left.path, right.path);
      return (primary || secondary) * multiplier;
    })
    .map((row) => row.path);
}

export class PersistedCanvasStatesModal extends Modal {
  private busy = false;
  private renderSequence = 0;
  private sortDirection: PersistedCanvasStateSortDirection = "asc";
  private sortKey: PersistedCanvasStateSortKey = "canvas";

  constructor(app: App, private readonly host: PersistedCanvasStatesModalHost) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.addClass("canvas-folding-persisted-states-modal");
    this.renderStates();
  }

  onClose(): void {
    this.renderSequence += 1;
    this.contentEl.empty();
  }

  private renderStates(): void {
    this.contentEl.empty();
    this.setTitle("Manage persisted canvas states");
    this.contentEl.createEl("p", {
      text: "Removing persisted states only disables their restoration between sessions. Folding state and visibility in currently open tabs remain unchanged.",
    });
    const readOnly = this.host.isReadOnly();
    if (readOnly) {
      this.contentEl.createEl("p", {
        text: "Saved states are read-only because the stored plugin data belongs to a newer canvas folding version.",
      });
    }

    const paths = sortPersistedCanvasStatePaths(
      this.host.getPaths(),
      this.sortKey,
      this.sortDirection,
    );
    if (paths.length === 0) {
      this.contentEl.createEl("p", {
        text: "No persisted canvas states are stored.",
      });
      return;
    }

    const list = this.contentEl.createDiv({
      cls: "canvas-folding-persisted-states-list",
    });
    list.setAttribute("role", "table");
    list.setAttribute("aria-label", "Persisted canvas states");
    this.renderColumnHeaders(list);

    for (const canvasPath of paths) {
      const row = new Setting(list)
        .setName(getPersistedCanvasName(canvasPath))
        .setDesc(canvasPath)
        .addButton((button) => {
          button
            .setButtonText("Remove")
            .setDestructive()
            .setDisabled(this.busy || readOnly)
            .onClick(async () => {
              await this.runAndRender(() => this.host.remove(canvasPath));
            });
        });
      row.settingEl.addClass("canvas-folding-persisted-states-row");
      row.settingEl.setAttribute("role", "row");
      row.nameEl.setAttribute("role", "cell");
      row.descEl.setAttribute("role", "cell");
      row.controlEl.setAttribute("role", "cell");
    }

    this.contentEl.createEl("hr", {
      cls: "canvas-folding-persisted-states-separator",
    });
    const removeAllSetting = new Setting(this.contentEl)
      .setName("Remove all persisted canvas states.")
      .setDesc("Remove every stored state used for restoration between sessions.")
      .addButton((button) => {
        let confirmed = false;
        button
          .setButtonText("Remove all")
          .setDestructive()
          .setDisabled(this.busy || readOnly)
          .onClick(async () => {
            if (!confirmed) {
              confirmed = true;
              button.setButtonText("Confirm remove all");
              return;
            }
            await this.runAndRender(() => this.host.clearAll());
          });
      });
    removeAllSetting.settingEl.addClass("canvas-folding-persisted-states-remove-all");
  }

  private renderColumnHeaders(containerEl: HTMLElement): void {
    const header = containerEl.createDiv({
      cls: "canvas-folding-persisted-states-header",
    });
    header.setAttribute("role", "row");
    this.renderSortHeader(header, "Canvas", "canvas");
    this.renderSortHeader(header, "Path", "path");
    const actionHeader = header.createDiv({
      cls: "canvas-folding-persisted-states-action-header",
      text: "Action",
    });
    actionHeader.setAttribute("role", "columnheader");
  }

  private renderSortHeader(
    header: HTMLElement,
    label: string,
    key: PersistedCanvasStateSortKey,
  ): void {
    const active = this.sortKey === key;
    const column = header.createDiv();
    column.setAttribute("role", "columnheader");
    column.setAttribute(
      "aria-sort",
      active
        ? this.sortDirection === "asc" ? "ascending" : "descending"
        : "none",
    );
    const button = column.createEl("button", {
      cls: "canvas-folding-persisted-states-sort",
      text: `${label}${active ? this.sortDirection === "asc" ? " ↑" : " ↓" : ""}`,
    });
    button.type = "button";
    button.setAttribute("aria-label", `Sort by ${label.toLowerCase()}`);
    button.addEventListener("click", () => {
      if (this.sortKey === key) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortKey = key;
        this.sortDirection = "asc";
      }
      this.renderStates();
    });
  }

  private async runAndRender(operation: () => Promise<void>): Promise<void> {
    if (this.busy || this.host.isReadOnly()) return;
    this.busy = true;
    const sequence = this.renderSequence;
    this.renderStates();
    try {
      await operation();
    } catch (error: unknown) {
      console.error("[Canvas Folding] Could not update persisted canvas states", error);
      new Notice("Canvas folding could not save the persisted-state change.", 5000);
    }
    this.busy = false;
    if (sequence !== this.renderSequence) return;
    this.renderStates();
  }
}
