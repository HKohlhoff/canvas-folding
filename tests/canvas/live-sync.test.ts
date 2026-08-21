import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRelevantCanvasMutation,
  type CanvasMutationRecord,
} from "../../src/canvas/live-sync";

void test("ignores visibility classes managed by Canvas Folding", () => {
  const node = createElement("canvas-node canvas-folding-hidden");

  assert.equal(
    hasRelevantCanvasMutation([
      classMutation(node, "canvas-node"),
    ]),
    false,
  );
});

void test("detects Obsidian selection class changes", () => {
  const node = createElement("canvas-node is-selected");

  assert.equal(
    hasRelevantCanvasMutation([
      classMutation(node, "canvas-node"),
    ]),
    true,
  );
});

void test("ignores child changes created by plugin controls", () => {
  const canvasNode = createElement("canvas-node");
  const control = createElement(
    "canvas-folding-branch-control",
    canvasNode,
  );

  assert.equal(
    hasRelevantCanvasMutation([
      childMutation(canvasNode, [control]),
    ]),
    false,
  );
});

void test("detects structural canvas child changes", () => {
  const canvasRoot = createElement("canvas");
  const canvasNode = createElement("canvas-node", canvasRoot);

  assert.equal(
    hasRelevantCanvasMutation([
      childMutation(canvasRoot, [canvasNode]),
    ]),
    true,
  );
});

void test("detects changed nodes without an element parent", () => {
  const detachedNode = {} as Node;
  const canvasRoot = createElement("canvas");

  assert.equal(
    hasRelevantCanvasMutation([
      childMutation(canvasRoot, [detachedNode]),
    ]),
    true,
  );
});

function classMutation(
  target: FakeElement,
  oldValue: string,
): CanvasMutationRecord {
  return {
    attributeName: "class",
    oldValue,
    target: target as unknown as Node,
    type: "attributes",
  };
}

function childMutation(
  target: FakeElement,
  addedNodes: readonly (FakeElement | Node)[],
): CanvasMutationRecord {
  return {
    addedNodes: addedNodes as readonly Node[],
    removedNodes: [],
    target: target as unknown as Node,
    type: "childList",
  };
}

function createElement(
  className: string,
  parentElement: FakeElement | null = null,
): FakeElement {
  const element: FakeElement = {
    className,
    getAttribute: (name) => name === "class" ? element.className : null,
    parentElement,
    closest: (selector) => {
      const selectorClasses = selector
        .split(",")
        .map((part) => part.trim().replace(/^\./u, ""));
      let current: FakeElement | null = element;
      while (current !== null) {
        const currentClasses = new Set(current.className.split(/\s+/u));
        if (selectorClasses.some((name) => currentClasses.has(name))) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
  };
  return element;
}

interface FakeElement {
  className: string;
  closest(selector: string): FakeElement | null;
  getAttribute(name: string): string | null;
  parentElement: FakeElement | null;
}
