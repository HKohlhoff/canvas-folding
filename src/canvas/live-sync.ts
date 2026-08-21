const PLUGIN_UI_SELECTOR =
  ".canvas-folding-toolbar, .canvas-folding-branch-control";
const MANAGED_CANVAS_CLASSES = new Set([
  "canvas-folding-dimmed",
  "canvas-folding-hidden",
]);

export interface CanvasMutationRecord {
  addedNodes?: Iterable<Node>;
  attributeName?: string | null;
  oldValue?: string | null;
  removedNodes?: Iterable<Node>;
  target: Node;
  type: string;
}

export class CanvasLiveSync {
  private host: HTMLElement | null = null;
  private observer: CanvasMutationObserver | null = null;

  constructor(
    private readonly createObserver: CanvasMutationObserverFactory =
      (callback) => new MutationObserver(callback),
  ) {}

  watch(host: HTMLElement, onChange: () => void): void {
    if (this.host === host) {
      return;
    }

    this.disconnect();
    this.host = host;
    this.observer = this.createObserver((records) => {
      if (hasRelevantCanvasMutation(records)) {
        onChange();
      }
    });
    this.observer.observe(host, {
      attributeFilter: ["class"],
      attributeOldValue: true,
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.host = null;
  }
}

interface CanvasMutationObserver {
  disconnect(): void;
  observe(target: Node, options?: MutationObserverInit): void;
}

type CanvasMutationObserverFactory = (
  callback: MutationCallback,
) => CanvasMutationObserver;

export function hasRelevantCanvasMutation(
  records: readonly CanvasMutationRecord[],
): boolean {
  return records.some((record) => {
    if (record.type === "attributes") {
      return isRelevantClassMutation(record);
    }
    if (record.type !== "childList" || isInsidePluginUi(record.target)) {
      return false;
    }

    const changedNodes = [
      ...(record.addedNodes ?? []),
      ...(record.removedNodes ?? []),
    ];
    return changedNodes.some((node) => !isInsidePluginUi(node));
  });
}

export function getLiveHiddenNodeIds(
  hiddenNodeIds: ReadonlySet<string>,
  selectedNodeIds: readonly string[],
): ReadonlySet<string> {
  const liveHiddenNodeIds = new Set(hiddenNodeIds);
  for (const selectedNodeId of selectedNodeIds) {
    liveHiddenNodeIds.delete(selectedNodeId);
  }
  return liveHiddenNodeIds;
}

function isRelevantClassMutation(record: CanvasMutationRecord): boolean {
  if (
    record.attributeName !== "class" ||
    isInsidePluginUi(record.target)
  ) {
    return false;
  }

  return (
    normalizeCanvasClassName(record.oldValue ?? "") !==
    normalizeCanvasClassName(readClassName(record.target))
  );
}

function normalizeCanvasClassName(value: string): string {
  return value
    .split(/\s+/u)
    .filter(
      (className) =>
        className.length > 0 && !MANAGED_CANVAS_CLASSES.has(className),
    )
    .sort()
    .join(" ");
}

function readClassName(node: Node): string {
  const element = asElementLike(node);
  return element?.getAttribute("class") ?? "";
}

function isInsidePluginUi(node: Node): boolean {
  const element = asElementLike(node);
  return element !== null && element.closest(PLUGIN_UI_SELECTOR) !== null;
}

function asElementLike(node: Node): ElementLike | null {
  const candidate = node as Node & Partial<ElementLike>;
  if (
    typeof candidate.closest === "function" &&
    typeof candidate.getAttribute === "function"
  ) {
    return candidate as Node & ElementLike;
  }

  const parent = candidate.parentElement as Partial<ElementLike> | null;
  return (
    parent !== null &&
    typeof parent?.closest === "function" &&
    typeof parent.getAttribute === "function"
  )
    ? parent as ElementLike
    : null;
}

interface ElementLike {
  closest(selector: string): Element | null;
  getAttribute(name: string): string | null;
  parentElement: Element | null;
}
