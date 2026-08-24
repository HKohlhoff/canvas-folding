# Canvas Folding API v1

Canvas Folding exposes a small optional API on its plugin instance. Consumers
discover the plugin by the stable ID `canvas-folding`; no global `window`
object, DOM selector or direct access to `data.json` is part of the contract.

## Contract

```ts
export interface CanvasFoldingApi {
  readonly apiVersion: 1;
  getFoldState(canvasPath: string): Promise<CanvasFoldStateSnapshot | null>;
}

export interface CanvasFoldStateSnapshot {
  readonly canvasPath: string;
  readonly hiddenEdgeIds: readonly string[];
  readonly hiddenNodeIds: readonly string[];
  readonly source: "active-leaf" | "persisted";
}
```

`canvasPath` is a vault-relative `.canvas` path. The method normalizes the path
and resolves state in this order:

1. If the active workspace leaf shows that path, its leaf-specific session
   state is used. This also applies when persistence is disabled.
2. Otherwise, a saved state is used only when **Remember canvas states between
   sessions** is enabled.
3. Otherwise, the method returns `null`.

This makes multiple open leaves deterministic: the active matching leaf wins.
The API does not choose an arbitrary background leaf.

An active Canvas in its default state returns a snapshot with empty hidden-ID
arrays. `null` means that no applicable state can be resolved, the path is
invalid, or a required persisted Canvas file is missing, unreadable or invalid.

The ID arrays are effective visibility results, not references to internal
state objects. They already apply Canvas Folding's cycle-safe graph traversal,
shared-descendant rules, group geometry and incident-edge rules. Consumers
should treat their order as insignificant.

Branch focus is intentionally excluded. Focus is a temporary UI spotlight;
the API reports only elements hidden by folding and level restrictions.

## Discovery

Obsidian does not currently expose a strongly typed public plugin-discovery
API. Consumers should therefore use a narrow compatibility type, discover by
plugin ID and verify `apiVersion` structurally:

```ts
import type { App } from "obsidian";

type PluginManagerLike = {
  getPlugin?: (id: string) => unknown;
  plugins?: Record<string, unknown>;
};

type CanvasFoldingPluginLike = {
  api?: CanvasFoldingApi;
};

export function findCanvasFoldingApi(
  app: App,
): CanvasFoldingApi | null {
  const manager = (app as App & { plugins?: PluginManagerLike }).plugins;
  const plugin = manager?.getPlugin?.("canvas-folding") ??
    manager?.plugins?.["canvas-folding"];
  const api = (plugin as CanvasFoldingPluginLike | undefined)?.api;
  return api?.apiVersion === 1 ? api : null;
}
```

The consumer remains fully functional when this returns `null`. Merely having
Canvas Folding installed must not silently change another plugin's behavior;
using the current fold state remains an explicit consumer/user choice.

## Example

```ts
const foldingApi = findCanvasFoldingApi(this.app);
const foldState = foldingApi === null
  ? null
  : await foldingApi.getFoldState(canvasFile.path);

if (foldState !== null) {
  const hiddenNodes = new Set(foldState.hiddenNodeIds);
  const hiddenEdges = new Set(foldState.hiddenEdgeIds);
  // Apply the state only when the export option explicitly requests it.
}
```

Future incompatible contracts will use another `apiVersion`. API v1 exposes
only plain data and never DOM elements, Canvas views, workspace leaves,
Obsidian runtime objects or Canvas Folding's internal state classes.
