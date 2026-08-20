# Canvas Tree

Canvas Tree erweitert normale Obsidian-Canvases um hierarchische Funktionen. Das Plugin soll komplette Zweige rekursiv ein- und ausklappen, ohne Nodes, Kanten, Inhalte oder Positionen zu verändern.

Das Projekt befindet sich in einer frühen Entwicklungsphase. Der aktuelle Prototyp enthält bereits die Plugin-, Settings- und Canvas-Integrationsbasis sowie optional dauerhaftes Collapse/Expand.

## Aktueller Prototyp

Auf einem geöffneten Canvas stehen in der Befehlspalette folgende Commands bereit:

- `Collapse selected branch` blendet alle gerichteten Nachfahren des einzelnen ausgewählten Nodes aus.
- `Expand selected branch` blendet den an diesem Node effektiv ausgeblendeten Zweig wieder ein.
- `Collapse all branches` lässt alle Root-Nodes sichtbar und klappt ihre vollständigen Teilbäume ein.
- `Expand all branches` hebt alle Collapse-Zustände des aktiven Canvas auf.
- `Show canvas through level…` zeigt alle Root-Zweige bis zu einer gemeinsam gewählten Ebene.
- `Show branch controls`, `Hide branch controls` und `Toggle branch controls` steuern die `+`/`−`-Buttons für die aktuelle Sitzung.
- `Inspect active canvas graph` zeigt eine Zusammenfassung der erkannten Struktur und bei aktiviertem Debug-Logging weitere Details.

Parent-Nodes erhalten einen `−`-Button; sind direkte Kinder ausgeblendet, wechselt er zu `+`. Ein Linksklick klappt weiterhin den vollständigen Zweig ein oder aus. Ein Rechtsklick öffnet ein Kontextmenü, das den Node allein, bis zu fünf sichtbare Ebenen oder den gesamten Zweig anzeigen kann. Bei gemeinsam genutzten Nachfahren kann ein weiterhin sichtbarer Parent den verdeckten Teilbaum über sein `+` wieder freigeben. Dabei bleiben andere ausgeblendete Parent-Nodes und ihre Kanten verborgen. Die Einstellung `Show branch controls initially` legt den Zustand nach dem Laden fest; über die Befehlspalette lassen sich die Controls jederzeit anzeigen, ausblenden oder umschalten.

`Remember canvas states` speichert Collapse-State, Sichttiefe und temporäre Freigaben nach Canvas-Pfad in der Plugin-Datei `data.json`. Beim erneuten Öffnen wird der letzte Zustand wiederhergestellt. Einträge gelöschter Canvas-Dateien werden automatisch bereinigt; unbekannte Node-IDs bleiben erhalten und werden ignoriert, damit ein noch nicht vollständig aufgebauter Canvas keinen Zustand irrtümlich löscht. In den Settings stehen zusätzlich Aktionen zum Aufräumen und vollständigen Löschen der gespeicherten Zustände bereit. Ist die Option ausgeschaltet, bleibt der Zustand auf die aktuelle Plugin-Sitzung begrenzt. Die `.canvas`-Datei wird in beiden Fällen nicht verändert.

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

Canvas Tree verarbeitet Canvas-Daten lokal im Vault und sendet keine Daten an externe Dienste. Bei aktivierter Zustandsspeicherung enthält die lokale Plugin-Datei `data.json` Canvas-Pfade, Node-IDs und Sichtbarkeitseinstellungen.

## Grenzen

- Die Canvas-Ansicht besitzt derzeit nur teilweise öffentlich typisierte Erweiterungspunkte. Interne Zugriffe werden deshalb in einem Compatibility-Layer gekapselt.
- Automatische Layouts gehören noch nicht zu diesem Prototyp.

## Lizenz

Das Projekt ist derzeit nicht lizenziert. Vor einer Veröffentlichung muss eine Lizenz festgelegt werden.
