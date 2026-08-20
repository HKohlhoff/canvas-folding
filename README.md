# Obsidian Plugin Template

Dieses Verzeichnis ist eine schlanke Arbeitsvorlage für neue Obsidian-Plugins.

## Enthalten

- minimales Plugin-Gerüst unter `src/`
- Build-Skript mit esbuild
- strikter Typecheck mit TypeScript 6
- ESLint 10 mit typbasierten TypeScript- und aktuellen Obsidian-Regeln
- Obsidian-API 1.13 und ES2021 als aktuelle Entwicklungsbasis
- Obsidian-Dateien `manifest.json`, `versions.json`, `styles.css`
- GitHub-Workflow-Vorlagen für CI und Release
- `AGENTS.md` mit lokalen Arbeitsanweisungen
- `Lessons Learned by Codex.md` als Entwicklungsnotizen
- `CHANGELOG.md`, `CONTRIBUTING.md` und `docs/release-checklist.md`
- Scripts für Projektstart und Testvault-Erstellung

## Bewusst nicht enthalten

- `node_modules/`
- `release/`
- `.test-build/`
- Canvas-spezifischer Source-Code und Canvas-spezifische Tests
- Demo-Vaults, exportierte HTML-Dokumentation und Screenshots
- lokale Tool- oder Analyseartefakte

## Start eines neuen Plugins

Voraussetzung ist Node.js 20.19 oder neuer; für CI verwendet die Vorlage Node.js 22 und 24.

Am bequemsten vom Template-Ordner aus:

```bash
npm run create:plugin
```

Das Script führt interaktiv durch:

1. Zielordner für das neue Plugin festlegen
2. Template dorthin kopieren
3. Plugin-Metadaten initialisieren
4. `npm install`, `npm test`, `npm run build:prod` ausführen
5. Git initialisieren und den ersten Commit vorbereiten

Alternativ kann das Script mit Parametern gestartet werden:

```bash
npm run create:plugin -- --id my-plugin --name "My Plugin" --description "Does something useful"
```

Wenn das Template bereits manuell kopiert wurde, kann im neuen Projekt nur die Initialisierung ausgeführt werden:

```bash
npm run init:plugin
```

Danach das minimale Beispiel in `src/main.ts` durch die eigentliche Plugin-Logik ersetzen.

Das Script aktualisiert `manifest.json`, `package.json`, eine vorhandene `package-lock.json`, `versions.json`, `build.mjs`, `README.md` und bei Bedarf `LICENSE`.

Ein konkretes Plugin-Projekt erhält bei `npm install` seine eigene `package-lock.json`. CI und Release verwenden anschließend `npm ci`, damit exakt dieselben Abhängigkeiten installiert werden.

## Qualitätschecks

```bash
npm test
npm run build:prod
```

`npm test` führt ESLint ohne tolerierte Warnungen und den TypeScript-Typecheck aus. Der Produktionsbuild erzeugt ausschließlich die für Obsidian benötigten Dateien unter `release/`; Quellkarten werden nicht veröffentlicht.

Die Versionsbereiche sind bewusst auf den neuesten miteinander kompatiblen Stand gesetzt. TypeScript 7 wird erst übernommen, sobald `typescript-eslint` diese Hauptversion offiziell unterstützt.

## Testvault

Nach einem erfolgreichen Build kann ein lokales Testvault erzeugt werden:

```bash
npm run create:test-vault
```

Optional mit Zielpfad:

```bash
npm run create:test-vault -- /path/to/TestVault
```

## Hinweis

Die Vorlage ist absichtlich kein Klon von `canvas2html`. Sie übernimmt nur die belastbare Projektstruktur und ein minimales Plugin-Gerüst, damit ein neues Plugin ohne alten Fachcode beginnen kann.
