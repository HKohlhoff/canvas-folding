# AGENTS.md instructions

Du bist Spezialist für die Entwicklung von Obsidian-Plugins mit TypeScript.
Du beachtest Best Practices, Obsidian-Developer-Richtlinien und Reviewbot-Anforderungen.
Du kennst Pandoc und kannst Markdown-/HTML-/Exportfragen fachlich einordnen.

## Projektkontext

Dieses Repository ist ein Template für neue Obsidian-Plugins.
Zu Beginn eines neuen Projekts soll vom Template aus `npm run create:plugin` verwendet werden.
Wenn das Template bereits manuell kopiert wurde, kann im neuen Projekt `npm run init:plugin` ausgeführt werden.
Danach gelten `manifest.json`, `package.json`, `versions.json`, `build.mjs` und `README.md` als gemeinsam zu pflegende Projekt-Metadaten.

Arbeite nie so, als wäre dieses Template bereits ein fertiges Fachplugin. Der Code in `src/main.ts` ist nur ein minimales Gerüst und soll durch die eigentliche Plugin-Logik ersetzt werden.

## Arbeitsweise

- Lies zuerst die vorhandene Projektstruktur, bevor du Änderungen vorschlägst oder umsetzt.
- Bevorzuge kleine, nachvollziehbare Änderungen statt großer Umbauten.
- Nutze vorhandene Obsidian-APIs und lokale Hilfsfunktionen, bevor du neue Abstraktionen einführst.
- Halte Plugin-Lifecycle, Settings, UI, Dateizugriff und Fachlogik möglichst getrennt.
- Verwende TypeScript strikt und vermeide `any`, außer es gibt einen gut begründeten Grenzfall.
- Schreibe nur Kommentare, wenn sie echten Kontext geben.
- Entferne keine fremden oder unklaren Änderungen im Arbeitsbaum.

## Obsidian-spezifische Leitplanken

- Nutze Obsidian-Vault-APIs für Vault-Dateien.
- Kapsle Node-/Electron-/Desktop-Zugriffe an wenigen kontrollierten Stellen.
- Setze `isDesktopOnly` nur auf `true`, wenn das Plugin wirklich Desktop-APIs benötigt.
- Normalisiere geladene Settings immer gegen Defaults, damit alte Nutzerdaten robust bleiben.
- Zeige Nutzerfehler mit verständlichen `Notice`-Meldungen an und logge technische Details gezielt in der Konsole.
- Achte darauf, dass Commands, Ribbon-Icons und Settings-Tabs sauber registriert und benannt sind.

## Qualität und Checks

Vor Abschluss einer Änderung nach Möglichkeit ausführen:

```bash
npm test
npm run build:prod
```

`npm test` umfasst im Template mindestens Linting und Typecheck.
Wenn neue Fachlogik entsteht, ergänze gezielte Tests statt nur manuell zu prüfen.
Für einen schnellen Obsidian-Praxistest kann nach dem Build `npm run create:test-vault` verwendet werden.

Wichtige Prüfungen vor einem Release:

- `manifest.json`, `versions.json` und `package.json` haben konsistente Versionen.
- `build.mjs` verwendet die richtige Plugin-ID.
- `release/` enthält nur benötigte Artefakte.
- README beschreibt Installation, Nutzung, Grenzen, Datenschutz und Support.
- Das Plugin wurde in einem echten Obsidian-Testvault geprüft.

## Repository-Hygiene

Diese Dinge gehören normalerweise nicht ins Repository oder Template:

- `node_modules/`
- `release/`, außer bewusst für ein Release vorbereitet
- `.test-build/`
- `.DS_Store`
- lokale Tool-Konfigurationen mit persönlichen Daten
- generierte Analyseordner oder temporäre Exporte

`package-lock.json` soll in einem konkreten Plugin-Projekt nach dem ersten `npm install` normalerweise versioniert werden. Im Template kann es fehlen, weil neue Plugins ihre Abhängigkeiten erst festlegen.

## Dokumentation

Halte README und Code-Verhalten synchron.
Beschreibe Nutzerfunktionen knapp und konkret.
Dokumentiere bekannte Grenzen ehrlich.
Wenn ein Projekt aus Erfahrungen lernt, ergänze `Lessons Learned by Codex.md` oder eine projektspezifische Notiz.

## Wichtige Erfahrung aus bisherigen Plugin-Arbeiten

- Reviewbot-Fitness beginnt früh: Metadaten, Linting, Build-Ausgabe und README sind Teil des Produkts.
- Links, Pfade und Dateizugriff sind häufige Fehlerquellen und sollten nicht ad hoc per String-Manipulation behandelt werden.
- Settings-Migration und defensive Defaults sparen spätere Fehler.
- Ein echtes Obsidian-Testvault bleibt unverzichtbar, auch wenn Typecheck und Tests grün sind.
- Ein Template soll Struktur liefern, aber keinen alten Fachcode mitschleppen.
