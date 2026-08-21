import type {
  ActiveCanvasContext,
  CanvasNodeElementHandle,
} from "../canvas/adapter";
import type { BranchControlModel } from "./control-model";

interface ControlEntry {
  activate: () => void;
  button: HTMLButtonElement;
  leaf: object;
  openContextMenu: (event: MouseEvent) => void;
}

export class CanvasBranchControlManager {
  private readonly entries = new Map<CanvasNodeElementHandle, ControlEntry>();

  sync(
    context: ActiveCanvasContext,
    models: readonly BranchControlModel[],
    onToggle: (context: ActiveCanvasContext, nodeId: string) => void,
    onContextMenu: (
      context: ActiveCanvasContext,
      nodeId: string,
      event: MouseEvent,
    ) => void,
  ): void {
    const modelsByNodeId = new Map(models.map((model) => [model.nodeId, model]));
    const currentHosts = new Set(context.nodeViews.map((view) => view.element));

    for (const [host, entry] of this.entries) {
      if (
        entry.leaf === context.leaf &&
        (!currentHosts.has(host) || !hasModelForHost(context, host, modelsByNodeId))
      ) {
        entry.button.remove();
        this.entries.delete(host);
      }
    }

    for (const nodeView of context.nodeViews) {
      const model = modelsByNodeId.get(nodeView.id);
      if (model === undefined) {
        continue;
      }

      const entry = this.getOrCreateEntry(
        nodeView.element,
        context.leaf,
      );
      entry.activate = () => {
        onToggle(context, nodeView.id);
      };
      entry.openContextMenu = (event) => {
        onContextMenu(context, nodeView.id, event);
      };
      updateButton(entry.button, model);
    }
  }

  removeAll(): void {
    for (const entry of this.entries.values()) {
      entry.button.remove();
    }
    this.entries.clear();
  }

  private getOrCreateEntry(
    host: CanvasNodeElementHandle,
    leaf: object,
  ): ControlEntry {
    const existing = this.entries.get(host);
    if (existing !== undefined) {
      return existing;
    }

    const button = host.createEl("button");
    button.type = "button";
    button.className = "canvas-folding-branch-control";

    const entry: ControlEntry = {
      activate: () => undefined,
      button,
      leaf,
      openContextMenu: () => undefined,
    };
    button.addEventListener("pointerdown", blockCanvasInteraction);
    button.addEventListener("click", (event) => {
      blockCanvasInteraction(event);
      entry.activate();
    });
    button.addEventListener("contextmenu", (event) => {
      blockCanvasInteraction(event);
      openContextMenuAfterPointerRelease(event, entry.openContextMenu);
    });

    this.entries.set(host, entry);
    return entry;
  }
}

function updateButton(
  button: HTMLButtonElement,
  model: BranchControlModel,
): void {
  const action = model.collapsed ? "Expand" : "Collapse";
  const label = `${action} branch with ${model.descendantCount} descendants`;
  const title = `${label}. Right-click to choose visible levels.`;

  button.textContent = model.collapsed ? "+" : "−";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.setAttribute("aria-expanded", String(!model.collapsed));
}

function blockCanvasInteraction(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

function openContextMenuAfterPointerRelease(
  event: MouseEvent,
  openContextMenu: (event: MouseEvent) => void,
): void {
  const button = event.currentTarget as HTMLButtonElement | null;
  if (button === null || event.buttons === 0) {
    openContextMenu(event);
    return;
  }

  const { ownerDocument } = button;
  const finishPointerInteraction = (): void => {
    ownerDocument.removeEventListener("pointerup", finishPointerInteraction, true);
    ownerDocument.removeEventListener(
      "pointercancel",
      finishPointerInteraction,
      true,
    );
    const ownerWindow = ownerDocument.defaultView;
    if (ownerWindow === null) {
      openContextMenu(event);
    } else {
      ownerWindow.setTimeout(() => {
        openContextMenu(event);
      }, 0);
    }
  };

  ownerDocument.addEventListener("pointerup", finishPointerInteraction, true);
  ownerDocument.addEventListener(
    "pointercancel",
    finishPointerInteraction,
    true,
  );
}

function hasModelForHost(
  context: ActiveCanvasContext,
  host: CanvasNodeElementHandle,
  modelsByNodeId: ReadonlyMap<string, BranchControlModel>,
): boolean {
  const nodeView = context.nodeViews.find((view) => view.element === host);
  return nodeView !== undefined && modelsByNodeId.has(nodeView.id);
}
