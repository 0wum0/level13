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
            'Level 13 isn\'t optimized for mobile. The layout works best on larger screens and many elements rely on hover effects. For the best experience, please come back on a different device.': 'Level 13 ist noch nicht vollständig für Mobilgeräte optimiert. Auf größeren Bildschirmen funktioniert die Oberfläche am besten.',
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
            'Repair': 'Reparieren'
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

    function translateTextNode(node, dictionary) {
        if (!originalText.has(node)) originalText.set(node, node.nodeValue);
        const source = originalText.get(node);
        const trimmed = source.trim();
        const translation = dictionary && dictionary[trimmed];
        const nextValue = translation ? source.replace(trimmed, translation) : source;
        if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
    }

    function shouldSkipElement(element) {
        if (!element || !element.tagName) return false;
        return ['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE'].indexOf(element.tagName) >= 0;
    }

    function applyToRoot(root, dictionary) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root, dictionary);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
        if (root.nodeType === Node.ELEMENT_NODE && shouldSkipElement(root)) return;

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
        document.title = language === 'DE_DE' ? 'Level 13 – Überleben in der Stadt' : 'Level 13';

        const description = document.querySelector('meta[name="description"]');
        if (description) {
            description.setAttribute('content', language === 'DE_DE'
                ? 'Ein textbasiertes Science-Fiction-Abenteuer über Überleben, Erkundung und den Wiederaufbau einer gefallenen Zivilisation.'
                : 'A text-based science fiction adventure game.');
        }
    }

    function apply() {
        const language = getLanguage();
        const dictionary = dictionaries[language] || null;
        applyDocumentMetadata(language);
        applyToRoot(document.body, dictionary);
    }

    function startObserver() {
        if (observer || !document.body) return;
        observer = new MutationObserver(mutations => {
            const language = getLanguage();
            const dictionary = dictionaries[language] || null;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => applyToRoot(node, dictionary));
            });
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
