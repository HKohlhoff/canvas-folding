---
FileClass: All
created:
modified:
Typ: Information
Status: Fertig
cssclasses:
tags:
  - codex
  - KI
  - plugin
---
# Lessons Learned

Diese Notizen fassen rückblickend zusammen, was sich bei der Entwicklung von **Canvas to HTML** bewährt hat. Sie sollen später helfen, Entscheidungen wiederzufinden, typische Fehler zu vermeiden und neue Erweiterungen mit weniger Reibung umzusetzen.

## Für die Weiterentwicklung von Canvas to HTML

### Exportformate früh getrennt denken

Das Plugin hat zwei sehr unterschiedliche Betriebsarten: Paket-Export mit `index.html` und Asset-Ordnern sowie Single-HTML-Export mit eingebetteten Assets und virtuellen Unterseiten. Viele Fehler entstehen, wenn eine neue Funktion nur für einen dieser Wege gedacht wird.

Bei neuen Features deshalb immer prüfen:

- Funktioniert der Link oder das Asset im Paket-Export?
- Funktioniert dieselbe Logik im Single-HTML-Export ohne echte Dateipfade?
- Sind Anker, Zurück-Navigation und eingebettete Seiten in beiden Modi konsistent?
- Wird die Dateigröße im Single-HTML-Modus noch vertretbar?

### Canvas, Markdown und Assets sind drei eigene Domänen

Die stabilere Struktur entstand erst, als der Code in klarere Module aufgeteilt wurde:

- Canvas-Daten normalisieren und Knoten/Kanten vorbereiten
- Markdown rendern und Obsidian-Syntax annähern
- Dateien, Assets, Pfade und Exportziele verwalten
- HTML-Oberfläche mit Zoom, Suche, Minimap und Seitenansicht bauen

Diese Trennung sollte erhalten bleiben. Neue Logik sollte möglichst dort landen, wo ihr Datenmodell hingehört, nicht einfach im großen Exportfluss.

### Obsidian-Markdown ist nicht nur CommonMark

Die meisten interessanten Randfälle kamen aus Obsidian-spezifischem Markdown:

- Wiki-Links und normale Markdown-Links
- Heading-Links, Block-Referenzen und Section-Embeds
- Callouts mit Typen, Farben und Icons
- interne Embeds für Markdown, Bilder, PDFs und Medien
- Listenfortsetzungen, Code-Fences, Tabellen und escaped punctuation

Wichtiges Learning: Link- und Embed-Verarbeitung sollte nicht als reine Textersetzung behandelt werden. Sie braucht Kontext: Zieltyp, Exportmodus, Basisposition, Anker, Anzeige-Text und Fallback, falls das Ziel fehlt.

### Tests für Randfälle sind wertvoller als breite Snapshots

Die fokussierten Tests in `canvas2html/tests/` haben sich besonders bewährt, weil sie einzelne Regeln absichern:

- Markdown-Rendering
- Math/Katex
- Link-Rewriting
- Pfad-Normalisierung
- Export-Dateinamen und Asset-Ziele
- Canvas-HTML-Struktur
- Paket-Export als Integrationstest

Bei neuen Fehlern lieber einen kleinen reproduzierbaren Test ergänzen als nur manuell im Demo-Vault prüfen. Das Demo-Vault bleibt wichtig, aber die Regression sollte im Test bleiben.

### Theme-Werte müssen aus Obsidian gelesen, aber defensiv behandelt werden

Farben für Canvas, Headings, Callouts und Inline-Styles können aus dem aktiven Obsidian-Theme gelesen werden. Das ist gut für realistische Exporte, aber fragil, weil Themes unterschiedlich viel definieren.

Bewährt hat sich:

- echte Theme-Werte abfragen, wenn DOM und `activeDocument` verfügbar sind
- unsichtbare Probe-Elemente verwenden, um berechnete Styles zu lesen
- immer Fallbacks behalten
- Tests so schreiben, dass sie ohne echte Obsidian-DOM-Umgebung laufen können

### Medien und PDFs brauchen eigene Behandlung

Bilder, PDFs, Audio, Video und generische Dateien verhalten sich unterschiedlich. Native Browser-Controls sind für Audio/Video besser als selbst gebaute UI. PDFs brauchen Viewer-/Fallback-Logik, und große Dateien können Single-HTML-Exporte stark aufblähen.

Neue Asset-Typen sollten deshalb immer mit diesen Fragen eingeführt werden:

- Wird der MIME-Type korrekt erkannt?
- Gibt es einen sinnvollen Browser-Fallback?
- Wird das Asset im Paket-Export kopiert und im Single-HTML-Export eingebettet?
- Ist der Dateiname stabil, sicher und kollisionsfrei?

### Dateinamen und Pfade sind ein Kernfeature

Exportierte Dateien müssen auf unterschiedlichen Systemen und in Browsern funktionieren. Sichere Segmente, eindeutige Namen und normalisierte Pfade sind kein Nebenbei-Thema, sondern Teil der Exportqualität.

Besonders wichtig:

- keine rohen Vault-Pfade direkt in HTML-Ausgabe übernehmen
- URL-/Dateipfad-Kontexte getrennt behandeln
- absolute Desktop-Pfade nur im Desktop-Kontext erlauben
- fehlende oder doppelte Ziele klar behandeln

### Reviewbot-Feedback früh antizipieren

Der Obsidian-Reviewbot achtet nicht nur auf funktionierenden Code, sondern auch auf Plugin-Konventionen und Paket-Hygiene. Vor einem Release immer prüfen:

- `manifest.json`, `versions.json`, `package.json` und Release-Artefakte passen zusammen
- keine unnötigen lokalen Artefakte oder generierten Analyseordner im Repository
- keine unpassenden Deklarationsdateien, Workarounds oder Debug-Hilfen im Release
- README beschreibt Installation, Nutzung, Limits, Datenschutz und Support klar
- Build und Tests laufen sauber

### Demo-Vault und Dokumentations-Canvas sind Produktbestandteil

Das Demo-Vault war nicht nur Testmaterial, sondern auch Dokumentation und Qualitätskontrolle. Es zeigt, ob ein Nutzer den Export wirklich versteht und ob typische Inhalte sichtbar korrekt gerendert werden.

Für künftige Versionen:

- Demo-Vault aktuell halten, wenn Features geändert werden
- Dokumentations-Canvas als realen End-to-End-Test betrachten
- große generierte Exporte nicht unbedacht ins Repository aufnehmen
- Beispielinhalte so wählen, dass sie echte Randfälle abdecken

## Allgemeine Learnings für Obsidian-Plugin-Entwicklung

### Obsidian-Plugins sollten lokal, defensiv und transparent arbeiten

Ein gutes Obsidian-Plugin respektiert den Vault des Nutzers. Besonders bei Export-Plugins heißt das:

- lokal arbeiten und keine Daten versenden
- vor destruktiven oder überschreibenden Aktionen vorsichtig sein
- klare Notices geben, wenn etwas exportiert wurde oder fehlschlägt
- Fehler mit brauchbarer Meldung anzeigen und intern detaillierter loggen

### Desktop-APIs bewusst kapseln

Obsidian läuft zwar oft auf dem Desktop, aber Node-/Electron-APIs sollten nicht quer im Code verteilt werden. Eine kleine Kapsel für Desktop-Pfade und Node-Zugriff macht den Rest des Codes testbarer und reviewfreundlicher.

Gute Regel: Vault-Operationen über Obsidian-APIs, echte Dateisystem-Operationen nur an wenigen kontrollierten Stellen.

### Settings brauchen Migration und Normalisierung

Plugin-Einstellungen leben lange. Defaults allein reichen nicht, weil Nutzer alte Daten behalten. Einstellungen sollten beim Laden normalisiert werden, damit neue Optionen robuste Defaults bekommen und alte Werte nicht zu Laufzeitfehlern führen.

### UI-Texte knapp und handlungsnah halten

Settings-Text, Notices und README sollten erklären, was der Nutzer entscheiden muss, nicht den Code beschreiben. Besonders bei Optionen wie Exportformat, Output-Folder, Minimap, Suche oder Syntax-Theme ist klare Sprache wichtiger als technische Vollständigkeit.

### Release-Metadaten sind Teil des Codes

Bei Obsidian-Plugins sind `manifest.json`, `versions.json`, `package.json`, Build-Ausgabe und README gemeinsam das Produkt. Versionssprünge, Plugin-ID, Name, Beschreibung, Author-URL und Release-Dateien müssen zusammenpassen.

Eine kleine Release-Checkliste verhindert späte Review-Probleme:

- `npm test`
- `npm run build:prod`
- Manifest-Version und Package-Version synchron
- Release-Ordner enthält nur benötigte Dateien
- README und Lizenz aktuell
- frischer Test in einem realen Vault

### Generierte Arbeitsartefakte konsequent trennen

Analyseausgaben, lokale Testbuilds, Finder-Dateien, Vault-Trash und Agenten-/Tool-Konfigurationen gehören normalerweise nicht in den Plugin-Release-Stand. Sie können lokal nützlich sein, sollten aber entweder ignoriert oder bewusst außerhalb des Release-Baums liegen.

Beispiele aus diesem Projekt:

- `.test-build/` ist ein lokales Test-Zwischenprodukt
- `graphify-out/` war ein Analyseartefakt und gehört nicht zum Plugin
- `.DS_Store`, Vault-Trash und lokale Tool-Konfigurationen sollten nicht Teil des Releases werden

### Kleine, sprechende Module schlagen späte Großdatei-Rettung

TypeScript-Plugins wachsen schnell, wenn Export, Rendering, UI und Dateizugriff in einer Datei zusammenlaufen. Eine späte Aufteilung ist möglich, aber riskanter als früh Grenzen zu setzen.

Sinnvolle Modulgrenzen für Obsidian-Plugins:

- Plugin-Lifecycle und Commands
- Settings und Settings-Tab
- Vault-/Dateisystem-Zugriff
- reine Transformationslogik
- Rendering/HTML-Erzeugung
- kleine Helper für Pfade, Links und Vorschautexte

### Jeder Obsidian-Randfall braucht einen echten Vault-Gegencheck

Automatische Tests sind wichtig, aber Obsidian selbst bleibt die Referenzumgebung. Besonders prüfen:

- aktive Datei und Command-Palette
- Ribbon-Icon
- Settings speichern/laden
- Export in Vault-Ordner und absoluten Desktop-Ordner
- Verhalten mit aktivem Theme
- große oder gemischte Canvas-Dateien

## Praktische Merksätze

- Erst Datenmodell klären, dann HTML erzeugen.
- Exportmodus immer mitdenken.
- Links sind nie nur Strings.
- Theme-Werte brauchen Fallbacks.
- Demo-Vault ist Test, Dokumentation und Produktprobe zugleich.
- Reviewbot-Fitness beginnt lange vor dem Release.
