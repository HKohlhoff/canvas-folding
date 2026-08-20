import { App, FuzzySuggestModal } from "obsidian";

export class CanvasDepthModal extends FuzzySuggestModal<number> {
  private readonly levels: readonly number[];

  constructor(app: App, maximumDepth: number, private readonly choose: (depth: number) => void) {
    super(app);
    this.levels = Array.from({ length: maximumDepth + 1 }, (_, depth) => depth);
    this.setPlaceholder("Choose the deepest visible canvas level");
  }

  getItems(): number[] { return [...this.levels]; }
  getItemText(depth: number): string {
    return depth === 0 ? "Level 0 — roots only" : `Level ${depth}`;
  }
  onChooseItem(depth: number): void { this.choose(depth); }
}
