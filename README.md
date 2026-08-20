# Canvas Tree

Canvas Tree erweitert normale Obsidian-Canvases um hierarchische Funktionen. Das Plugin soll komplette Zweige rekursiv ein- und ausklappen, ohne Nodes, Kanten, Inhalte oder Positionen zu verändern.

Das Projekt befindet sich in einer frühen Entwicklungsphase. Der aktuelle Prototyp enthält bereits die Plugin-, Settings- und Canvas-Integrationsbasis sowie sessionbasiertes Collapse/Expand.

## Aktueller Prototyp

Auf einem geöffneten Canvas stehen in der Befehlspalette folgende Commands bereit:

- `Collapse selected branch` blendet alle gerichteten Nachfahren des einzelnen ausgewählten Nodes aus.
- `Expand selected branch` blendet den an diesem Node effektiv ausgeblendeten Zweig wieder ein.
- `Expand all branches` hebt alle Collapse-Zustände des aktiven Canvas auf.
- `Show branch controls`, `Hide branch controls` und `Toggle branch controls` steuern die `+`/`−`-Buttons für die aktuelle Sitzung.
- `Inspect active canvas graph` zeigt eine Zusammenfassung der erkannten Struktur und bei aktiviertem Debug-Logging weitere Details.

Parent-Nodes erhalten einen `−`-Button; sind direkte Kinder ausgeblendet, wechselt er zu `+`. Bei gemeinsam genutzten Nachfahren kann ein weiterhin sichtbarer Parent den verdeckten Teilbaum über sein `+` wieder freigeben. Dabei bleiben andere ausgeblendete Parent-Nodes und ihre Kanten verborgen. Die Einstellung `Show branch controls` legt fest, ob die Buttons nach dem Laden standardmäßig sichtbar sind. Collapse-State und temporäre Freigaben existieren nur für die aktuelle Plugin-Sitzung. Das Plugin schreibt für diese Funktionen nichts in die `.canvas`-Datei.

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
- Persistenter Collapse-State und automatische Layouts gehören noch nicht zu diesem Prototyp.

## Lizenz

Das Projekt ist derzeit nicht lizenziert. Vor einer Veröffentlichung muss eine Lizenz festgelegt werden.
