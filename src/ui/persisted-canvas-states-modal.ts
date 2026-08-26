import { App, Modal, Setting } from "obsidian";

export interface PersistedCanvasStatesModalHost {
  cleanup(): Promise<void>;
  clearAll(): Promise<void>;
  getPaths(): readonly string[];
  remove(canvasPath: string): Promise<void>;
}

export class PersistedCanvasStatesModal extends Modal {
  private renderSequence = 0;

  constructor(app: App, private readonly host: PersistedCanvasStatesModalHost) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.addClass("canvas-folding-persisted-states-modal");
    void this.prepareAndRender();
  }

  onClose(): void {
    this.renderSequence += 1;
    this.contentEl.empty();
  }

  private async prepareAndRender(): Promise<void> {
    const sequence = ++this.renderSequence;
    await this.host.cleanup();
    if (sequence !== this.renderSequence) return;
    this.renderStates();
  }

  private renderStates(): void {
    this.contentEl.empty();
    this.setTitle("Manage persisted canvas states");
    this.contentEl.createEl("p", {
      text: "Removing persisted states only disables their restoration between sessions. Folding state and visibility in currently open tabs remain unchanged.",
    });

    const paths = this.host.getPaths();
    if (paths.length === 0) {
      this.contentEl.createEl("p", {
        text: "No persisted canvas states are stored.",
      });
      return;
    }

    for (const canvasPath of paths) {
      new Setting(this.contentEl)
        .setName(canvasPath)
        .addButton((button) => {
          button
            .setButtonText("Remove")
            .setDestructive()
            .onClick(async () => {
              await this.runAndRender(() => this.host.remove(canvasPath));
            });
        });
    }

    this.contentEl.createEl("hr", {
      cls: "canvas-folding-persisted-states-separator",
    });
    const removeAllSetting = new Setting(this.contentEl)
      .setName("Remove all persisted canvas states.")
      .setDesc("Remove every stored state used for restoration between sessions.")
      .addButton((button) => {
        button
          .setButtonText("Remove all")
          .setDestructive()
          .onClick(async () => {
            await this.runAndRender(() => this.host.clearAll());
          });
      });
    removeAllSetting.settingEl.addClass("canvas-folding-persisted-states-remove-all");
  }

  private async runAndRender(operation: () => Promise<void>): Promise<void> {
    const sequence = this.renderSequence;
    await operation();
    if (sequence !== this.renderSequence) return;
    this.renderStates();
  }
}
