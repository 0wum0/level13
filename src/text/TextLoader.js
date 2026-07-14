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
            GameGlobals.metaState.settings = GameGlobals.metaState.settings || {};

            let language = GameGlobals.metaState.settings.language;
            if (!this.isSupportedLanguage(language)) {
                language = this.defaultLanguage;
                GameGlobals.metaState.settings.language = language;
            }

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
            return Promise.all([this.loadDefaultTexts(), this.loadCurrentLanguageTexts(language)]);
        },

        loadDefaultTexts: function () {
            let sys = this;
            return new Promise((resolve) => {
                if (Text.hasDefaultTexts()) {
                    resolve();
                    return;
                }

                resolve(sys.loadTextsFile(sys.textSources.default));
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

                resolve(sys.loadTextsFile(sys.textSources[language]));
            });
        },

        loadTextsFile: function (source) {
            return new Promise((resolve, reject) => {
                const url = source.source;
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
