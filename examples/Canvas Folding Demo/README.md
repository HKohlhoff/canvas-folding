# Canvas Folding Demo

This folder is self-contained. Copy the complete **Canvas Folding Demo** folder
to your Obsidian vault, then open `Canvas Folding Demo.canvas`.

The Canvas contains explanatory cards and these graph cases:

- a basic three-level tree and an isolated node;
- a shared descendant with two parents;
- a directed cycle without a root;
- a grouped branch containing text, Markdown file, link, and image nodes.

Suggested tour:

1. Use the `−` and `+` node controls on the basic tree.
2. Open a control's context menu and choose a visible level.
3. Collapse one parent of the shared descendant, then reveal the shared branch
   through the other parent.
4. Collapse and expand individual nodes in the cycle; traversal stays finite.
5. Collapse **Mixed root** and verify that the group frame disappears with all
   contained nodes.
6. Focus a branch and verify that unrelated nodes and edges are dimmed and
   cannot be selected.
7. Try **Collapse all branches**, **Expand all branches**, and
   **Show canvas through level…** from the Canvas Folding toolbar.
8. Enable persistence in the settings menu, fold a branch, close the tab, and reopen the Canvas.

The demo is intended for learning and release smoke tests. The smaller files in
the repository's `manual-tests/` directory remain the authoritative regression
fixtures.
