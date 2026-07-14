define([
    'ash',
    'text/Text',
    'text/TextBuilder',
    'text/lang/LangEnglish',
    'text/lang/LangGerman',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants'
], function (Ash, Text, TextBuilder, LangEnglish, LangGerman, GameGlobals, GlobalSignals, GameConstants) {

    let TextLoader = Ash.Class.extend({

        defaultLanguage: 'DE_DE',
        languagePreferenceVersion: 2,
        translationVersion: 'sublevel-0.7.2',

        constructor: function () { },

        textSources: {
            default: { language: 'default', source: '/strings/strings.json', name: 'Fallback' },
            DE_DE: { language: 'DE_DE', source: '/strings/strings-de.json', name: 'Deutsch' },
            EN_GB: { language: 'EN_GB', source: '/strings/strings.json', name: 'English' },
            FI_FI: { language: 'FI_FI', source: '/strings/strings-fi.json', name: 'suomi' }
        },

        isSupportedLanguage: function (language) {
            return language !== 'default' && Object.keys(this.textSources).indexOf(language) >= 0;
        },

        getCurrentLanguage: function () {
            GameGlobals.metaState = GameGlobals.metaState || {};
            GameGlobals.metaState.settings = GameGlobals.metaState.settings || {};

            const settings = GameGlobals.metaState.settings;
            const hasCurrentPreference = settings.languagePreferenceVersion === this.languagePreferenceVersion;
            const hasManualPreference = settings.languageManuallySelected === true;
            let language = settings.language;

            // Older saves usually contain EN_GB only because English used to be the technical
            // default. Migrate those saves to German once, but keep a language the player has
            // explicitly selected in the new language menu.
            if (!hasCurrentPreference && !hasManualPreference) {
                language = this.defaultLanguage;
            }

            if (!this.isSupportedLanguage(language)) {
                language = this.defaultLanguage;
            }

            settings.language = language;
            settings.languagePreferenceVersion = this.languagePreferenceVersion;
            return language;
        },

        applyLanguageRules: function (language) {
            const languageRules = language === 'DE_DE' ? LangGerman : LangEnglish;
            Text.language = languageRules;
            TextBuilder.language = languageRules;

            if (typeof document !== 'undefined') {
                const languageTags = {
                    DE_DE: 'de-DE',
                    EN_GB: 'en-GB',
                    FI_FI: 'fi-FI'
                };
                document.documentElement.lang = languageTags[language] || 'de-DE';
            }
        },

        loadTexts: function () {
            const language = this.getCurrentLanguage();
            this.applyLanguageRules(language);

            // Always finish loading the English fallback first. This makes the startup
            // deterministic and guarantees usable text even when an optional locale file
            // is temporarily unavailable on the host.
            return this.loadDefaultTexts()
                .then(() => this.loadCurrentLanguageTexts(language));
        },

        loadDefaultTexts: function () {
            let sys = this;
            return new Promise((resolve, reject) => {
                if (Text.hasDefaultTexts()) {
                    resolve();
                    return;
                }

                sys.loadTextsFile(sys.textSources.default).then(resolve).catch(reject);
            });
        },

        loadCurrentLanguageTexts: function (language) {
            let sys = this;
            language = language || this.getCurrentLanguage();
            this.applyLanguageRules(language);

            return new Promise((resolve, reject) => {
                if (Text.hasCurrentLanguage(language)) {
                    resolve();
                    return;
                }

                if (!sys.isSupportedLanguage(language)) {
                    reject(new Error('Unsupported language: ' + language));
                    return;
                }

                sys.loadTextsFile(sys.textSources[language])
                    .then(resolve)
                    .catch(error => {
                        // A missing locale must never stop Sublevel from starting. The full
                        // English file is already loaded and remains the safe fallback.
                        log.w('Locale file unavailable, using fallback: ' + language);
                        Text.setTexts(language, {});
                        resolve();
                    });
            });
        },

        loadTextsFile: function (source) {
            return new Promise((resolve, reject) => {
                const separator = source.source.indexOf('?') >= 0 ? '&' : '?';
                const url = source.source + separator + 'v=' + this.translationVersion;
                log.i('Loading texts: ' + url, 'text');
                if (GameConstants.isDebugVersion) $.ajaxSetup({ cache: false });
                $.getJSON(url, function (json) {
                    Text.setTexts(source.language, json);
                    resolve();
                })
                .fail(function (jqxhr, textStatus, error) {
                    log.e('Failed to load texts: ' + error);
                    reject(new Error('Failed to load translations: ' + url));
                });
            });
        }

    });

    return TextLoader;
});