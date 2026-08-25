import assert from "node:assert/strict";
import test from "node:test";

import { parseCanvasGraphData } from "../../src/canvas/graph-data";

void test("reads nodes and edges retained inside collapsed group data", () => {
  const graph = parseCanvasGraphData({
    nodes: [
      {
        id: "ROOT",
        type: "text",
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      },
      {
        id: "GROUP",
        type: "group",
        x: 200,
        y: 100,
        width: 400,
        height: 300,
        collapsed: true,
        collapsedData: {
          nodes: [
            {
              id: "CHILD",
              type: "text",
              x: 40,
              y: 30,
              width: 120,
              height: 60,
            },
          ],
          edges: [
            { id: "EDGE", fromNode: "ROOT", toNode: "CHILD" },
          ],
        },
      },
    ],
    edges: [],
  });

  assert.deepEqual(graph, {
    nodes: [
      {
        id: "ROOT",
        type: "text",
        x: 0,
        y: 0,
        width: 100,
        height: 60,
      },
      {
        id: "GROUP",
        type: "group",
        x: 200,
        y: 100,
        width: 400,
        height: 300,
      },
      {
        id: "CHILD",
        type: "text",
        x: 240,
        y: 130,
        width: 120,
        height: 60,
      },
    ],
    edges: [{ id: "EDGE", fromNode: "ROOT", toNode: "CHILD" }],
  });
});

void test("keeps top-level nodes authoritative over collapsed duplicates", () => {
  const graph = parseCanvasGraphData({
    nodes: [
      {
        id: "GROUP",
        type: "group",
        x: 200,
        y: 100,
        width: 400,
        height: 300,
        collapsedData: {
          nodes: [
            {
              id: "CHILD",
              type: "text",
              x: 40,
              y: 30,
              width: 80,
              height: 50,
            },
          ],
          edges: [],
        },
      },
      {
        id: "CHILD",
        type: "text",
        x: 900,
        y: 800,
        width: 120,
        height: 60,
      },
    ],
    edges: [],
  });

  assert.deepEqual(graph?.nodes.map((node) => node.id), ["GROUP", "CHILD"]);
  assert.deepEqual(graph?.nodes[1], {
    id: "CHILD",
    type: "text",
    x: 900,
    y: 800,
    width: 120,
    height: 60,
  });
});

void test("restores nested collapsed node coordinates recursively", () => {
  const graph = parseCanvasGraphData({
    nodes: [
      {
        id: "OUTER",
        type: "group",
        x: 100,
        y: 200,
        width: 500,
        height: 400,
        collapsedData: {
          nodes: [
            {
              id: "INNER",
              type: "group",
              x: 50,
              y: 60,
              width: 300,
              height: 200,
              collapsedData: {
                nodes: [
                  {
                    id: "CHILD",
                    type: "text",
                    x: 20,
                    y: 30,
                    width: 100,
                    height: 50,
                  },
                ],
                edges: [],
              },
            },
          ],
          edges: [],
        },
      },
    ],
    edges: [],
  });

  assert.deepEqual(graph?.nodes[1], {
    id: "INNER",
    type: "group",
    x: 150,
    y: 260,
    width: 300,
    height: 200,
  });
  assert.deepEqual(graph?.nodes[2], {
    id: "CHILD",
    type: "text",
    x: 170,
    y: 290,
    width: 100,
    height: 50,
  });
});

void test("ignores malformed foreign collapsed records", () => {
  const graph = parseCanvasGraphData({
    nodes: [
      {
        id: "GROUP",
        type: "group",
        collapsedData: {
          nodes: [null, { type: "text" }],
          edges: [{ id: "BROKEN", fromNode: "GROUP" }],
        },
      },
    ],
    edges: [],
  });

  assert.deepEqual(graph, {
    nodes: [{ id: "GROUP", type: "group" }],
    edges: [],
  });
});
