# Canvas Tree

Canvas Tree erweitert normale Obsidian-Canvases um hierarchische Funktionen. Das Plugin soll komplette Zweige rekursiv ein- und ausklappen, ohne Nodes, Kanten, Inhalte oder Positionen zu verändern.

Das Projekt befindet sich in einer frühen Entwicklungsphase. Der aktuelle Prototyp enthält bereits die Plugin-, Settings- und Canvas-Integrationsbasis sowie optional dauerhaftes Collapse/Expand.

## Aktueller Prototyp

Auf einem geöffneten Canvas stehen in der Befehlspalette folgende Commands bereit:

- `Collapse selected branch` blendet alle gerichteten Nachfahren des einzelnen ausgewählten Nodes aus.
- `Expand selected branch` blendet den an diesem Node effektiv ausgeblendeten Zweig wieder ein.
- `Focus selected branch` zeigt nur den ausgewählten Node und seine gerichteten Nachfolger; optional bleiben zusätzlich alle Ahnenpfade sichtbar.
- `Exit branch focus` beendet den Fokus und stellt den darunterliegenden Collapse-/Ebenenzustand wieder her.
- `Collapse all branches` lässt alle Root-Nodes sichtbar und klappt ihre vollständigen Teilbäume ein.
- `Expand all branches` hebt alle Collapse-Zustände des aktiven Canvas auf.
- `Show canvas through level…` zeigt alle Root-Zweige bis zu einer gemeinsam gewählten Ebene.
- `Show branch controls`, `Hide branch controls` und `Toggle branch controls` steuern die `+`/`−`-Buttons für die aktuelle Sitzung.
- `Inspect active canvas graph` zeigt eine Zusammenfassung der erkannten Struktur und bei aktiviertem Debug-Logging weitere Details.

Parent-Nodes erhalten einen `−`-Button; sind direkte Kinder ausgeblendet, wechselt er zu `+`. Ein Linksklick klappt weiterhin den vollständigen Zweig ein oder aus. Ein Rechtsklick öffnet ein Kontextmenü, das den Node allein, bis zu fünf sichtbare Ebenen oder den gesamten Zweig anzeigen kann. Bei gemeinsam genutzten Nachfahren kann ein weiterhin sichtbarer Parent den verdeckten Teilbaum über sein `+` wieder freigeben. Dabei bleiben andere ausgeblendete Parent-Nodes und ihre Kanten verborgen. Die Einstellung `Show branch controls initially` legt den Zustand nach dem Laden fest; über die Befehlspalette lassen sich die Controls jederzeit anzeigen, ausblenden oder umschalten.

Der Branch-Fokus wirkt als zusätzlicher Sichtbarkeitsfilter und verändert bestehende Collapse-Zustände nicht. Standardmäßig bleiben der ausgewählte Node und seine Nachfolger sichtbar. Mit `Include ancestors in branch focus` werden zusätzlich sämtliche gerichteten Ahnenpfade eingeblendet. Der Fokus gehört zum flüchtigen beziehungsweise optional persistenten Canvas-Zustand.

Canvas Tree merkt sich Collapse-State, Sichttiefe und temporäre Freigaben flüchtig pro geöffnetem Tab. So wird der letzte Zustand wiederhergestellt, wenn man in diesem Tab zu anderen Dateien und anschließend zum Canvas zurücknavigiert. Beim Schließen des Tabs wird dieser flüchtige Zustand verworfen. `Remember canvas states between sessions` speichert den Zustand zusätzlich nach Canvas-Pfad in der Plugin-Datei `data.json`, sodass er in neu geöffneten Tabs und nach einem Neustart von Obsidian oder des Plugins verfügbar ist. Einträge gelöschter Canvas-Dateien werden automatisch entfernt. Nicht mehr vorhandene Node-IDs werden beim Plugin-Start, nach Änderungen einer Canvas-Datei und beim manuellen Aufräumen gegen die tatsächliche Canvas-JSON geprüft. Ungültige oder vorübergehend nicht lesbare Canvas-Daten führen zu keiner Löschung. Die `.canvas`-Datei selbst wird nicht verändert.

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
