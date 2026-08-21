import assert from "node:assert/strict";
import test from "node:test";

import { buildCanvasGraph } from "../../src/tree/graph";
import { BranchCollapseState } from "../../src/tree/state";
import { buildToolbarButtonModels } from "../../src/ui/toolbar-model";

const graph = buildCanvasGraph({
  nodes: [
    { id: "A", type: "text" },
    { id: "B", type: "text" },
  ],
  edges: [{ id: "AB", fromNode: "A", toNode: "B" }],
});

void test("uses an open eye while branch controls are visible", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    [],
    true,
  );

  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.icon,
    "eye",
  );
  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.active,
    undefined,
  );
});

void test("uses a closed eye while branch controls are hidden", () => {
  const controls = buildToolbarButtonModels(
    graph,
    new BranchCollapseState(),
    [],
    false,
  );

  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.icon,
    "eye-closed",
  );
  assert.equal(
    controls.find((control) => control.action === "toggle-controls")?.active,
    undefined,
  );
});
