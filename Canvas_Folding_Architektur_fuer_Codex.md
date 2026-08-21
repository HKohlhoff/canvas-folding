# Canvas Folding / Canvas HTML Exporter -- Architektur für gemeinsame Folding-Funktionalität

## Zweck dieses Dokuments

Dieses Dokument hält die Architekturentscheidung für die weitere
Entwicklung von **Canvas Folding** (bisheriger Arbeitstitel: *Canvas
Tree*) und die spätere Integration in den bereits veröffentlichten
**Canvas HTML Exporter** fest.

Es dient als Übergabe an Codex und als Grundlage für spätere
Implementierungsentscheidungen.

Langfristig soll die Architektur außerdem die Möglichkeit offenhalten,
mehrere eigene Canvas-Erweiterungen unter einem gemeinsamen Konzept wie
**Canvas Factory** zusammenzuführen.

------------------------------------------------------------------------

## 1. Ausgangslage

### Canvas Folding

Das neue Plugin kann inzwischen Äste in einem Obsidian Canvas über
Bedienelemente an den Knoten ein- und ausklappen und enthält bereits
weitere Funktionen rund um Baum-/Aststrukturen.

Wesentliche Designentscheidung:

-   Die originale `.canvas`-Datei wird durch das Folding **nicht
    verändert**.
-   Folding ist eine Darstellungsfunktion.
-   Die eigentliche Canvas-Struktur bleibt Obsidian-kompatibel.
-   Nodes und Edges der `.canvas`-Datei bleiben die Grundlage für die
    Graph-/Baumstruktur.

Als endgültiger Plugin-Name wird derzeit **Canvas Folding** favorisiert,
weil der Name die Anwenderfunktion besser beschreibt als *Canvas Tree*
und im Community-Plugin-Store voraussichtlich besser auffindbar ist.

### Canvas HTML Exporter

Der bereits veröffentlichte **Canvas HTML Exporter** exportiert
Obsidian-Canvas-Dateien in portable HTML-Darstellungen.

Später soll ein exportierter Canvas ebenfalls Folding unterstützen.

Wichtig ist dabei:

> Die Folding-Logik soll im HTML Exporter nicht ein zweites Mal
> unabhängig implementiert werden.

Sonst entstehen zwei Implementierungen derselben Graph-, Branch- und
Visibility-Logik, die langfristig auseinanderlaufen können.

------------------------------------------------------------------------

## 2. Zielbild

Die Zielarchitektur besteht aus drei logisch getrennten Bereichen:

1.  **gemeinsamer Canvas/Folding Core**
2.  **Canvas Folding Plugin**
3.  **Canvas HTML Exporter**

Schematisch:

``` text
                     Canvas Folding
                           │
                           │
                    ┌──────▼──────┐
                    │ Canvas Core │
                    │             │
                    │ Graph       │
                    │ Branches    │
                    │ Folding     │
                    │ Visibility  │
                    │ Types       │
                    └──────┬──────┘
                           │
                           │
                  Canvas HTML Exporter
```

Der gemeinsame Core enthält die fachliche Logik.

Die beiden Plugins bleiben zunächst eigenständige Community-Plugins und
können unabhängig voneinander installiert werden.

------------------------------------------------------------------------

## 3. Zentrale Architekturregel

### Keine doppelte Folding-Implementierung

Der HTML Exporter soll später **nicht** selbst erneut definieren:

-   was ein Child Node ist,
-   wie Descendants bestimmt werden,
-   wie ein Branch definiert ist,
-   wie Zyklen behandelt werden,
-   wie Querverbindungen behandelt werden,
-   welche Nodes beim Folding unsichtbar werden,
-   welche Edges dadurch unsichtbar werden.

Diese Regeln gehören in einen gemeinsamen Core.

Beide Plugins verwenden dieselbe Implementierung.

Damit existiert nur **eine Definition dafür, was Folding bedeutet**.

------------------------------------------------------------------------

## 4. Aufgaben des gemeinsamen Canvas Core

Der Core soll möglichst unabhängig von Obsidian-UI und Plugin-Lifecycle
sein.

Mögliche spätere Struktur:

``` text
packages/
    canvas-core/
        canvas-types.ts
        graph.ts
        tree.ts
        folding.ts
        visibility.ts
```

### Mögliche Verantwortlichkeiten

#### `canvas-types.ts`

Gemeinsame Typdefinitionen für:

-   Canvas Nodes
-   Canvas Edges
-   Graph
-   FoldState
-   VisibilityResult
-   ggf. Branch-/Tree-Strukturen

#### `graph.ts`

Aufbau eines gerichteten Graphen aus der `.canvas`-Struktur.

Beispielsweise:

``` text
fromNode → toNode
```

Aufgaben:

-   Child-Beziehungen
-   Parent-Beziehungen
-   Adjazenzlisten
-   Node-Lookup
-   Edge-Lookup

#### `tree.ts`

Analyse von Baum-/Aststrukturen:

-   direkte Kinder
-   Descendants
-   Ancestors
-   Roots
-   Subtrees
-   Zyklenerkennung
-   Behandlung von Querverbindungen

#### `folding.ts`

Fachliche Folding-Regeln:

``` text
FoldState + Graph → FoldingResult
```

#### `visibility.ts`

Bestimmung von:

-   sichtbaren Nodes
-   unsichtbaren Nodes
-   sichtbaren Edges
-   unsichtbaren Edges

------------------------------------------------------------------------

## 5. Wichtige Trennung: Algorithmus und Zustand

Zwei Dinge dürfen nicht miteinander verwechselt werden.

### A. Folding-Algorithmus

Der Algorithmus beantwortet beispielsweise:

> Wenn Node A eingeklappt wird, welche Nodes und Edges müssen
> ausgeblendet werden?

Dieser Algorithmus gehört in den gemeinsamen Core.

### B. Fold-State

Der State beantwortet:

> Welche Nodes sind momentan eingeklappt?

Beispiel:

``` json
{
  "collapsedNodeIds": [
    "node-a17",
    "node-b38"
  ]
}
```

Der Fold-State gehört zum Canvas-Folding-Plugin bzw. zu einer konkreten
Exportentscheidung.

------------------------------------------------------------------------

## 6. Persistenz des Fold-State

Da die `.canvas`-Datei bewusst nicht verändert wird, muss ein
persistenter Folding-Zustand außerhalb der Canvas-Datei gespeichert
werden.

Canvas Folding kann dafür seine eigenen Plugin-Daten verwenden.

Konzeptionelles Beispiel:

``` json
{
  "Canvases/Projekt.canvas": {
    "collapsedNodeIds": [
      "node-a17",
      "node-b38"
    ]
  }
}
```

Die konkrete vorhandene Implementierung von Canvas Folding ist vor einer
Änderung zu prüfen.

### Wichtig

Der HTML Exporter soll **nicht direkt** die interne `data.json` oder
andere interne Speicherstrukturen von Canvas Folding lesen.

Die interne Speicherung bleibt Implementierungsdetail des
Folding-Plugins.

------------------------------------------------------------------------

## 7. Öffentliche API von Canvas Folding

Canvas Folding soll langfristig eine kleine, bewusst definierte und
versionierte API anbieten.

Beispiel:

``` ts
export interface CanvasFoldingApi {
    apiVersion: 1;

    getFoldState(canvasPath: string): FoldState | null;
}
```

Mit:

``` ts
export interface FoldState {
    collapsedNodeIds: string[];
}
```

Später können weitere Methoden hinzukommen.

Die API sollte möglichst klein bleiben.

### Warum Versionierung?

Der HTML Exporter kann prüfen:

``` ts
if (foldingApi?.apiVersion === 1) {
    // unterstützte Schnittstelle
}
```

Spätere Erweiterungen von Canvas Folding müssen dadurch ältere
Exporter-Versionen nicht automatisch beschädigen.

------------------------------------------------------------------------

## 8. Soft Dependency statt harter Plugin-Abhängigkeit

Der Canvas HTML Exporter darf vollständig funktionieren, wenn Canvas
Folding:

-   nicht installiert ist,
-   deaktiviert ist,
-   nicht kompatibel ist.

Canvas Folding ist daher **keine zwingende Runtime-Abhängigkeit**.

Der Exporter verwendet dessen API nur optional.

Konzeptionell:

``` text
HTML Export
     │
     ├── Canvas-Datei
     │       │
     │       └── gemeinsamer Canvas Core
     │
     └── optional
             │
             └── Canvas Folding API
                     │
                     └── aktueller Fold-State
```

Wenn keine API verfügbar ist, muss der Export weiterhin funktionieren.

------------------------------------------------------------------------

## 9. Keine Kopplung an Plugin-Interna

Zu vermeiden sind Zugriffe wie:

``` ts
foldingPlugin.someInternalVariable
```

oder Abhängigkeiten von privaten Klassen und internen Datenstrukturen.

Ebenfalls zu vermeiden:

``` ts
document.querySelectorAll(".canvas-folding-collapsed")
```

Das DOM des anderen Plugins ist keine stabile Schnittstelle.

Auch das direkte Lesen der Folding-`data.json` durch den Exporter ist
nicht vorgesehen.

Die einzige Plugin-zu-Plugin-Kommunikation soll über eine bewusst
veröffentlichte API erfolgen.

------------------------------------------------------------------------

## 10. Workspace/View-State nicht als zentrale Schnittstelle verwenden

Eine diskutierte Alternative war, Folding-Informationen im Obsidian
Workspace-/Canvas-View-State abzulegen und vom Exporter dort wieder
auszulesen.

Das wird **nicht als zentrale Architektur gewählt**.

Gründe:

-   View-State gehört primär zur konkreten Ansicht.
-   Folding ist eine eigene fachliche Funktion.
-   Wir kontrollieren beide Plugins selbst.
-   Eine eigene kleine API ist stabiler und expliziter.
-   Der gemeinsame Folding-Core verhindert zusätzlich doppelte
    Implementierung.
-   Die Architektur soll möglichst wenig von nicht speziell für Folding
    gedachten Obsidian-Interna abhängen.

View-State kann intern verwendet werden, wenn dies für die UI sinnvoll
ist, soll aber nicht der Integrationsvertrag zwischen den Plugins sein.

------------------------------------------------------------------------

## 11. Verhalten des HTML Exporters

Der HTML Exporter soll Folding später grundsätzlich unterstützen können.

Dabei sind zwei getrennte Entscheidungen nötig:

### Folding-Funktionalität im HTML

Das exportierte HTML kann JavaScript-/UI-Funktionalität zum Ein- und
Ausklappen enthalten.

### Initialer Folding-Zustand

Der Benutzer entscheidet, in welchem Zustand das HTML startet.

Vorgeschlagene Einstellungen:

``` text
Folding in exported HTML

[x] Enable folding

Initial folding state:
    ( ) All branches expanded
    ( ) Current Canvas Folding state
```

Falls Canvas Folding nicht installiert/aktiv oder seine API nicht
verfügbar ist:

``` text
Current Canvas Folding state
→ nicht verfügbar
```

Der Export darf dadurch nicht fehlschlagen.

------------------------------------------------------------------------

## 12. Keine versteckte Verhaltensänderung

Der Exporter soll nicht allein deshalb plötzlich anders exportieren,
weil Canvas Folding installiert wurde.

Die Übernahme des aktuellen Fold-State soll eine **bewusste
Benutzerentscheidung** sein.

Damit bleibt das Verhalten:

-   nachvollziehbar,
-   reproduzierbar,
-   transparent.

------------------------------------------------------------------------

## 13. Shared Package statt drittem Community-Plugin

Der gemeinsame Canvas Core muss nicht als zusätzliches Obsidian-Plugin
veröffentlicht werden.

Vorzugsmodell:

``` text
packages/
    canvas-core/

plugins/
    canvas-folding/
    canvas-html-exporter/
```

Beim Build wird der benötigte Core jeweils in das Plugin-Bundle
integriert.

Für den Benutzer existieren weiterhin nur:

``` text
Canvas Folding
Canvas HTML Exporter
```

Es entsteht keine zusätzliche Installation und keine
Runtime-Abhängigkeit von einem dritten Core-Plugin.

------------------------------------------------------------------------

## 14. Entwicklungsstrategie: jetzt noch keinen großen Umbau erzwingen

Der aktuelle Canvas-Folding-Code soll **nicht sofort nur aufgrund dieser
Zukunftsarchitektur umfassend umgebaut werden**.

Priorität bleibt zunächst:

> Canvas Folding funktional sauber fertigstellen.

Danach wird untersucht, welche Teile der vorhandenen Implementierung
tatsächlich allgemeine Core-Logik darstellen.

Voraussichtlich gehören insbesondere folgende Bereiche in den späteren
Core:

-   Graphaufbau
-   Parent-/Child-Beziehungen
-   Descendant-Berechnung
-   Zyklusbehandlung
-   Branch-Ermittlung
-   Visibility-Berechnung
-   Folding-Regeln
-   gemeinsame Typen

Nicht in den Core gehören typischerweise:

-   Obsidian Plugin Lifecycle
-   Settings UI
-   Commands
-   Context Menus
-   Node-Folding-Symbole
-   DOM-Manipulation
-   Event-Registrierung
-   Notifications
-   Plugin-spezifische Persistenz

------------------------------------------------------------------------

## 15. Empfohlener Refactoring-Zeitpunkt

Nicht mitten in der laufenden Feature-Entwicklung abstrahieren.

Empfohlene Reihenfolge:

``` text
1. Canvas Folding funktional fertigstellen
        ↓
2. Tests stabilisieren
        ↓
3. vorhandene Klassen/Funktionen analysieren
        ↓
4. fachliche Core-Logik identifizieren
        ↓
5. Canvas Core extrahieren
        ↓
6. Canvas Folding auf Core umstellen
        ↓
7. Verhalten/Tests vergleichen
        ↓
8. Canvas HTML Exporter um Folding erweitern
```

------------------------------------------------------------------------

## 16. Tests des gemeinsamen Core

Der gemeinsame Core sollte weitgehend ohne laufendes Obsidian testbar
sein.

Besonders wichtig sind Tests für:

### Einfacher Baum

``` text
A
├── B
│   ├── D
│   └── E
└── C
```

Fold B:

``` text
sichtbar:   A B C
unsichtbar: D E
```

### Mehrstufiges Folding

Wenn B und D eigene Folding-Zustände besitzen, muss Expand/Collapse
konsistent bleiben.

### Zyklen

Beispiel:

``` text
A → B → C → A
```

Die Traversierung darf niemals endlos laufen.

### Querverbindungen

Beispiel:

``` text
A → B
A → C
B → D
C → D
```

Es muss eindeutig definiert und getestet sein, wann D sichtbar bleibt
bzw. ausgeblendet wird.

### Edges

Edges zu unsichtbaren Nodes müssen entsprechend behandelt werden.

Diese Tests sind besonders wichtig, weil exakt dieselbe Semantik später
im HTML Exporter gelten soll.

------------------------------------------------------------------------

# 17. Langfristige Perspektive: Canvas Factory

Die Architektur soll bewusst eine spätere Zusammenführung mehrerer
eigener Canvas-Werkzeuge ermöglichen.

Arbeitstitel:

# Canvas Factory

Mögliche langfristige Struktur:

``` text
Canvas Factory
│
├── Core
│   ├── Canvas Graph
│   ├── Tree Analysis
│   ├── Geometry
│   ├── Styles
│   ├── Common Types
│   └── Utilities
│
├── Folding
│
├── HTML Export
│
├── Styling
│
├── Layout
│
└── weitere Canvas Tools
```

Dies ist **keine aktuelle Implementierungsanforderung**.

Die heutige Architektur soll lediglich verhindern, dass wir uns diesen
Weg verbauen.

------------------------------------------------------------------------

## 18. Mögliche zukünftige Modelle

Die Entscheidung über die endgültige Produktstruktur kann später
getroffen werden.

### Modell A -- Einzelplugins bleiben bestehen

``` text
Canvas Folding
Canvas HTML Exporter
weitere Plugins
```

Alle verwenden gemeinsame interne Packages.

### Modell B -- Einzelplugins + Canvas Factory Suite

Die Einzelplugins bleiben verfügbar.

Zusätzlich entsteht eine größere Suite:

``` text
Canvas Factory
```

für Anwender, die alle Funktionen möchten.

### Modell C -- spätere Zusammenführung

Canvas Factory ersetzt langfristig einzelne Plugins.

Diese Entscheidung ist **heute ausdrücklich nicht erforderlich**.

------------------------------------------------------------------------

# 19. Leitprinzipien für Codex

Bei allen weiteren Arbeiten an Canvas Folding sollen folgende Prinzipien
berücksichtigt werden:

1.  `.canvas`-Dateien möglichst nicht verändern, nur um Folding-Zustände
    zu speichern.
2.  Folding-UI und Folding-Algorithmus gedanklich trennen.
3.  Graph-/Tree-/Visibility-Logik möglichst modular halten.
4.  Keine unnötige Abhängigkeit von DOM-Strukturen erzeugen.
5.  Plugin-interne Persistenz nicht als öffentliche Schnittstelle
    behandeln.
6.  Eine spätere kleine versionierte API ermöglichen.
7.  Den späteren Canvas HTML Exporter nicht zu einer zweiten
    Folding-Implementierung zwingen.
8.  Fachliche Logik so schreiben, dass sie später in einen gemeinsamen
    Core extrahierbar ist.
9.  Noch keinen verfrühten General-Purpose-Framework-Umbau durchführen.
10. Aktuelle Funktionalität und Stabilität von Canvas Folding haben
    zunächst Vorrang.

------------------------------------------------------------------------

# 20. Konkrete Aufgabe für die aktuelle Canvas-Folding-Entwicklung

Dieses Dokument bedeutet **nicht**, dass Codex jetzt automatisch einen
großen Refactor durchführen soll.

Zunächst soll Codex die Architektur zur Kenntnis nehmen.

Bei neuen Funktionen soll jedoch darauf geachtet werden, dass fachliche
Folding-/Graph-Logik nicht unnötig eng mit UI-, DOM- oder
Obsidian-spezifischem Code verbunden wird.

Wenn Canvas Folding funktional einen stabilen Stand erreicht hat, soll
gemeinsam geprüft werden:

> Welche bestehenden Funktionen und Klassen bilden bereits den
> zukünftigen `canvas-core`?

Erst danach soll ein gezieltes Refactoring geplant werden.

------------------------------------------------------------------------

# 21. Zusammenfassung der Architekturentscheidung

Die bevorzugte Lösung lautet:

``` text
                    gemeinsamer Canvas Core
                   /                      \
                  /                        \
         Canvas Folding              HTML Exporter
               │                          │
               │                          │
               └── optionale API ────────┘
                    für Fold-State
```

Dabei gilt:

-   **Core** = gemeinsame Folding-/Graph-Semantik.
-   **Canvas Folding** = Obsidian-UI + State + Bedienung.
-   **HTML Exporter** = HTML-Erzeugung + HTML-Folding-UI.
-   **Canvas Folding API** = optionale Übernahme des aktuellen
    Fold-State.
-   **Keine harte Plugin-Abhängigkeit.**
-   **Keine doppelte Folding-Logik.**
-   **Keine Veränderung der `.canvas`-Datei allein für Folding.**
-   **Spätere Canvas Factory bleibt möglich.**

Dies ist die derzeit bevorzugte langfristige Architektur.
