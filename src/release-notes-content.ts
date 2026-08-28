export const CURRENT_RELEASE_NOTES_ID = "release-1.1.1";

export const CURRENT_RELEASE_NOTES_MARKDOWN = `# Canvas Folding 1.1.1: clearer node controls

This update makes folding and focus controls more informative, flexible, and consistent with Canvas HTML pages created by the Canvas HTML Exporter plugin.

Version 1.1.1 also removes a Community Directory CSS warning without changing the plugin's appearance or behavior.

## Highlights

- **Focus every node and group:** every visible Canvas item now has a focus control, including groups and items without children. Focusing a group keeps all items geometrically contained by it active as part of the focus area.
- **Direct focus toggle:** click the focus symbol to focus that node or branch, then click the active symbol again to exit.
- **Independent controls:** folding controls and focus controls can be shown or hidden separately through settings, commands, and the Canvas toolbar.
- **State stays intact:** hiding controls does not expand folded branches or end an active focus.
- **Clear branch size:** an expanded branch still shows a minus sign. After folding, the control shows the number of hidden content nodes; if shared nodes remain visible through another parent, a plus sign reports the hidden branch connection.
- **Predictable shared branches:** shared descendants stay visible while another open parent branch still reaches them. Only exclusive descendants and the collapsed branch connections disappear.
- **Complete group branches:** hiding a connected group also hides the nodes geometrically contained by it, even when they have no separate parent edge. The group frame itself follows its own directed branch and stays visible when only a separate branch inside it is folded. If a visible node's complete branch is unavailable behind a folded group, its folding control stays in place but is disabled until the group is expanded.
- **Clean Advanced Canvas groups:** Canvas Folding controls disappear while Advanced Canvas has a group collapsed and return when it is expanded.
- **Readable large counts:** controls grow for two- or three-digit counts without covering the focus control or node content.
- **Consistent node layout:** focus stays to the left of folding, with the same order for pointer and keyboard use.
- **Clear toolbar grouping:** the focus-control visibility action sits directly before the focus action in its own toolbar section.

## Using the new controls

1. Open a Canvas with Canvas Folding enabled.
2. Use the focus symbol on any node or group to focus it individually or together with its descendants.
3. Use the folding control on a parent node to collapse or expand its directed branch.
4. Use the two visibility actions in the Canvas toolbar when you want to hide folding controls, focus controls, or both without changing the Canvas view state.

Canvas Folding still changes only the current view. It never writes folding data into your Canvas files.

This update description appears automatically once. You can reopen it at any time with **Show last update** at the bottom of the Canvas Folding settings. Closing it leaves no note or other content file in your Vault.

If Canvas Folding makes your Canvas work easier and you would like to support its continued development, you can [buy me a coffee on Ko-fi](https://ko-fi.com/hokdev). Thank you!
`;
