# Canvas Folding 1.2.6: fold multiple selected branches

This small update lets you collapse or expand several selected Canvas branches in one action.

## Highlights

- **Multi-selection folding:** select two or more parent nodes and use the toolbar to collapse or expand every applicable branch together.
- **Smart mixed selections:** leaves and branches already in the requested state are skipped while the remaining selected branches are processed.
- **Independent nested folds:** when a selected parent and descendant are collapsed together, both remain separate fold points.
- **Clear toolbar text:** the collapse and expand tooltips now use singular or plural wording to match the current selection.
- **Stable graph handling:** shared descendants and cycles remain deterministic and finite during multi-selection actions.

## Using the update

1. Select one or more parent nodes in a Canvas.
2. Choose **Collapse selected branch** or **Collapse selected branches** in the Canvas Folding toolbar.
3. Select the folded parents and use the matching expand action to reveal them together.
4. Branch focus still requires exactly one selected node.

Canvas Folding still changes only the current view. It never writes folding data into your Canvas files.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
