# Canvas Folding

Canvas Folding erweitert normale Obsidian-Canvases um hierarchische Funktionen. Das Plugin klappt komplette Zweige rekursiv ein und aus, ohne Nodes, Kanten, Inhalte oder Positionen zu verändern.

Der aktuelle Stand ist eine funktionsfähige Vorabversion in der V1-Stabilisierung. Sie unterstützt den normalen Obsidian Canvas ohne Abhängigkeit von Advanced Canvas.

## Aktueller Funktionsumfang

Auf einem geöffneten Canvas stehen in der Befehlspalette folgende Commands bereit:

- `Collapse selected branch` blendet alle gerichteten Nachfahren des einzelnen ausgewählten Nodes aus.
- `Expand selected branch` blendet den an diesem Node effektiv ausgeblendeten Zweig wieder ein.
- `Focus selected branch` hebt den ausgewählten Node und seine gerichteten Nachfolger hervor und dimmt den übrigen Canvas-Kontext.
- `Exit branch focus` beendet den Fokus und stellt den darunterliegenden Collapse-/Ebenenzustand wieder her.
- `Collapse all branches` lässt alle Root-Nodes sichtbar und klappt ihre vollständigen Teilbäume ein.
- `Expand all branches` hebt alle Collapse-Zustände des aktiven Canvas auf.
- `Show canvas through level…` zeigt alle Root-Zweige bis zu einer gemeinsam gewählten Ebene.
- `Show branch controls`, `Hide branch controls` und `Toggle branch controls` steuern die `+`/`−`-Buttons für die aktuelle Sitzung.
- `Show canvas toolbar`, `Hide canvas toolbar` und `Toggle canvas toolbar` steuern die Befehlsleiste am oberen Canvas-Rand.
- `Reset canvas toolbar position` setzt eine verschobene Toolbar wieder an den oberen Standardplatz.
- `Show current status` meldet zusätzlich, ob der aktuelle Zustand nur im offenen Tab gilt, dauerhaft gespeichert ist oder bei aktivierter Persistenz dem Standardzustand entspricht.
- `Inspect active canvas graph` zeigt eine Zusammenfassung der erkannten Struktur und bei aktiviertem Debug-Logging weitere Details.

Parent-Nodes erhalten einen `−`-Button; sind direkte Kinder ausgeblendet, wechselt er zu `+`. Ein Linksklick klappt weiterhin den vollständigen Zweig ein oder aus. Ein Rechtsklick öffnet ein Kontextmenü, das den Node allein, bis zu fünf sichtbare Ebenen oder den gesamten Zweig anzeigen kann. Bei gemeinsam genutzten Nachfahren kann ein weiterhin sichtbarer Parent den verdeckten Teilbaum über sein `+` wieder freigeben. Dabei bleiben andere ausgeblendete Parent-Nodes und ihre Kanten verborgen. Die Einstellung `Show branch controls initially` legt den Zustand nach dem Laden fest; über die Befehlspalette lassen sich die Controls jederzeit anzeigen, ausblenden oder umschalten.

Die Branch-Controls sind per Tastatur in Tiefenreihenfolge erreichbar: Von einem Parent wird zuerst der obere Kind-Zweig vollständig durchlaufen, bevor der nächste, darunterliegende Geschwisterzweig folgt. Ist genau ein Parent ausgewählt, beginnt der nächste Durchlauf an dessen Control. `Enter` oder `Leertaste` klappt den Zweig ein beziehungsweise aus; die Kontextmenütaste öffnet die Ebenenauswahl. Der Griff der Canvas-Toolbar lässt sich außer durch Ziehen auch mit den Pfeiltasten bewegen. Nach einer Tastaturaktion bleibt der Fokus auf der ausgelösten Funktion.

Auf Geräten mit grobem Zeiger werden die Branch-Controls vergrößert. Die Toolbar lässt sich horizontal per Touch scrollen, ihr Griff verwendet Pointer-Events zum Verschieben. Ihre vollständige Pointer-Sequenz wird gegenüber darunterliegenden Canvas-Nodes isoliert. Das Öffnen der Ebenenauswahl per Langdruck hängt davon ab, ob die jeweilige Obsidian-/WebView-Version dabei ein Kontextmenü-Ereignis bereitstellt.

Auf iOS wird die Obsidian-eigene Canvas-Toolbar innerhalb der Canvas-Ansicht auf den Popover-Layer und in eine eigene Compositing-Ebene angehoben, damit transformierte Node-Inhalte sie nicht teilweise überdecken. Menüs, Modale, Hinweise und Tooltips bleiben darüber; andere Plattformen sind von dieser Korrektur nicht betroffen.

Der zusätzliche Schutz vor Verbindungshandles an verborgenen Nodes greift nur im Desktopmodus in Obsidian privaten Canvas-Interaktionslayer ein. Mobile Apps behalten ihre native Tap- und Stift-Auswahl unverändert; verborgene Nodes bleiben dort durch ihre DOM-Sichtbarkeit aus dem Hit-Testing entfernt.

Eine nicht leere Canvas-Gruppe wird zusammen mit ihrem Inhalt ausgeblendet, sobald alle vollständig in ihr enthaltenen Nodes ausgeblendet sind. Leere Gruppen sowie Gruppen mit mindestens einem sichtbaren enthaltenen Node bleiben sichtbar.

Änderungen an der geöffneten Canvas-Struktur, Auswahlwechsel sowie Obsidian-Re-Renders werden entprellt erkannt. Controls, Toolbar-Aktionen und bestehende Folding-Zustände werden anschließend gegen den aktuellen Graphen aktualisiert. Ein neu hinzugefügter Nachfahre eines eingeklappten Zweigs bleibt mit seiner Kante sichtbar, solange er ausgewählt ist; nach dem Deselektieren wird er entsprechend dem Folding-Zustand verborgen.

Der Branch-Fokus wirkt als zusätzlicher Spotlight-Filter und verändert bestehende Collapse-Zustände nicht. Der ausgewählte Node und seine Nachfolger bleiben vollständig aktiv; Gruppenrahmen um aktive Nodes bleiben ebenfalls aktiv. Alle übrigen Nodes und betroffenen Kanten werden mit einstellbarer Deckkraft gedimmt und vor Interaktionen geschützt. Bereits eingeklappte Elemente bleiben vollständig verborgen. Der Fokus gehört zum flüchtigen beziehungsweise optional persistenten Canvas-Zustand.

Die optionale Canvas-Toolbar stellt die Canvas-Folding-Funktionen als Icon-Buttons direkt am oberen Rand bereit. Collapse und Expand verwenden dieselben `−`/`+`-Symbole wie die Node-Controls; Branch-Fokus wird über einen aktiven Toggle-Button gesteuert. Tooltips benennen jede Aktion, und nicht anwendbare Aktionen sind deaktiviert. Über den Griff am linken Rand lässt sich die Toolbar verschieben; ihre globale Position wird in den Plugin-Einstellungen gespeichert. Bei knapper Breite bleibt die Leiste horizontal scrollbar. `Show canvas toolbar initially` legt nur den Startzustand fest, der anschließend über Commands oder den Ausblenden-Button geändert werden kann.

Canvas Folding merkt sich Collapse-State, Sichttiefe und temporäre Freigaben flüchtig pro geöffnetem Tab. So wird der letzte Zustand wiederhergestellt, wenn man in diesem Tab zu anderen Dateien und anschließend zum Canvas zurücknavigiert. Beim Schließen des Tabs wird dieser flüchtige Zustand verworfen. `Remember canvas states between sessions` speichert den Zustand zusätzlich nach Canvas-Pfad in der Plugin-Datei `data.json`, sodass er in neu geöffneten Tabs und nach einem Neustart von Obsidian oder des Plugins verfügbar ist. Einträge gelöschter Canvas-Dateien werden automatisch entfernt. Nicht mehr vorhandene Node-IDs werden beim Plugin-Start, nach Änderungen einer Canvas-Datei und beim manuellen Aufräumen gegen die tatsächliche Canvas-JSON geprüft. Ungültige oder vorübergehend nicht lesbare Canvas-Daten führen zu keiner Löschung. Die `.canvas`-Datei selbst wird nicht verändert.

## Abgrenzung und nächste Phasen

- Die Hierarchie wird aus gerichteten Canvas-Kanten (`fromNode` → `toNode`) abgeleitet; Canvas Folding behandelt die Datei dabei als allgemeinen Graphen mit mehreren Roots, mehreren Parents, Querverbindungen und Zyklen.
- Folding bleibt reiner View-State und verändert weder Layout noch `.canvas`-Datei.
- Eine öffentliche, versionierte Folding-API folgt erst nach der funktionalen V1-Stabilisierung.
- Die Koexistenz mit Advanced Canvas wird anschließend separat geprüft; eine harte Abhängigkeit ist nicht vorgesehen.
- Automatisches Layout, Navigation zwischen Verwandten und Branch-Styling sind bewusst spätere Funktionen.

Canvas Folding ist weder Importer noch HTML-Exporter. Normale JSON-Canvas-Dateien bleiben die Source of Truth.

## Öffentliche API

Andere Plugins können Canvas Folding optional über die Plugin-ID
`canvas-folding` erkennen. Die versionierte `CanvasFoldingApi` v1 liefert für
einen Vault-relativen Canvas-Pfad die effektiv ausgeblendeten Node- und
Edge-IDs. Ein passender aktiver Leaf hat Vorrang vor einem persistenten Zustand;
DOM-, View- und interne State-Objekte werden nicht exponiert. Der vollständige
Vertrag und ein defensives Discovery-Beispiel stehen unter
[`docs/api.md`](docs/api.md).

## Entwicklung

Die versionierte manuelle V1-Testmatrix liegt unter
[`manual-tests/`](manual-tests/README.md). Sie enthält kleine Canvas-Fixtures
für Baumtiefe, mehrere Roots, isolierte Nodes, Shared Descendants, einen
rootlosen Zyklus sowie Gruppen mit unterschiedlichen Node-Typen.

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

Der Build kopiert `main.js`, `manifest.json` und `styles.css` nach `canvas-folding` und legt dort die von Obsidian Hot Reload verwendete Datei `.hotreload` an.

## Datenschutz

Canvas Folding verarbeitet Canvas-Daten lokal im Vault und sendet keine Daten an externe Dienste. Bei aktivierter Zustandsspeicherung enthält die lokale Plugin-Datei `data.json` Canvas-Pfade, Node-IDs und Sichtbarkeitseinstellungen.

## Grenzen

- Die Canvas-Ansicht besitzt derzeit nur teilweise öffentlich typisierte Erweiterungspunkte. Interne Zugriffe werden deshalb in einem Compatibility-Layer gekapselt.
- Advanced-Canvas-Koexistenz und eine spätere öffentliche Folding-API sind noch nicht Teil dieses Vorabstands.

## Lizenz

Das Projekt ist derzeit nicht lizenziert. Vor einer Veröffentlichung muss eine Lizenz festgelegt werden.
