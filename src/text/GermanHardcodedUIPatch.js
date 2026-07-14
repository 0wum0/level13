define([
    'text/Text',
    'game/GameGlobals',
    'game/UIFunctions',
    'game/helpers/PlayerHelper',
    'game/helpers/ui/UIPopupManager',
    'game/systems/GameManager',
    'game/systems/ui/UIOutMetaPopupsSystem'
], function (
    Text,
    GameGlobals,
    UIFunctions,
    PlayerHelper,
    UIPopupManager,
    GameManager,
    UIOutMetaPopupsSystem
) {
    'use strict';

    let applied = false;

    function isGerman() {
        return Text.currentLanguage === 'DE_DE'
            || (typeof document !== 'undefined' && document.documentElement.lang === 'de-DE');
    }

    const commonText = {
        'Level 13': 'Sublevel',
        'Error': 'Fehler',
        'ERROR': 'FEHLER',
        'Warning': 'Warnung',
        'Update': 'Aktualisierung',
        'Confirmation': 'Bestätigung',
        'System Message': 'Systemmeldung',
        'Restart game?': 'Spiel neu starten?',
        'All progress will be lost.': 'Der gesamte Spielfortschritt geht verloren.',
        'Rename Camp': 'Lager umbenennen',
        'Select a new name for the camp.': 'Wähle einen neuen Namen für das Lager.',
        'Continue': 'Weiter',
        'Confirm': 'Bestätigen',
        'Cancel': 'Abbrechen',
        'Restart': 'Neu starten',
        'Rename': 'Umbenennen',
        'Take all': 'Alles nehmen',
        'reload': 'neu laden',
        'clear data': 'Daten löschen'
    };

    const hotkeyText = {
        'Home': 'Startseite',
        'Map': 'Karte',
        'Go': 'Aufbrechen',
        'Bag': 'Rucksack',
        'Items': 'Gegenstände',
        'Projects': 'Projekte',
        'Upgrades': 'Verbesserungen',
        'Tribe': 'Stamm',
        'Milestones': 'Meilensteine',
        'Move north': 'Nach Norden bewegen',
        'Move west': 'Nach Westen bewegen',
        'Move east': 'Nach Osten bewegen',
        'Move south': 'Nach Süden bewegen',
        '(debug) Speed up': '(Debug) Beschleunigen',
        '(debug) Skip update': '(Debug) Aktualisierung überspringen',
        '(debug) Clear storage': '(Debug) Speicher löschen',
        '(debug) Open console': '(Debug) Konsole öffnen'
    };

    const statText = {
        'General': 'Allgemein',
        'Time played': 'Spielzeit',
        'Time outside': 'Zeit außerhalb des Lagers',
        'Blueprint pieces found': 'Gefundene Bauplanteile',
        'Exploration': 'Erkundung',
        'Steps taken': 'Zurückgelegte Schritte',
        'Sectors visited': 'Besuchte Sektoren',
        'Sectors scouted': 'Erkundete Sektoren',
        'Times scavenged': 'Plünderungen',
        'Most steps on level': 'Meiste Schritte auf einer Ebene',
        'Expeditions started': 'Begonnene Expeditionen',
        'Expeditions survived': 'Überlebte Expeditionen',
        'Longest survived': 'Längste überlebte Expedition',
        'Injuries received': 'Erhaltene Verletzungen',
        'Explorer injuries received': 'Verletzungen von Entdeckern',
        'Times rested outside': 'Pausen außerhalb des Lagers',
        'Times despaired': 'Aufgaben',
        'Most despairs on level': 'Meiste Aufgaben auf einer Ebene',
        'People met outside': 'Draußen getroffene Menschen',
        'Graffiti made': 'Angebrachte Graffiti',
        'Camp': 'Lager',
        'Buildings built': 'Errichtete Gebäude',
        'Buildings dismantled': 'Abgerissene Gebäude',
        'Building improvements': 'Gebäudeverbesserungen',
        'Raids sustained': 'Erlebte Überfälle',
        'Raids lost': 'Verlorene Überfälle',
        'Most resources lost in a raid': 'Höchster Ressourcenverlust bei einem Überfall',
        'Disease outbreaks': 'Krankheitsausbrüche',
        'Natural disasters': 'Naturkatastrophen',
        'Refugees accepted': 'Aufgenommene Flüchtlinge',
        'Resources': 'Ressourcen',
        'Resources overflown due to storage': 'Wegen voller Lager verlorene Ressourcen',
        '% of produced resources overflown': 'Anteil verlorener produzierter Ressourcen',
        'Food collected from traps': 'Mit Fallen gesammelte Nahrung',
        'Water collected from buckets': 'Mit Eimern gesammeltes Wasser',
        'Trade': 'Handel',
        'Traders received': 'Besuche von Händlern',
        'Trades made': 'Abgeschlossene Handelsgeschäfte',
        'Trade partners found': 'Gefundene Handelspartner',
        'Caravans sent': 'Entsandte Karawanen',
        'Silver found': 'Gefundenes Silber',
        'Items sold': 'Verkaufte Gegenstände',
        'Items bought': 'Gekaufte Gegenstände',
        'Most items sold': 'Am häufigsten verkaufter Gegenstand',
        'Most items bought': 'Am häufigsten gekaufter Gegenstand',
        'Resources sold': 'Verkaufte Ressourcen',
        'Most resource sold': 'Am häufigsten verkaufte Ressource',
        'Most resource bought': 'Am häufigsten gekaufte Ressource',
        'Item bought for highest price': 'Teuerster gekaufter Gegenstand',
        'Item sold for highest price': 'Teuerster verkaufter Gegenstand',
        'Fight': 'Kampf',
        'Fights started': 'Begonnene Kämpfe',
        'Fights won': 'Gewonnene Kämpfe',
        'Enemy: Most defeated': 'Am häufigsten besiegter Gegner',
        'Enemy: Most defated by': 'Gegner mit den meisten Siegen gegen dich',
        'Items': 'Gegenstände',
        'Items found': 'Gefundene Gegenstände',
        'Unique items found': 'Verschiedene gefundene Gegenstände',
        'Items crafted': 'Hergestellte Gegenstände',
        'Unique items crafted': 'Verschiedene hergestellte Gegenstände',
        'Unique items equipped': 'Verschiedene ausgerüstete Gegenstände',
        'Items lost': 'Verlorene Gegenstände',
        'Items broken': 'Zerbrochene Gegenstände',
        'Items repaired': 'Reparierte Gegenstände',
        'Lock picks used': 'Verbrauchte Dietriche',
        'Explorers': 'Entdecker',
        'Explorers recruited': 'Rekrutierte Entdecker',
        'Explorers lost': 'Verlorene Entdecker',
        'Explorers dismissed': 'Entlassene Entdecker',
        'Most steps together': 'Meiste gemeinsame Schritte',
        'Most fights together': 'Meiste gemeinsame Kämpfe',
        'Most chats': 'Meiste Gespräche'
    };

    function translateCommon(value) {
        if (!isGerman() || value === null || value === undefined) return value;
        const text = String(value);
        if (commonText[text]) return commonText[text];

        return text
            .replace(/You've found a bug! Please reload the page to continue playing\./g, 'Es ist ein Fehler aufgetreten. Bitte lade die Seite neu, um weiterzuspielen.')
            .replace(/If reloading doesn't help, you can clear your data and restart the game, but you will lose all your progress\./g, 'Falls das Neuladen nicht hilft, kannst du die lokalen Daten löschen und das Spiel neu starten. Dabei geht dein Fortschritt verloren.')
            .replace(/You can also help the developer by/g, 'Du kannst dem Entwickler außerdem helfen, indem du')
            .replace(/>reporting</g, '>den Fehler meldest<')
            .replace(/the problem on GitHub\./g, 'und das Problem auf GitHub beschreibst.')
            .replace(/The game state contains data from two incompatible versions\./g, 'Der Spielstand enthält Daten aus zwei nicht miteinander kompatiblen Versionen.')
            .replace(/It appears that you have used cheats\./g, 'Offenbar wurden Cheats verwendet.')
            .replace(/This may have caused the issue\./g, 'Dies könnte den Fehler verursacht haben.')
            .replace(/ on level \(/g, ' auf Ebene (');
    }

    function translateStatName(value) {
        if (!isGerman() || !value) return value;
        if (statText[value]) return statText[value];

        const match = String(value).match(/^([^:]+): (Produced in camp|Found exploring|Found)$/);
        if (match) {
            const rawName = match[1];
            const key = rawName.toLowerCase();
            const translatedName = Text.hasKey('game.resources.' + key + '_name')
                ? Text.t('game.resources.' + key + '_name')
                : (Text.hasKey('game.stats.' + key + '_name') ? Text.t('game.stats.' + key + '_name') : rawName);
            const suffix = {
                'Produced in camp': 'im Lager erzeugt',
                'Found exploring': 'bei der Erkundung gefunden',
                'Found': 'gefunden'
            }[match[2]];
            return translatedName + ': ' + suffix;
        }

        return value;
    }

    function patchPopupManager() {
        const original = UIPopupManager.prototype.showPopup;
        UIPopupManager.prototype.showPopup = function (title, msg, okButtonLabel, cancelButtonLabel, resultVO, okCallback, cancelCallback, options) {
            if (isGerman()) {
                title = translateCommon(title);
                msg = translateCommon(msg);
                okButtonLabel = translateCommon(okButtonLabel);
                cancelButtonLabel = translateCommon(cancelButtonLabel);
            }

            const result = original.call(this, title, msg, okButtonLabel, cancelButtonLabel, resultVO, okCallback, cancelCallback, options);
            if (isGerman()) $('#confirmation-takeall').text('Alles nehmen');
            return result;
        };
    }

    function patchUIFunctions() {
        const proto = UIFunctions.prototype;

        const originalInfo = proto.getGameInfoDiv;
        proto.getGameInfoDiv = function () {
            if (!isGerman()) return originalInfo.apply(this, arguments);
            let html = '';
            html += "<span id='changelog-version'>Version " + GameGlobals.changeLogHelper.getCurrentVersionNumber()
                + '<br/>aktualisiert am ' + GameGlobals.changeLogHelper.getCurrentVersionDate() + '</span>';
            html += '<p>Sublevel befindet sich in aktiver Entwicklung. Einige Funktionen sind noch nicht vollständig ausbalanciert, und Aktualisierungen können ältere Spielstände beeinflussen. Rückmeldungen und Fehlermeldungen sind willkommen.</p>';
            html += '<p>Rückmeldung:<br/>' + GameConstants.getFeedbackLinksHTML() + '</p>';
            html += "<p>Weitere Informationen:<br/><a href='faq.html' target='faq'>Häufige Fragen</a> | <a href='changelog.html' target='changelog'>Änderungsprotokoll</a></p>";
            return html;
        };

        const originalStats = proto.updateGameStatsPopup;
        proto.updateGameStatsPopup = function () {
            const result = originalStats.apply(this, arguments);
            if (isGerman()) {
                $('#game-stats-container').find('.game-stat-value, .game-stat-highscore-entry').each(function () {
                    const $element = $(this);
                    $element.text($element.text()
                        .replace(/ steps\b/g, ' Schritte')
                        .replace(/on level /g, 'auf Ebene '));
                });
            }
            return result;
        };

        const originalReqs = proto.getSpecialReqsText;
        proto.getSpecialReqsText = function () {
            return translateCommon(originalReqs.apply(this, arguments));
        };
    }

    function patchPlayerStats() {
        const original = PlayerHelper.prototype.getVisibleGameStats;
        PlayerHelper.prototype.getVisibleGameStats = function () {
            const result = original.apply(this, arguments);
            if (!isGerman()) return result;

            result.forEach(category => {
                category.displayName = translateStatName(category.displayName);
                (category.stats || []).forEach(stat => {
                    stat.displayName = translateStatName(stat.displayName);
                });
            });
            return result;
        };
    }

    function patchMetaPopups() {
        const originalUpdate = UIOutMetaPopupsSystem.prototype.updateHotkeyListItem;
        UIOutMetaPopupsSystem.prototype.updateHotkeyListItem = function (li, data) {
            if (isGerman() && data && hotkeyText[data.displayName]) {
                data = Object.assign({}, data, { displayName: hotkeyText[data.displayName] });
            }
            return originalUpdate.call(this, li, data);
        };

        const originalMessage = UIOutMetaPopupsSystem.prototype.showMetaMessage;
        UIOutMetaPopupsSystem.prototype.showMetaMessage = function (message) {
            if (!isGerman()) return originalMessage.call(this, message);
            const text = message && message.text;
            if (!text) return;
            GameGlobals.uiFunctions.showInfoPopup('Systemmeldung', translateCommon(text), 'Weiter');
        };
    }

    function patchGameManager() {
        GameManager.prototype.showSaveWarning = function (saveVersion) {
            if (!isGerman()) return this.__sublevelOriginalShowSaveWarning(saveVersion);
            const currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
            GameGlobals.uiFunctions.showQuestionPopup(
                'Warnung',
                'Ein Teil des Spielstands konnte nicht geladen werden. Vermutlich ist der Spielstand alt und nicht vollständig mit der aktuellen Version kompatibel. Starte das Spiel neu oder fahre auf eigenes Risiko fort.<br><br/>Spielstand-Version: ' + saveVersion + '<br/>Aktuelle Version: ' + currentVersion,
                'Neu starten',
                'Weiter',
                function () {
                    GameGlobals.uiFunctions.showGame();
                    GameGlobals.uiFunctions.restart();
                },
                function () { GameGlobals.uiFunctions.showGame(); },
                true
            );
        };

        GameManager.prototype.showUpdateNote = function (saveVersion, continueCallback) {
            if (!isGerman()) return this.__sublevelOriginalShowUpdateNote(saveVersion, continueCallback);
            const currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
            if (GameGlobals.metaState.playedVersions.indexOf(currentVersion) >= 0) {
                continueCallback();
                return;
            }
            const changelogLink = "<a href='changelog.html' target='changelog'>Änderungsprotokoll</a>";
            let message = '<p>Das Spiel wurde aktualisiert.</p>';
            message += "<span class='text-list-entry p-meta'>Spielstand-Version: " + saveVersion + '</span>';
            message += "<span class='text-list-entry p-meta'>Aktuelle Version: " + currentVersion + '</span>';
            message += '<p>Weitere Informationen findest du im ' + changelogLink + '.</p>';
            GameGlobals.uiFunctions.showInfoPopup('Aktualisierung', message, null, null, continueCallback, true, false);
        };

        GameManager.prototype.showVersionWarning = function (saveVersion, continueCallback) {
            if (!isGerman()) return this.__sublevelOriginalShowVersionWarning(saveVersion, continueCallback);
            GameGlobals.uiFunctions.hideGame();
            const currentVersion = GameGlobals.changeLogHelper.getCurrentVersionNumber();
            const changelogLink = "<a href='changelog.html' target='changelog'>Änderungsprotokoll</a>";
            let message = 'Die Version deines Spielstands ist nicht mit der aktuellen Spielversion kompatibel. Das Spiel wurde vermutlich seit deinem letzten Besuch aktualisiert. Weitere Informationen findest du im ' + changelogLink + '.';
            message += '<br><br/>Spielstand-Version: ' + saveVersion + '<br/>Aktuelle Version: ' + currentVersion;
            message += "<br><br/><span class='warning'>Es wird empfohlen, das Spiel neu zu starten. Fahre nur auf eigenes Risiko fort.</span>";
            GameGlobals.uiFunctions.showQuestionPopup(
                'Aktualisierung',
                message,
                'Neu starten',
                'Weiter',
                function () {
                    GameGlobals.uiFunctions.showGame();
                    GameGlobals.uiFunctions.restart();
                },
                function () {
                    GameGlobals.uiFunctions.showGame();
                    continueCallback();
                },
                true
            );
        };
    }

    return {
        apply: function () {
            if (applied) return;
            applied = true;

            GameManager.prototype.__sublevelOriginalShowSaveWarning = GameManager.prototype.showSaveWarning;
            GameManager.prototype.__sublevelOriginalShowUpdateNote = GameManager.prototype.showUpdateNote;
            GameManager.prototype.__sublevelOriginalShowVersionWarning = GameManager.prototype.showVersionWarning;

            patchPopupManager();
            patchUIFunctions();
            patchPlayerStats();
            patchMetaPopups();
            patchGameManager();
        }
    };
});