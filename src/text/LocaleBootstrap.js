define([
    'game/GameGlobals',
    'game/GlobalSignals'
], function (GameGlobals, GlobalSignals) {
    'use strict';

    const originalText = new WeakMap();
    let observer = null;

    const dictionaries = {
        DE_DE: {
            'Header': 'Kopfbereich',
            'Status': 'Status',
            'Stats': 'Statistik',
            'Inventory': 'Inventar',
            'Storage': 'Lager',
            'Camp': 'Lager',
            'Log': 'Protokoll',
            'Latest': 'Neueste',
            'All': 'Alle',
            'Current:': 'Aktuell:',
            'Next:': 'Nächstes:',
            'Enemy name & strength': 'Gegnername und Stärke',
            'Enemy strength': 'Gegnerstärke',
            'Enemy difficulty': 'Gegnerschwierigkeit',
            'Player name': 'Spielername',
            'Player strength': 'Spielerstärke',
            'Flee': 'Fliehen',
            'Fight': 'Kämpfen',
            'Leave': 'Verlassen',
            'Continue': 'Weiter',
            'Take all': 'Alles nehmen',
            'Trader': 'Händler',
            'Camp inventory': 'Lagerinventar',
            'Camp offer': 'Angebot des Lagers',
            'Trader offer': 'Angebot des Händlers',
            'Trader inventory': 'Inventar des Händlers',
            '(empty)': '(leer)',
            'Cancel': 'Abbrechen',
            'Reset': 'Zurücksetzen',
            'Trade': 'Handeln',
            'Manage saves': 'Spielstände verwalten',
            'Note that the game is still in alpha and updates can break old saves.': 'Das Spiel befindet sich noch in der Alpha-Phase. Aktualisierungen können ältere Spielstände beschädigen.',
            'Select a save slot from the list': 'Wähle einen Spielstand aus der Liste aus',
            'Info': 'Informationen',
            'Save': 'Speichern',
            'Load': 'Laden',
            'Export': 'Exportieren',
            'Copy': 'Kopieren',
            'Download': 'Herunterladen',
            'Back': 'Zurück',
            'Paste': 'Einfügen',
            'Import': 'Importieren',
            'Back to list': 'Zurück zur Liste',
            'Close': 'Schließen',
            'Game Stats': 'Spielstatistik',
            'Settings': 'Einstellungen',
            'Enable sounds': 'Sounds aktivieren',
            'Enable hotkeys': 'Tastenkürzel aktivieren',
            'Use Numpad for movement': 'Ziffernblock zur Bewegung verwenden',
            'Dialogue': 'Dialog',
            'Loading': 'Wird geladen',
            'download': 'herunterladen',
            'pop': 'Bev.',
            'rep': 'Ruf',
            'raid': 'Überfall',
            'disease': 'Krankheit',
            'storage': 'Lager',
            'production': 'Produktion',
            'Level 13 isn\'t optimized for mobile. The layout works best on larger screens and many elements rely on hover effects. For the best experience, please come back on a different device.': 'Sublevel ist noch nicht vollständig für Mobilgeräte optimiert. Auf größeren Bildschirmen funktioniert die Oberfläche am besten.',
            'If you want to try it out anyway,': 'Du kannst es trotzdem ausprobieren:',
            'click here': 'hier tippen',
            'to dismiss this message.': 'um diesen Hinweis zu schließen.',
            'System Message': 'Systemmeldung',
            'Data': 'Daten',
            'More': 'Mehr',
            'Less': 'Weniger',
            'Restart': 'Neustart',
            'Map': 'Karte',
            'Bag': 'Rucksack',
            'Party': 'Gruppe',
            'Projects': 'Projekte',
            'Upgrades': 'Verbesserungen',
            'Tribe': 'Gemeinschaft',
            'Milestones': 'Meilensteine',
            'Outside': 'Draußen',
            'Go': 'Los',
            'People': 'Menschen',
            'Locales': 'Orte',
            'Build': 'Bauen',
            'Search': 'Suchen',
            'Wander': 'Umherziehen',
            'Equipment': 'Ausrüstung',
            'Other items': 'Andere Gegenstände',
            'Use': 'Benutzen',
            'Craft': 'Herstellen',
            'Repair': 'Reparieren',
            'ERROR': 'FEHLER',
            'Error': 'Fehler',
            'You\'ve found a bug! Please reload the page to continue playing.': 'Es ist ein Fehler aufgetreten. Bitte lade die Seite neu, um weiterzuspielen.',
            'If reloading doesn\'t help, you can clear your data and restart the game, but you will lose all your progress.': 'Falls das Neuladen nicht hilft, kannst du die lokalen Daten löschen und das Spiel neu starten. Dabei geht dein Fortschritt verloren.',
            'You can also help the developer by': 'Du kannst dem Entwickler außerdem helfen, indem du',
            'reporting': 'den Fehler meldest',
            'the problem on GitHub.': 'auf GitHub.',
            'reload': 'neu laden',
            'clear data': 'Daten löschen',
            'Warning': 'Warnung',
            'Update': 'Aktualisierung',
            'The game has been updated.': 'Das Spiel wurde aktualisiert.',
            'See the': 'Sieh im',
            'for details.': 'nach weiteren Informationen.',
            'City Update': 'Stadt-Aktualisierung'
        }
    };

    function getLanguage() {
        const settings = GameGlobals.metaState && GameGlobals.metaState.settings;
        return settings && settings.language ? settings.language : 'DE_DE';
    }

    function languageTag(language) {
        if (language === 'EN_GB') return 'en-GB';
        if (language === 'FI_FI') return 'fi-FI';
        return 'de-DE';
    }

    function replaceTrimmed(source, replacement) {
        const trimmed = source.trim();
        return trimmed ? source.replace(trimmed, replacement) : source;
    }

    function translateTextNode(node, dictionary) {
        if (!node || typeof node.nodeValue !== 'string') return;

        const current = node.nodeValue;
        const currentTrimmed = current.trim();
        const savedOriginal = originalText.get(node);

        if (!dictionary) {
            if (!savedOriginal) return;
            const germanTranslation = dictionaries.DE_DE[savedOriginal.trim()];
            if (germanTranslation && currentTrimmed === germanTranslation) {
                node.nodeValue = savedOriginal;
            }
            return;
        }

        if (savedOriginal) {
            const originalTrimmed = savedOriginal.trim();
            const savedTranslation = dictionary[originalTrimmed];
            if (savedTranslation && (currentTrimmed === originalTrimmed || currentTrimmed === savedTranslation)) {
                node.nodeValue = replaceTrimmed(savedOriginal, savedTranslation);
            }
            return;
        }

        const translation = dictionary[currentTrimmed];
        if (!translation) return;
        originalText.set(node, current);
        node.nodeValue = replaceTrimmed(current, translation);
    }

    function shouldSkipElement(element) {
        if (!element || !element.tagName) return false;
        return ['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE'].indexOf(element.tagName) >= 0;
    }

    function applyToRoot(root, dictionary) {
        if (!root || typeof Node === 'undefined') return;
        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root, dictionary);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
        if (root.nodeType === Node.ELEMENT_NODE && shouldSkipElement(root)) return;
        if (typeof document.createTreeWalker !== 'function' || typeof NodeFilter === 'undefined') return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return shouldSkipElement(node.parentElement)
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT;
            }
        });

        let node = walker.nextNode();
        while (node) {
            translateTextNode(node, dictionary);
            node = walker.nextNode();
        }
    }

    function applyDocumentMetadata(language) {
        document.documentElement.lang = languageTag(language);
        document.title = language === 'DE_DE' ? 'Sublevel – Überleben in der Tiefe' : 'Sublevel';

        const description = document.querySelector('meta[name="description"]');
        if (description) {
            description.setAttribute('content', language === 'DE_DE'
                ? 'Ein textbasiertes Science-Fiction-Abenteuer über Überleben, Erkundung und den Wiederaufbau einer gefallenen Zivilisation.'
                : 'A text-based science fiction adventure game.');
        }

        const openGraphTitle = document.querySelector('meta[property="og:title"]');
        if (openGraphTitle) openGraphTitle.setAttribute('content', 'Sublevel');
    }

    function apply() {
        try {
            if (typeof document === 'undefined' || !document.body) return;
            const language = getLanguage();
            const dictionary = dictionaries[language] || null;
            applyDocumentMetadata(language);
            applyToRoot(document.body, dictionary);
        } catch (error) {
            // Static text translation is an enhancement and must never interrupt gameplay.
            if (typeof log !== 'undefined' && log.w) log.w('Locale bootstrap skipped: ' + error);
        }
    }

    function startObserver() {
        if (observer || !document.body || typeof MutationObserver === 'undefined') return;
        observer = new MutationObserver(mutations => {
            try {
                const language = getLanguage();
                const dictionary = dictionaries[language] || null;
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => applyToRoot(node, dictionary));
                });
            } catch (error) {
                if (typeof log !== 'undefined' && log.w) log.w('Locale observer skipped: ' + error);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    const LocaleBootstrap = {
        init: function () {
            const setup = () => {
                apply();
                startObserver();
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setup, { once: true });
            } else {
                setup();
            }

            GlobalSignals.add(this, GlobalSignals.pageSetUpSignal, apply);
            GlobalSignals.add(this, GlobalSignals.settingsChangedSignal, apply);
        },

        apply: apply
    };

    return LocaleBootstrap;
});