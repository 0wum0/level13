# Level 13

Level 13 ist ein textbasiertes, inkrementelles Science-Fiction-Browserabenteuer. Der Spieler überlebt in einer dunklen, verfallenen Stadt, entdeckt alte und neue Technologien und baut eine zusammengebrochene Zivilisation wieder auf.

Die bestehende Browser-Spielarchitektur mit RequireJS, jQuery und Ash.js bleibt erhalten. Ausgeliefert wird sie nun über eine Node.js-22-Anwendung mit Express und Socket.IO.

## Funktionen

- Überleben, Erkundung und Ressourcenmanagement
- Lagerbau und zufällig erzeugte Karten
- Gegenstände, Ausrüstung und Umweltgefahren
- Technologien und schrittweise freigeschaltete Spielsysteme
- Mehrsprachige Oberfläche mit Deutsch als Standardsprache
- Englisch als vollständige Rückfallsprache
- Finnisch bleibt als vorhandene Sprache verfügbar
- Echtzeitverbindung und optionale Spielstand-Synchronisierung über Socket.IO

## Lokal starten

Voraussetzungen: Node.js 22 und npm 10 oder neuer.

```bash
nvm use
npm install
npm start
```

Danach ist das Spiel standardmäßig unter `http://localhost:3000` erreichbar. Während der Entwicklung kann der Server mit automatischem Neustart gestartet werden:

```bash
npm run dev
```

Die JavaScript-Syntax der Serverdateien wird geprüft mit:

```bash
npm run check
```

## Konfiguration

Kopiere `.env.example` nach `.env` oder hinterlege die Variablen in der Hosting-Oberfläche:

- `PORT`: HTTP-Port, standardmäßig `3000`
- `ALLOWED_ORIGINS`: Kommagetrennte Origins für Socket.IO; leer bedeutet Same-Origin-Betrieb
- `TRUST_PROXY`: Hinter einem vertrauenswürdigen Reverse Proxy auf `true` setzen
- `MAX_LIVE_SESSIONS`: Maximale Zahl zwischengespeicherter Live-Sitzungen
- `LIVE_SESSION_TTL_MS`: Ablaufzeit inaktiver Live-Sitzungen

Der Statusendpunkt liegt unter `/healthz`.

## Sprachen

Die Sprache kann im Einstellungsfenster direkt gewechselt werden. Neue und bestehende Spielstände ohne gespeicherte Sprachwahl starten mit `DE_DE`.

Übersetzungsdateien:

- `strings/strings-de.json` – Deutsch
- `strings/strings.json` – Englisch und Rückfalltexte
- `strings/strings-fi.json` – Finnisch

Fehlt ein deutscher oder finnischer Schlüssel, verwendet das Spiel automatisch den englischen Originaltext. Zusätzlich übersetzt `src/text/LocaleBootstrap.js` ältere, direkt im HTML hinterlegte Oberflächentexte und stellt sie beim Wechsel zu Englisch oder Finnisch wieder her.

## Socket.IO

Der Browser verbindet sich automatisch mit demselben Host. Die Verbindung stellt Präsenzinformationen, Serverzeit und eine versionierte Synchronisierung des Standard-Spielstands bereit.

Wichtige Ereignisse:

- `game:join`
- `presence:update`
- `client:language`
- `server:time`
- `save:push`
- `save:pull`
- `save:updated`

Die Live-Spielstände werden derzeit nur im Arbeitsspeicher des Node-Prozesses gehalten. Sie sind kein dauerhaftes Benutzerkonto oder Cloud-Backup und gehen bei einem Serverneustart verloren. Der lokale Browser-Spielstand bleibt davon unabhängig erhalten.

## Projektstruktur

- `server.js` – Express- und HTTP-Server
- `server/socket-server.js` – Socket.IO-Protokoll und Sitzungsspeicher
- `src/network/SocketClient.js` – fehlertoleranter Browser-Client
- `src/text/TextLoader.js` – Sprachwahl und Übersetzungs-Fallback
- `src/text/LocaleBootstrap.js` – Übersetzung älterer statischer Texte
- `src/game/systems/SaveSystem.js` – lokale Speicherung und Live-Synchronisierung

Die Spiellogik bleibt weiterhin nach Entity-Component-System-Prinzip in Komponenten und Systemen organisiert. Weitere Hinweise für Beiträge stehen in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Ursprung

Das ursprüngliche Level-13-Projekt stammt von Noora Routasuo und ist unter anderem von *A Dark Room*, *Kittens Game*, *Shark Game*, *Crank*, *CivClicker* und *Prosperity* inspiriert.
