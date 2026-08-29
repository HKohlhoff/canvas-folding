import { App, Component, MarkdownRenderer, Modal } from "obsidian";

import README_MARKDOWN from "../../README.md";
import { prepareReadmeMarkdown } from "./readme-content";

const REPOSITORY_URL = "https://github.com/HKohlhoff/canvas-folding";

class ReadmeModal extends Modal {
  private readonly renderComponent = new Component();

  onOpen(): void {
    this.setTitle("Canvas folding: README");
    this.modalEl.addClass("canvas-folding-release-notes-modal");
    this.renderComponent.load();
    const markdownEl = this.contentEl.createDiv({ cls: "markdown-rendered" });
    const markdown = prepareReadmeMarkdown(README_MARKDOWN, REPOSITORY_URL);

    void MarkdownRenderer.render(
      this.app,
      markdown,
      markdownEl,
      "",
      this.renderComponent,
    ).catch((error: unknown) => {
      console.error("[Canvas Folding] Could not render README", error);
      markdownEl.setText(markdown);
    });

    const actions = this.contentEl.createDiv({
      cls: "canvas-folding-release-notes-actions",
    });
    const closeButton = actions.createEl("button", {
      cls: "mod-cta",
      text: "Close",
    });
    closeButton.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.renderComponent.unload();
    this.contentEl.empty();
  }
}

export function openPluginReadme(app: App): void {
  new ReadmeModal(app).open();
}
