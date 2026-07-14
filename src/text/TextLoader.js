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
        translationVersion: 'sublevel-0.7.4',

        constructor: function () { },

        textSources: {
            default: { language: 'default', sources: ['/strings/strings.json'], name: 'Fallback' },
            DE_DE: {
                language: 'DE_DE',
                name: 'Deutsch',
                sources: [
                    '/strings/strings-de.json',
                    '/strings/de/game.json',
                    '/strings/de/story.json',
                    '/strings/de/ui.json'
                ]
            },
            EN_GB: { language: 'EN_GB', sources: ['/strings/strings.json'], name: 'English' },
            FI_FI: { language: 'FI_FI', sources: ['/strings/strings-fi.json'], name: 'suomi' }
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
            return this.loadDefaultTexts()
                .then(() => this.loadCurrentLanguageTexts(language));
        },

        loadDefaultTexts: function () {
            if (Text.hasDefaultTexts()) return Promise.resolve();
            return this.loadTextsSource(this.textSources.default);
        },

        loadCurrentLanguageTexts: function (language) {
            language = language || this.getCurrentLanguage();
            this.applyLanguageRules(language);

            if (Text.hasCurrentLanguage(language)) return Promise.resolve();
            if (!this.isSupportedLanguage(language)) {
                return Promise.reject(new Error('Unsupported language: ' + language));
            }

            return this.loadTextsSource(this.textSources[language])
                .catch(error => {
                    log.w('Locale files unavailable, using fallback: ' + language);
                    Text.setTexts(language, {});
                });
        },

        mergeDeep: function (target, source) {
            if (!source || typeof source !== 'object') return target;
            for (const key of Object.keys(source)) {
                const value = source[key];
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    target[key] = this.mergeDeep(target[key] || {}, value);
                } else {
                    target[key] = value;
                }
            }
            return target;
        },

        loadTextsSource: function (source) {
            const urls = source.sources || (source.source ? [source.source] : []);
            const merged = {};
            let chain = Promise.resolve();

            urls.forEach(url => {
                chain = chain.then(() => this.loadJSON(url))
                    .then(json => this.mergeDeep(merged, json));
            });

            return chain.then(() => {
                Text.setTexts(source.language, merged);
            });
        },

        loadJSON: function (source) {
            return new Promise((resolve, reject) => {
                const separator = source.indexOf('?') >= 0 ? '&' : '?';
                const url = source + separator + 'v=' + this.translationVersion;
                log.i('Loading texts: ' + url, 'text');
                if (GameConstants.isDebugVersion) $.ajaxSetup({ cache: false });
                $.getJSON(url, resolve)
                    .fail(function (jqxhr, textStatus, error) {
                        log.e('Failed to load translations: ' + url + ' (' + error + ')');
                        reject(new Error('Failed to load translations: ' + url));
                    });
            });
        }

    });

    return TextLoader;
});