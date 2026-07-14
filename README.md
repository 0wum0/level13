# Sublevel

Sublevel ist ein textbasiertes, inkrementelles Science-Fiction-Browserabenteuer. Der Spieler überlebt in einer dunklen, verfallenen Stadt, entdeckt alte und neue Technologien und baut eine zusammengebrochene Zivilisation wieder auf.

Das Repository bleibt aus Gründen der Historie und bestehender Integrationen unter `level13`. Die bestehende Spielarchitektur mit RequireJS, jQuery und Ash.js bleibt erhalten. Ausgeliefert wird sie über Node.js 22, Express, Socket.IO und MySQL beziehungsweise MariaDB.

## Funktionen

- Überleben, Erkundung und Ressourcenmanagement
- Lagerbau und zufällig erzeugte Karten
- Gegenstände, Ausrüstung und Umweltgefahren
- Technologien und schrittweise freigeschaltete Spielsysteme
- vollständige deutsche und englische Spieloberfläche
- browserbasierter Ersteinrichtungs-Assistent
- geschützte Benutzeranmeldung mit serverseitigen Sitzungen
- benutzerbezogene, dauerhafte Datenbank-Spielstände
- umfangreiche zweisprachige Wächterzentrale
- Wächterbefehle für Gegenstände, Ressourcen, Nachrichten und Speichervorgänge
- Systemmeldungen, Wartungsmodus, Benutzerverwaltung und Audit-Protokoll
- optionale Echtzeitverbindung über Socket.IO

## Installation

Voraussetzungen:

- Node.js 22 oder neuer
- npm 10 oder neuer
- eine bereits angelegte MySQL- oder MariaDB-Datenbank
- Schreibzugriff für das Sublevel-Datenverzeichnis

```bash
nvm use
npm install
npm start
```

Beim ersten Aufruf leitet Sublevel automatisch nach `/install` weiter. Der Assistent führt durch:

1. Begrüßung und Systemhinweise
2. Eingabe und Prüfung der Datenbankverbindung
3. Erstellung des ersten Wächterkontos

Anschließend wird der Wächter automatisch angemeldet und das Spiel geöffnet. Alle benötigten Tabellen werden mit dem Präfix `sublevel_` angelegt. Vorhandene fremde Tabellen werden nicht verändert.

## Anmeldung und Spielstände

Nach abgeschlossener Installation führt `/` unangemeldete Besucher zu `/login`. Spieler können durch einen Wächter angelegt werden.

Der Datenbank-Spielstand wird vor dem Start der Spiellogik geladen. Existiert beim ersten Login noch kein Datenbank-Spielstand, übernimmt Sublevel den vorhandenen lokalen Browser-Spielstand einmalig in das Benutzerkonto. Lokale Zwischenspeicher werden anschließend pro Benutzer getrennt, damit Konten auf demselben Gerät keine Spielstände übernehmen.

Bei jedem regulären Speichervorgang wird der Spielstand weiterhin lokal gesichert und zusätzlich dauerhaft in `sublevel_saves` gespeichert.

## Wächterzentrale

Wächter sehen im Spiel eine zusätzliche Verknüpfung zur Route `/guardian`. Normale Spieler erhalten diese Verknüpfung und den Zugriff nicht.

Die Wächterzentrale enthält:

- Dashboard mit Benutzer-, Sitzungs-, Spielstand- und Befehlsstatus
- Benutzer- und Wächterkonten
- Rollen, Aktivierung, Sprache und Passwortzurücksetzung
- Gegenstandskatalog und Metadaten
- Befehle zum Verteilen vorhandener Spielgegenstände und Ressourcen
- persönliche zweisprachige Spielernachrichten
- globale deutsche und englische Spielmeldungen
- Wartungsmodus und zentrale Einstellungen
- nachvollziehbares Wächter- und Sicherheitsprotokoll

## Sicherheit

- Passwörter werden mit `scrypt` und individuellem Salt gehasht.
- Sitzungen verwenden zufällige, nur als Hash gespeicherte Token.
- Das Sitzungscookie ist `HttpOnly`, `SameSite=Lax` und unter HTTPS zusätzlich `Secure`.
- Schreibende angemeldete API-Aufrufe benötigen ein CSRF-Token.
- Datenbank-Zugangsdaten werden mit AES-256-GCM verschlüsselt gespeichert.
- Fehlt `SUBLEVEL_APP_SECRET`, erzeugt Sublevel automatisch ein starkes Geheimnis.
- Der letzte aktive Wächter kann nicht deaktiviert oder herabgestuft werden.
- Wächteraktionen werden in `sublevel_audit_log` protokolliert.

Die generierten Schlüssel und die verschlüsselte Installationskonfiguration liegen standardmäßig in `.sublevel-data`. Dieses Verzeichnis darf niemals öffentlich ausgeliefert oder in Git übernommen werden.

## Konfiguration

Variablen können in der Hosting-Oberfläche gesetzt werden. Eine lokale `.env`-Datei wird von Node.js nicht automatisch eingelesen und ist nur sinnvoll, wenn der verwendete Hoster sie selbst bereitstellt.

- `PORT`: HTTP-Port, standardmäßig `3000`
- `ALLOWED_ORIGINS`: erlaubte Origins für Socket.IO; leer bedeutet Same-Origin
- `TRUST_PROXY`: hinter einem vertrauenswürdigen Reverse Proxy auf `true`
- `SUBLEVEL_APP_SECRET`: optionales festes Geheimnis mit mindestens 32 Zeichen
- `SUBLEVEL_DATA_DIR`: optionales dauerhaft beschreibbares Verzeichnis für die Installationskonfiguration
- `SESSION_DAYS`: Gültigkeitsdauer einer Anmeldung, standardmäßig 30 Tage
- `DB_POOL_SIZE`: maximale Zahl paralleler Datenbankverbindungen
- `MAX_LIVE_SESSIONS`: maximale Zahl anonymer Socket.IO-Sitzungen
- `LIVE_SESSION_TTL_MS`: Ablaufzeit inaktiver Socket.IO-Sitzungen

Für produktive Hosting-Deployments sollte `SUBLEVEL_DATA_DIR` auf ein Verzeichnis zeigen, das Deployments und Neustarts übersteht. Ohne diese Variable wird `.sublevel-data` im Anwendungsverzeichnis verwendet.

Der Statusendpunkt `/healthz` meldet Installation, Datenbankverbindung, Node-Version und Laufzeit.

## Entwicklung und Prüfung

```bash
npm run dev
npm run check
```

`npm run check` validiert alle Server-, Installer-, Login-, Wächter- und Spielmodule sowie die vollständige deutsche Übersetzung und sämtliche Platzhalter.

## Sprachen

Deutsch ist die Standardsprache. Spiel, Installer, Login und Wächterzentrale unterstützen Deutsch und Englisch. Die historische finnische Spielübersetzung bleibt im Spielpaket erhalten, gehört aber nicht zum neuen Konto- und Wächterbereich.

Der deutsche Modus verwendet keinen unbemerkten englischen Rückfalltext. Fehlende deutsche Schlüssel werden als Übersetzungsfehler kenntlich gemacht und durch den automatischen Übersetzungscheck verhindert.

## Projektstruktur

- `server.js` – Express-, Authentifizierungs- und HTTP-Startpunkt
- `server/database.js` – MySQL-/MariaDB-Verbindung und Schema
- `server/runtime-config.js` – verschlüsselte Installationskonfiguration
- `server/security.js` – Passwort-, Token- und Cookie-Sicherheit
- `server/auth-service.js` – Sitzungen und Zugriffsschutz
- `server/api-routes.js` – Installer-, Login-, Spiel- und Wächter-API
- `server/page-routes.js` – Installer-, Login-, Spiel- und Wächterseiten
- `auth/` – zweisprachige Oberflächen und Browserlogik
- `src/network/SublevelAPI.js` – Konto, Datenbank-Spielstand und Spielstart
- `src/network/GuardianCommandClient.js` – Ausführung von Wächterbefehlen
- `src/network/SocketClient.js` – optionale Echtzeitverbindung
- `src/game/systems/SaveSystem.js` – lokale und datenbankgestützte Speicherung
- `src/text/` und `strings/` – Mehrsprachigkeit

## Ursprung

Sublevel basiert auf dem ursprünglichen Level-13-Projekt von Noora Routasuo und ist unter anderem von *A Dark Room*, *Kittens Game*, *Shark Game*, *Crank*, *CivClicker* und *Prosperity* inspiriert.
