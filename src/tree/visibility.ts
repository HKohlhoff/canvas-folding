import type { CanvasGraph } from "./graph";

export interface CanvasVisibility {
  dimmedEdgeIds: ReadonlySet<string>;
  dimmedNodeIds: ReadonlySet<string>;
  hiddenEdgeIds: ReadonlySet<string>;
  hiddenNodeIds: ReadonlySet<string>;
}

export function deriveCanvasVisibility(
  graph: Pick<CanvasGraph, "edges">,
  hiddenNodeIds: ReadonlySet<string>,
  dimmedNodeIds: ReadonlySet<string> = new Set(),
): CanvasVisibility {
  const normalizedHiddenNodeIds = new Set(hiddenNodeIds);
  const normalizedDimmedNodeIds = new Set(
    [...dimmedNodeIds].filter((nodeId) => !normalizedHiddenNodeIds.has(nodeId)),
  );
  const hiddenEdgeIds = getIncidentEdgeIds(graph, normalizedHiddenNodeIds);
  const dimmedEdgeIds = new Set(
    graph.edges
      .filter(
        (edge) =>
          !hiddenEdgeIds.has(edge.id) &&
          (normalizedDimmedNodeIds.has(edge.fromNode) ||
            normalizedDimmedNodeIds.has(edge.toNode)),
      )
      .map((edge) => edge.id),
  );

  return {
    dimmedEdgeIds,
    dimmedNodeIds: normalizedDimmedNodeIds,
    hiddenEdgeIds,
    hiddenNodeIds: normalizedHiddenNodeIds,
  };
}

export function getIncidentEdgeIds(
  graph: Pick<CanvasGraph, "edges">,
  nodeIds: ReadonlySet<string>,
): ReadonlySet<string> {
  return new Set(
    graph.edges
      .filter(
        (edge) => nodeIds.has(edge.fromNode) || nodeIds.has(edge.toNode),
      )
      .map((edge) => edge.id),
  );
}
