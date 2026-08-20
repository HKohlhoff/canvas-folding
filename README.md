# Canvas Tree

Canvas Tree erweitert normale Obsidian-Canvases um hierarchische Funktionen. Das Plugin soll komplette Zweige rekursiv ein- und ausklappen, ohne Nodes, Kanten, Inhalte oder Positionen zu verändern.

Das Projekt befindet sich in einer frühen Entwicklungsphase. Die erste Phase schafft eine belastbare Plugin-, Settings- und Canvas-Integrationsbasis; Collapse/Expand folgt darauf aufbauend.

## Aktueller Prototyp

Auf einem geöffneten Canvas stehen in der Befehlspalette folgende Commands bereit:

- `Collapse selected branch` blendet alle gerichteten Nachfahren des einzelnen ausgewählten Nodes aus.
- `Expand selected branch` blendet den zuvor an diesem Node eingeklappten Zweig wieder ein.
- `Expand all branches` hebt alle Collapse-Zustände des aktiven Canvas auf.
- `Inspect active canvas graph` zeigt eine Zusammenfassung der erkannten Struktur und bei aktiviertem Debug-Logging weitere Details.

Der Collapse-State existiert nur für die aktuelle Plugin-Sitzung. Das Plugin schreibt für diese Funktionen nichts in die `.canvas`-Datei.

## Geplanter Funktionsumfang

- Hierarchie aus gerichteten Canvas-Kanten (`fromNode` → `toNode`) ableiten
- komplette Teilbäume ein- und ausklappen
- unverändertes Stable Layout
- zyklensichere Graph-Traversierung
- optionale Kompatibilität mit Advanced Canvas ohne harte Abhängigkeit

Canvas Tree ist weder Importer noch HTML-Exporter. Normale JSON-Canvas-Dateien bleiben die Source of Truth.

## Entwicklung

Voraussetzung ist Node.js 20.19 oder neuer.

```bash
npm ci
npm test
npm run build:prod
```

Für ein lokales Deployment wird `OBSIDIAN_PLUGINS_DIR` auf den `.obsidian/plugins`-Ordner eines Testvaults gesetzt:

```bash
OBSIDIAN_PLUGINS_DIR="/path/to/vault/.obsidian/plugins" npm run build:prod:deploy
```

Der Build kopiert `main.js`, `manifest.json` und `styles.css` nach `canvas-tree` und legt dort die von Obsidian Hot Reload verwendete Datei `.hotreload` an.

## Datenschutz

Canvas Tree verarbeitet Canvas-Daten lokal im Vault und sendet keine Daten an externe Dienste.

## Grenzen

- Die Canvas-Ansicht besitzt derzeit nur teilweise öffentlich typisierte Erweiterungspunkte. Interne Zugriffe werden deshalb in einem Compatibility-Layer gekapselt.
- Automatische Aktualisierung nach Canvas-Re-Renders, persistenter Collapse-State und automatische Layouts gehören noch nicht zu diesem Prototyp.

## Lizenz

Das Projekt ist derzeit nicht lizenziert. Vor einer Veröffentlichung muss eine Lizenz festgelegt werden.
