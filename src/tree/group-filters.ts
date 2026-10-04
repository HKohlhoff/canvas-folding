import type { CanvasGraphNodeData } from "./graph";

export interface GroupLabelCount {
  count: number;
  label: string;
}

export function normalizeHiddenGroupLabels(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    const label = entry.trim();
    return label.length === 0 ? [] : [label];
  }))].sort(compareGroupLabels);
}

export function getGroupLabelCounts(
  nodes: readonly CanvasGraphNodeData[],
): readonly GroupLabelCount[] {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.type !== "group" || node.label === undefined) continue;
    const label = node.label.trim();
    if (label.length === 0) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => compareGroupLabels(left.label, right.label));
}

export function getMatchingGroupIds(
  nodes: readonly CanvasGraphNodeData[],
  hiddenGroupLabels: Iterable<string>,
): ReadonlySet<string> {
  const hiddenLabels = new Set(normalizeHiddenGroupLabels([...hiddenGroupLabels]));
  return new Set(
    nodes
      .filter(
        (node) =>
          node.type === "group" &&
          node.label !== undefined &&
          hiddenLabels.has(node.label.trim()),
      )
      .map((node) => node.id),
  );
}

function compareGroupLabels(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" }) ||
    left.localeCompare(right);
}
