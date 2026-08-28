# Canvas Folding 1.1.0: clearer node controls

This update makes folding and focus controls more informative, flexible, and consistent with exported Canvas HTML pages.

## Highlights

- **Focus every node and group:** every visible Canvas item now has a focus control, including groups and items without children.
- **Direct focus toggle:** click the focus symbol to focus that node or branch, then click the active symbol again to exit.
- **Independent controls:** folding controls and focus controls can be shown or hidden separately through settings, commands, and the Canvas toolbar.
- **State stays intact:** hiding controls does not expand folded branches or end an active focus.
- **Clear branch size:** an expanded branch still shows a minus sign. After folding, the control shows the number of hidden content nodes; if shared nodes remain visible through another parent, a plus sign reports the hidden branch connection.
- **Predictable shared branches:** shared descendants stay visible while another open parent branch still reaches them. Only exclusive descendants and the collapsed branch connections disappear.
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
