# Projektbriefing: Canvas HTML Exporter – Tree-/Mindmap-Erweiterung

**Stand:** 19.08.2026  
**Zweck:** Startdokument für die Weiterentwicklung mit Codex in VS Code.

## Ausgangslage

Der bereits veröffentlichte Obsidian-Plugin **Canvas HTML Exporter** soll um allgemeine Tree-/Mindmap-Funktionen erweitert werden. Das Plugin hat bereits mehr als 500 Downloads; in der bisherigen Diskussion waren keine gemeldeten Fehler bekannt.

Die Idee entstand bei der Entwicklung des separaten Python-Konverters `mmap2obsidian` (Stand v1.3.0), der MindManager-`.mmap`-Dateien in normale Obsidian-Canvas-Dateien konvertiert.

Wichtige Trennung:

- `mmap2obsidian` bleibt ein einmaliges Migrationswerkzeug für MindManager → Obsidian.
- Der Canvas HTML Exporter soll **keine MindManager-Abhängigkeit** bekommen.
- Die neuen Funktionen sollen für jede geeignete normale `.canvas`-Datei funktionieren.
- Dieselben Tree-Funktionen sollen möglichst auch im exportierten HTML verfügbar sein.

Langfristige Idee:

```text
normale Obsidian .canvas-Datei
          │
          ▼
Canvas HTML Exporter
          │
          ├── Tree-/Mindmap-Interaktion in Obsidian
          │
          └── HTML-Export
                  │
                  ▼
          dieselbe Tree-Interaktion
          im Browser
```

## Motivation

Obsidian Canvas eignet sich gut für hierarchische Diagramme und Mindmaps, besitzt aber kein vollständiges klassisches Mindmap-Verhalten. Besonders fehlt:

> Einen Knoten anklicken und seinen gesamten Unterzweig ein- bzw. ausklappen.

Das ist allgemein nützlich für Mindmaps, Projektstrukturen, technische Architekturen, Organisationsstrukturen und Wissensbäume.

Der besondere Mehrwert unseres Plugins wäre, dass diese Interaktivität auch im exportierten HTML erhalten bleibt.

## Untersuchte bestehende Plugins

### Canvas MindMap

Interessant wegen:

- hierarchischer Canvas-Strukturen
- Child-/Sibling-Knoten
- Auto-Layout
- Mindmap-orientierter Bedienung

Nutzen für uns vor allem als Referenz für Layout und Bedienkonzepte.

### Advanced Canvas

Interessant wegen:

- Auto Node Resizing
- Floating Edges
- verschiedenen Edge Styles
- dashed/dotted Edges
- Shapes und Styles
- Gruppen
- einklappbaren Gruppen

Wichtige Erkenntnis: Das Einklappen von Gruppen ist **nicht** dasselbe wie das gewünschte klassische Mindmap-Verhalten am Parent-Knoten.

Advanced Canvas soll keine notwendige Abhängigkeit werden. Kompatibilität bzw. spätere optionale Integration ist aber interessant.

Wichtiger Sicherheitsgrundsatz für unsere Implementierung:

```text
Datenmodell: vollständig
Darstellung: teilweise verborgen
```

Beim Collapse dürfen Nodes und Edges niemals destruktiv aus der `.canvas`-Datei entfernt werden.

### Mindvas / Canvas-Mindmap

Interessant wegen:

- normaler `.canvas`-Dateien
- Parent-/Child-Logik
- automatischer Baum-Anordnung
- Verschieben von Teilbäumen
- Links-/Rechts-Zweigen
- Auto-Resize
- Outline-orientierter Bedienung

Vor eigener Layoutentwicklung prüfen, welche Ideen oder Mechanismen dort sinnvoll wiederverwendbar bzw. nachbildbar sind.

### Better Mind Map

Besitzt echtes Collapse-/Expand-Verhalten, arbeitet aber nicht als Erweiterung normaler Canvas-Dateien, sondern als eigene Mindmap-Ansicht auf Markdown-Basis. Daher konzeptionell weniger passend.

## Kernfunktion: Collapse / Expand Subtree

Beispiel:

```text
             Server
               │
        ┌──────┴──────┐
        │             │
      Plesk        Nextcloud
        │
    ┌───┴───┐
    │       │
  Web     Backup
```

Collapse von `Server`:

```text
          Server  [+4]
```

Alle vier Nachfahren werden verborgen.

Expand stellt sie wieder her.

Mögliche Anzeige:

```text
[-] Server
```

bzw.

```text
[+] Server (4)
```

Die Zahl sollte möglichst die Anzahl aller verborgenen Nachfahren anzeigen.

Collapse bedeutet ausschließlich **Ausblenden in der Darstellung**. Die zugrunde liegende Canvas-Struktur bleibt vollständig erhalten.

## Kernfunktionen der ersten Ausbaustufe

1. Collapse/Expand eines Unterbaums
2. Expand all
3. Collapse all
4. Show through level N
5. Focus on selected branch

Diese Funktionen sollen sowohl in Obsidian als auch – soweit sinnvoll – im HTML-Export existieren.

## Spätere Funktionen

- ausgewählten Teilbaum gemeinsam verschieben
- automatische Tree-Anordnung
- klassische Mindmap-Anordnung
- Hauptzweige links/rechts verteilen
- Unterbaum neu layouten
- Keyboard Commands
- Kontextmenübefehle
- Branch-Farben
- automatische Node-Größe
- optionale Advanced-Canvas-Kompatibilität

## Tree-Erkennung

Zentrale technische Frage: Eine beliebige Canvas-Datei kann neben hierarchischen Parent→Child-Kanten auch Querverbindungen, Zyklen, mehrere Wurzeln, Gruppen und isolierte Nodes enthalten.

Deshalb darf nicht blind angenommen werden:

> Jede gerichtete Edge ist eine Parent→Child-Verbindung.

Einfacher Fall:

```text
A → B
A → C
B → D
```

ergibt:

```text
A
├── B
│   └── D
└── C
```

Problemfall:

```text
A → B
A → C
B → C
```

`B → C` könnte ein Cross-Link statt einer Tree-Kante sein.

### Zu untersuchende Strategie

Empfohlener Hybrid:

1. Baum automatisch erkennen, wenn die Struktur eindeutig ist.
2. Möglichkeit anbieten, einen Node als Tree Root festzulegen.
3. Bei Mehrdeutigkeiten Benutzerentscheidung ermöglichen.
4. Tree-Edges und Cross-Links intern getrennt behandeln.
5. Keine inkompatible proprietäre Änderung am JSON-Canvas-Format voraussetzen.

## Cross-Links / Relationships

Beispiel:

```text
A
├── B
│   └── D
└── C

D ─────→ C
```

`D → C` ist eine Querverbindung.

Beim Collapse eines Zweiges sind zwei Strategien denkbar:

1. Cross-Link ausblenden, wenn Ziel oder Quelle verborgen sind.
2. Später eventuell die Verbindung temporär auf den sichtbaren kollabierten Parent umleiten.

Für Version 1 ist Strategie 1 ausreichend und deutlich robuster.

## Speicherung des Collapse-Zustands

Der Collapse-Zustand sollte nicht zwingend proprietär in die `.canvas`-Datei geschrieben werden.

Zu prüfen:

- Plugin-Daten
- separate State-Daten
- Workspace State
- zunächst nur Session State

Ziel: Die `.canvas`-Datei bleibt normales JSON Canvas und funktioniert vollständig auch ohne unser Plugin.

## HTML-Export

Dies ist ein Kernpunkt des Projekts.

Die Tree-Struktur soll beim Export in die HTML-Datei übernommen werden, sodass der Empfänger **ohne Obsidian** Unterzweige ein- und ausklappen kann.

Mögliche DOM-Metadaten:

```html
data-node-id="server"
data-parent-id="network"
data-depth="2"
data-descendant-count="7"
```

Die Browser-JavaScript-Runtime kann daraus die Unterbaumlogik ableiten.

Das ursprüngliche JSON Canvas muss dafür nicht verändert werden.

### Geplante HTML-Funktionen

- Collapse/Expand per Klick
- Expand all
- Collapse all
- Show through level 1/2/3/…
- Focus branch
- Exit branch focus
- Zoom/Fit auf sichtbare Nodes
- bestehendes Zoom/Pan/Reset-Fit-Verhalten erhalten

### Initialzustand im HTML

Langfristig wäre eine Exportoption sinnvoll:

```text
Initial tree state:

○ Fully expanded
● Current Canvas state
○ Collapse below level N
```

## Layout beim Collapse

Zwei mögliche Modi:

### Stable Layout – Empfehlung für Version 1

- verborgene Nodes verschwinden
- sichtbare Nodes behalten ihre Position
- keine überraschenden Bewegungen
- einfach und robust

### Compact Layout – spätere Erweiterung

- nach Collapse werden sichtbare Nodes automatisch neu angeordnet
- Lücken verschwinden
- stärkeres klassisches Mindmap-Verhalten
- technisch deutlich komplexer

Version 1 sollte mit **Stable Layout** beginnen.

## Show Through Level N

Für große Maps sehr nützlich.

Beispiel Level 2:

```text
Root
├── Branch A [+]
├── Branch B [+]
└── Branch C [+]
```

Tiefe Unterstrukturen bleiben verborgen.

## Focus Branch

Kontextfunktion:

```text
Focus this branch
```

Dann werden nur der gewählte Node und sein relevanter Unterbaum angezeigt; optional können die Vorfahren sichtbar bleiben.

Rückkehr über:

```text
Exit branch focus
```

Diese Funktion ist sowohl in Obsidian als auch im HTML-Export wertvoll.

## Teilbaum bewegen

Spätere allgemeine Canvas-Funktion:

```text
Move subtree
```

Wenn ein Parent bewegt wird, werden optional seine sichtbaren Nachfahren gemeinsam verschoben.

## Beziehung zu mmap2obsidian

Der Python-Konverter `mmap2obsidian` (aktueller Stand v1.3.0) bleibt separat.

Seine Aufgabe:

```text
MindManager .mmap
        │
        ▼
normale Obsidian .canvas
        +
Markdown-Notizen
        +
Assets
```

Er sollte saubere gerichtete Parent→Child-Kanten erzeugen, aber **keine Abhängigkeit vom Canvas HTML Exporter** besitzen.

Damit funktionieren sowohl importierte als auch manuell erzeugte Canvas-Dateien:

```text
MindManager → mmap2obsidian ─┐
                             ├→ normales Canvas → Canvas HTML Exporter
manuell erzeugtes Canvas ────┘
```

## Warum kein dauerhaftes MindManager-Importer-Plugin?

MindManager ist proprietär, die Zielgruppe begrenzt und die Migration typischerweise einmalig. Nach erfolgreicher Migration besteht kaum noch Bedarf am Importer.

Allgemeine Tree-/Mindmap-Funktionen besitzen dagegen dauerhaften Nutzen und eine wesentlich größere Zielgruppe.

Daher:

```text
Migration:
mmap2obsidian

Tägliche Nutzung und Veröffentlichung:
Canvas HTML Exporter + Tree-/Mindmap-Funktionen
```

## Entwicklungsstrategie für Codex

Die bestehende stabile Exportfunktion muss geschützt werden.

### Schritt 1 – bestehenden Code analysieren

Vor Änderungen die aktuelle Architektur vollständig untersuchen:

- Canvas Parser
- internes Node-/Edge-Modell
- HTML-Generator
- Node Renderer
- Edge Renderer
- JavaScript Runtime
- CSS
- Zoom/Pan/Fit
- Gruppen
- Links
- bestehende Tests und Build-Konfiguration

Keine große Umstrukturierung vornehmen, bevor klar ist, wie die aktuelle Pipeline funktioniert.

### Schritt 2 – Tree-Modell ergänzen

Mögliche interne Typen:

```ts
interface TreeNodeInfo {
  id: string;
  parentId?: string;
  children: string[];
  depth: number;
}

interface CanvasTree {
  roots: string[];
  nodes: Map<string, TreeNodeInfo>;
  treeEdges: Set<string>;
  crossEdges: Set<string>;
}
```

### Schritt 3 – Tree-Logik separat halten

Vorgeschlagene Modulstruktur:

```text
src/tree/
├── model.ts
├── detector.ts
├── traversal.ts
├── state.ts
└── commands.ts
```

Tree-Logik soll nicht direkt an Obsidian-DOM oder HTML-DOM gekoppelt sein.

Architektur:

```text
Canvas Graph
    │
    ▼
Tree Model
    │
    ├── Obsidian Interaction Layer
    └── HTML Export Runtime
```

### Schritt 4 – Collapse Engine

Benötigte logische Operationen:

```ts
collapse(nodeId)
expand(nodeId)
collapseAll()
expandAll()
showThroughLevel(level)
focusBranch(nodeId)
exitBranchFocus()
```

Zusätzlich Traversal-Funktionen:

```ts
getChildren(nodeId)
getDescendants(nodeId)
getAncestors(nodeId)
getDepth(nodeId)
getVisibleNodes()
```

### Schritt 5 – Obsidian UI

Erst nach stabiler Logik:

- Commands
- Kontextmenü
- eventuell kleine +/- Controls an Nodes
- eventuell Toolbar
- Settings

### Schritt 6 – HTML Runtime

Tree-Daten in den bestehenden Export übernehmen und dort dieselben Operationen implementieren.

Wichtig: Obsidian- und HTML-Implementierung sollen dieselbe Semantik haben, auch wenn die technische UI unterschiedlich ist.

## Kompatibilitätsziele

Die Erweiterung soll:

- normales JSON Canvas unterstützen
- keine MindManager-Abhängigkeit besitzen
- keine Excalidraw-Abhängigkeit besitzen
- Advanced Canvas nicht voraussetzen
- Mindvas nicht voraussetzen
- bestehende HTML-Exporte nicht beschädigen
- bestehende Canvas-Dateien nicht destruktiv verändern

Optional können später Integrationen ergänzt werden.

## Tests

Mindestens folgende Testfälle vorsehen:

1. einfacher Baum
2. mehrere Root-Nodes
3. Baum mit Cross-Link
4. zyklischer Graph
5. isolierte Nodes
6. Gruppen
7. Datei-Nodes
8. Text-Nodes
9. Bild-Nodes
10. große Canvas-Datei
11. Collapse/Expand mehrfach hintereinander
12. Focus Branch + Reset
13. Show Through Level N
14. HTML-Export mit Tree-Funktionen
15. HTML-Export einer Canvas ohne Tree-Struktur
16. Regression: bisheriger Export unverändert nutzbar

## Nicht-Ziele für die erste Version

Noch nicht sofort implementieren:

- vollständiger Mindmap-Editor
- bidirektionale MindManager-Synchronisation
- proprietäres neues Canvas-Dateiformat
- komplexes Auto-Layout
- automatische Umleitung aller Cross-Links
- zwingende Abhängigkeit von Advanced Canvas
- zwingende Abhängigkeit von anderen Community Plugins

## Empfohlene erste Umsetzung

Minimaler sinnvoller Meilenstein:

1. bestehende Canvas-Struktur analysieren
2. eindeutigen Tree erkennen
3. Unterbaum im exportierten HTML collapse/expand-fähig machen
4. Expand All / Collapse All
5. Show Through Level N
6. Regressionstests
7. erst danach prüfen, wie dieselbe Interaktion sauber in der Obsidian-Canvas-Ansicht ergänzt werden kann

Dieser Ansatz reduziert das Risiko für den bestehenden Plugin-Code: Die neue Tree-Engine kann zunächst anhand des bereits kontrollierten HTML-Renderings entwickelt werden.

## Leitprinzipien

1. **Normales Canvas bleibt normales Canvas.**
2. **Keine Daten beim Collapse löschen.**
3. **Tree-Logik von Darstellung trennen.**
4. **Cross-Links explizit von Tree-Edges unterscheiden.**
5. **Bestehenden Export nicht destabilisieren.**
6. **Funktionen müssen auch ohne MindManager sinnvoll sein.**
7. **Interaktivität im HTML ist ein zentraler Mehrwert.**
8. **Erst robuste Basis, danach Auto-Layout und Komfortfunktionen.**

## Zielbild

Am Ende soll eine normale Obsidian-Canvas-Datei beispielsweise so verwendet werden können:

```text
[-] Netzwerk
    [-] Server
        Plesk
        Nextcloud
    [+] NAS (5)
    [+] Clients (7)
```

Der Benutzer kann dieselbe Struktur anschließend als HTML exportieren.

Der Empfänger öffnet nur `index.html` und kann dort ebenfalls:

- Zweige auf- und zuklappen
- Ebenen auswählen
- einen Zweig fokussieren
- zoomen und navigieren

Damit wird der Canvas HTML Exporter nicht zu einem MindManager-Plugin, sondern zu einem leistungsfähigeren allgemeinen Werkzeug für **interaktive Obsidian-Canvas-Dokumente**.
