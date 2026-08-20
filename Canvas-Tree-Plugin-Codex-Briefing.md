# Obsidian Canvas Tree Plugin – Projektbriefing für Codex

**Stand:** 20.08.2026  
**Projekt:** neues, eigenständiges Obsidian-Plugin für rekursiv ein-/ausklappbare Canvas-Zweige  
**Arbeitstitel:** Canvas Tree (Name noch nicht endgültig)

## 1. Ausgangslage und Ziel

Es soll ein **kleines eigenständiges Obsidian-Plugin** entstehen, das normale Obsidian-Canvases um eine Tree-/Hierarchy-Funktion erweitert. Hauptfunktion ist das **rekursive Ein- und Ausklappen kompletter Teilbäume**.

Das Plugin ist ausdrücklich **kein MindManager-Importer** und **kein HTML-Exporter**. Es soll für beliebige Canvas-Anwendungen nützlich sein: Mindmaps, Projektstrukturen, Gliederungen, Entscheidungsbäume, Wissensstrukturen usw.

Grundidee:

```text
Projekt
├── Technik
│   ├── Server
│   ├── Netzwerk
│   └── Backup
└── Dokumentation
```

Collapse von „Technik“:

```text
Projekt
├── Technik [+]
└── Dokumentation
```

Die Karte „Technik“ selbst bleibt sichtbar. Nur ihre Nachfahren und die zugehörigen Kanten werden verborgen.

## 2. Klare Abgrenzung zum bestehenden Canvas HTML Exporter

Es existiert bereits ein veröffentlichtes Plugin **Canvas HTML Exporter**.

Die Verantwortlichkeiten sollen strikt getrennt bleiben:

### Canvas Tree Plugin
- verändert/erweitert die interaktive Darstellung **in Obsidian**;
- analysiert Parent-/Child-Beziehungen;
- bietet Collapse/Expand;
- verwaltet ggf. den Collapse-State;
- darf später weitere Hierarchie-Funktionen erhalten.

### Canvas HTML Exporter
- bleibt ein **reiner Exporter**;
- verändert weder Canvas-Datei noch Darstellung in Obsidian;
- liest den vorhandenen Canvas-Zustand bzw. vorhandene Metadaten;
- setzt diese möglichst originalgetreu in HTML um;
- kann später Tree-Strukturen im HTML ebenfalls interaktiv klappbar darstellen.

Keine Tree-Manipulationslogik soll in den Exporter verschoben werden.

## 3. Bereits geprüfte Canvas-Struktur

Ein Test-Canvas wurde mit aktiviertem **Advanced Canvas** erstellt und untersucht.

Wichtiger Befund: Die Parent-/Child-Beziehungen lassen sich bereits aus den normalen Canvas-Kanten ableiten. Entscheidend sind:

```json
{
  "fromNode": "parent-id",
  "toNode": "child-id"
}
```

Definition für Version 1:

```text
fromNode → toNode
Parent   → Child
```

Damit ist **kein separates proprietäres Tree-Datenmodell erforderlich**.

Im untersuchten Testcanvas konnte die Hierarchie eindeutig rekonstruiert werden. Ein Root-Knoten kann beispielsweise als Node ohne eingehende Tree-Kante erkannt werden.

Advanced Canvas fügt zwar zusätzliche Daten wie `dynamicHeight` und `styleAttributes` hinzu; diese sind für die reine Erkennung der Baumstruktur nicht erforderlich.

## 4. Zentrales Architekturprinzip

**Die Baumstruktur nicht doppelt speichern.**

Die Struktur wird bei Bedarf aus `nodes` + `edges.fromNode/toNode` berechnet.

Wenn persistenter Collapse-State benötigt wird, möglichst nur den Zustand des Parent-Knotens speichern, sinngemäß:

```json
"collapsed": true
```

Nicht speichern:

```json
"hiddenChildren": ["id1", "id2", "id3"]
```

Die Nachfahren sollen stets neu aus dem Graphen berechnet werden.

## 5. Verhalten von Collapse/Expand

Bei Collapse eines Knotens P:

1. rekursiv alle über gerichtete Tree-Kanten erreichbaren Descendants bestimmen;
2. diese Nodes **visuell ausblenden**;
3. alle Kanten ausblenden, deren Darstellung einen verborgenen Node betrifft;
4. Parent P sichtbar lassen;
5. Positionen, Größen und Inhalte der Nodes nicht verändern.

Bei Expand:

- Nodes und Kanten an ihren unveränderten ursprünglichen Positionen wieder sichtbar machen.

Wichtig: Collapse soll primär eine **View-Funktion** sein. Nodes dürfen nicht gelöscht oder für das Einklappen umpositioniert werden.

## 6. UI-Idee

Nodes mit mindestens einem Child erhalten einen kleinen `+ / −`-Schalter.

Bevorzugt soll dieser optisch eher zur Verzweigung gehören als wie ein Bestandteil des Karteninhalts wirken.

Beispiel:

```text
┌───────────────┐
│ Technik       │
└───────┬───────┘
        −
        │
```

Collapsed:

```text
┌───────────────┐
│ Technik       │
└───────┬───────┘
        +
```

Die konkrete Positionierung muss beim Prototyp getestet werden.

Zusätzlich sinnvoll:
- Kontextmenü „Collapse branch“;
- „Expand branch“;
- „Expand all“;
- ggf. „Collapse all“;
- Commands für Command Palette/Hotkeys.

## 7. Advanced Canvas – Integration, aber möglichst keine harte Abhängigkeit

Advanced Canvas ist installiert und wurde bei der Untersuchung berücksichtigt.

Es stellt hilfreiche Canvas-Ereignisse/Integrationspunkte bereit, u. a. sinngemäß:
- node rendered;
- node added/removed/changed;
- edge added/removed/changed;
- selection changed;
- data loaded;
- canvas saved;
- Canvas Node-/Selection-/Edge-Menüs.

Diese Mechanismen können eine saubere Integration der `+ / −`-UI und Aktualisierung erleichtern.

**Architekturwunsch:**

Das neue Plugin sollte nach Möglichkeit auch mit dem normalen Obsidian Canvas funktionieren. Advanced Canvas soll eine **optionale Integration**, keine zwingende Abhängigkeit sein, sofern dies technisch vernünftig realisierbar ist.

Codex soll deshalb zunächst untersuchen:
1. welche benötigten Canvas-APIs/Events bereits im normalen Obsidian verfügbar sind;
2. welche nur Advanced Canvas komfortabel bereitstellt;
3. ob ein stabiler Compatibility-Layer möglich ist;
4. welche DOM/API-Eingriffe möglichst wenig fragil sind.

Keine unnötigen DOM-Hacks, wenn offizielle bzw. etablierte Canvas-Hooks verfügbar sind.

## 8. Graph statt echter Baum – wichtige Sonderfälle

Obsidian Canvas ist allgemein ein **Graph**, kein Baum.

Daher muss der Traversierungsalgorithmus robust sein gegen:
- mehrere Parents;
- Querverbindungen;
- Zyklen.

Mindestens ein `visited`-Set verwenden, sodass Zyklen niemals Endlosschleifen erzeugen.

### Version-1-Regel

Zunächst gilt jede gerichtete Verbindung

```text
fromNode → toNode
```

als Parent-/Child-Beziehung.

Das ist für normale Mindmap-/Tree-Canvases einfach und vorhersehbar.

### Mehrere Parents / Querverbindungen

Wenn ein Node durch Collapse eines Zweigs verborgen wird, sollen in Version 1 **alle Kanten zu/von diesem verborgenen Node ebenfalls verborgen werden**.

Keine automatische Umleitung einer Referenzkante auf den eingeklappten Parent in V1.

Später denkbar:
- Tree Edge vs. Reference Edge;
- explizite Kennzeichnung von Querverbindungen;
- intelligentere Behandlung mehrfach referenzierter Nodes.

## 9. Collapse-State

Zwei Betriebsarten sind denkbar:

### Session-only
- Collapse-Zustand nur während der aktuellen Sitzung;
- keinerlei zusätzliche Speicherung im `.canvas` nötig.

### Persistent
- Zustand bleibt beim erneuten Öffnen erhalten;
- nur minimale Metadaten speichern;
- keine Nachfahrenlisten persistieren.

Für den ersten technischen Prototyp kann Session-only sinnvoll sein, um die View-Logik vollständig von Persistenzfragen zu trennen.

Anschließend Persistenz sauber ergänzen.

## 10. Kompatibilität mit `.canvas`

Wichtige Anforderungen:
- bestehende normale Canvases sollen möglichst sofort funktionieren;
- das Plugin soll keine proprietäre Kopie der Canvas-Struktur erzeugen;
- Abschalten/Entfernen des Plugins darf die eigentlichen Nodes und Edges nicht zerstören;
- keine Positionsänderungen nur wegen Collapse;
- Zusatzmetadaten, falls nötig, minimal und kompatibel halten.

Vor Implementierung persistenter Custom-Felder prüfen, wie Obsidian und Advanced Canvas unbekannte Properties behandeln und welcher Speicherort dafür am stabilsten ist.

## 11. Verhältnis zu Advanced-Canvas-Styles

Advanced Canvas bietet Custom Styles/Node Templates und speichert entsprechende `styleAttributes`.

Das ist **nicht Teil der V1-Tree-Kernfunktion**, soll aber nicht beschädigt werden. Das Plugin muss vorhandene Advanced-Canvas-Daten unangetastet lassen.

Für ein anderes Projekt ist bereits vorgesehen, dass der Canvas HTML Exporter Advanced-Canvas-Styleinformationen möglichst korrekt übernimmt.

## 12. Bestehendes „Collapse Node“-Plugin

Es existiert ein anderes Obsidian-Plugin, das einzelne Canvas-Karten bzw. deren Inhalt zusammenklappen kann.

Unser Konzept ist ausdrücklich anders:

```text
Collapse Node:  einzelne Karte / Karteninhalt zusammenklappen
Canvas Tree:    gesamten rekursiven Teilbaum ausblenden
```

Dieses bestehende Plugin kann als technische Referenz für Canvas-Menüs/DOM-/State-Handling untersucht werden, soll aber nicht die fachliche Definition unseres Plugins bestimmen.

## 13. Empfohlener Scope für Version 1.0

Minimaler sinnvoller Funktionsumfang:

1. aktives Canvas erkennen;
2. Nodes und gerichtete Edges einlesen;
3. Adjazenzstruktur `parent -> children` aufbauen;
4. Nodes mit Children erkennen;
5. `+ / −`-Steuerelement anzeigen;
6. Descendants zyklensicher bestimmen;
7. Descendant-Nodes visuell hide/show;
8. betroffene Edges hide/show;
9. keine Node-Positionen ändern;
10. Kontextmenü/Commands für Collapse/Expand;
11. Expand All;
12. sauberes Aktualisieren nach Node-/Edge-Änderungen;
13. bestehende Canvas-/Advanced-Canvas-Styles unangetastet lassen;
14. Fehler-/Fallback-Verhalten für Graphen, die keine reinen Bäume sind.

Persistenz kann entweder Teil von 1.0 oder unmittelbar folgende Stufe sein; für den ersten Prototyp Session-State bevorzugen.

## 14. Mögliche spätere Erweiterungen – ausdrücklich nicht alles sofort bauen

- persistenter Collapse-State;
- Collapse All;
- Focus Branch / nur einen Teilbaum anzeigen;
- Tree Edge vs. Reference Edge;
- Navigation Parent/Child/Sibling;
- automatische Tree-/Mindmap-Anordnung;
- ggf. links-/rechtsseitige Mindmap-Zweige;
- Copy Style / Paste Style bzw. Formatpinsel;
- Advanced-Canvas-Style-Komfortfunktionen;
- HTML-Exporter-Unterstützung für interaktives Collapse;
- Importer können später Tree-Strukturen erzeugen, sind aber **separate Projekte**.

Scope-Creep vermeiden: zuerst Collapse/Expand stabil machen.

## 15. Gewünschte interne Struktur

Die genaue Struktur soll Codex passend zum Obsidian-Plugin-Template festlegen. Fachlich sinnvoll wäre eine Trennung etwa in:

```text
src/
  main.ts
  tree/
    graph.ts          # Parent/Child, descendants, cycle safety
    state.ts          # collapsed state
  canvas/
    adapter.ts        # Abstraktion Standard Canvas / Advanced Canvas
    visibility.ts     # hide/show nodes + edges
    events.ts         # lifecycle/update hooks
  ui/
    collapse-control.ts
    menus.ts
  settings.ts         # nur falls wirklich benötigt
```

Wichtig ist weniger die konkrete Dateibenennung als eine klare Trennung zwischen:
- Graphlogik;
- Canvas-Integration;
- UI;
- State/Persistenz.

Die reine Graphlogik soll möglichst ohne DOM/Obsidian-Abhängigkeit testbar sein.

## 16. Tests, die früh vorgesehen werden sollten

Mindestens folgende Graphfälle testen:

### einfacher Baum
```text
A -> B
A -> C
B -> D
```

### mehrere Ebenen
```text
A -> B -> C -> D
```

### mehrere Parents
```text
A -> C
B -> C
```

### Zyklus
```text
A -> B -> C -> A
```

### Querverbindung
```text
A -> B
A -> C
B -> D
C -> D
```

### isolierter Node
Node ohne Edges: kein Collapse-Control.

### Änderungen zur Laufzeit
- Child hinzufügen;
- Edge löschen;
- Edge-Richtung ändern;
- Parent löschen;
- Canvas wechseln;
- Plugin deaktivieren/aktivieren.

## 17. Offene technische Fragen für den Start mit Codex

Vor größerer Implementierung bitte zuerst den aktuellen Stand der Obsidian-Canvas-API und Advanced-Canvas-Integration anhand des realen Entwicklungsumfelds/aktuellen Codes prüfen.

Insbesondere:

1. Wie greifen wir stabil auf die aktive Canvas-View, Nodes und Edges zu?
2. Welche Canvas-Events sind offiziell/inoffiziell verfügbar?
3. Wie kann ein Control pro Node stabil gerendert und nach Re-render erneut angebracht werden?
4. Wie werden Nodes und Edges am besten nur visuell verborgen, ohne Datenänderung?
5. Welche Konsequenzen hat `display:none`, `visibility`, Canvas-internes State-Handling etc. für Selektion, Zoom/Fit, Dragging und Hit-Testing?
6. Wie verhindern wir, dass Obsidian beim Re-render verborgene Elemente wieder sichtbar macht?
7. Wie funktioniert Cleanup beim Unload des Plugins?
8. Wie integrieren wir Advanced Canvas optional, ohne es als zwingende Dependency zu benötigen?
9. Wo wäre ein persistenter Collapse-State später am kompatibelsten zu speichern?
10. Wie verhalten sich Gruppen (`type: group`) und Group-Edges? Für V1 ggf. explizit definieren oder zunächst ausschließen.

## 18. Vorgehensweise für Codex

Bitte **nicht sofort den gesamten Feature-Katalog implementieren**.

Empfohlene Reihenfolge:

### Phase A – Analyse/Spike
- Plugin-Grundgerüst prüfen/erstellen;
- Canvas-API im aktuellen Obsidian untersuchen;
- Advanced Canvas nur als optionale Integrationsquelle untersuchen;
- aktives Canvas erkennen;
- Nodes/Edges auslesen und Graph im Debug-Log korrekt darstellen.

### Phase B – Minimaler Prototyp
- für einen ausgewählten Parent Descendants berechnen;
- diese visuell hide/show;
- Edges korrekt mitbehandeln;
- noch kein persistenter State nötig.

### Phase C – UI
- `+ / −` an Parents;
- automatische Aktualisierung;
- Commands/Kontextmenü;
- Expand All.

### Phase D – Robustheit
- Zyklen;
- mehrere Parents;
- Canvas-Wechsel;
- Re-render;
- Plugin-Unload;
- Kompatibilität mit Advanced Canvas.

### Phase E – Persistenz
Erst wenn die View-Logik stabil ist, Collapse-State persistent machen.

## 19. Leitprinzipien

1. **Klein anfangen.**
2. **Standard-Canvas-Daten als Source of Truth.**
3. **Edges bestimmen die Hierarchie.**
4. **Keine doppelte Speicherung der Tree-Struktur.**
5. **Collapse verändert die View, nicht das Layout.**
6. **Positionen und Inhalte bleiben unangetastet.**
7. **Advanced Canvas unterstützen, aber möglichst nicht voraussetzen.**
8. **Graph-Sonderfälle defensiv behandeln.**
9. **Exporter und Tree-Plugin bleiben getrennte Projekte.**
10. **Die Graphlogik testbar und von Canvas-DOM-Code getrennt halten.**

## 20. Definition des ersten Erfolgs

Der erste wirklich relevante Meilenstein ist erreicht, wenn auf einem vorhandenen Canvas wie

```text
A
├── B
│   ├── D
│   └── E
└── C
```

bei einem Klick an B zuverlässig

```text
A
├── B [+]
└── C
```

erscheint und ein weiterer Klick D und E **an exakt ihren ursprünglichen Positionen** wieder einblendet – ohne Node-/Edge-Verlust, ohne Layoutänderung und ohne Beschädigung der `.canvas`-Datei.

---

**Hinweis für Codex:** Dieses Dokument beschreibt den fachlichen und architektonischen Stand der Vorbesprechung. Technische Annahmen über interne Obsidian-/Advanced-Canvas-APIs bitte im aktuellen Entwicklungsstand verifizieren, bevor darauf langfristig aufgebaut wird.
