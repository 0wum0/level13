define([
    'module',
    'jquery/jquery-3.7.1.min',
    'core/ConsoleLogger',
    'game/level13',
    'game/constants/GameConstants',
    'game/helpers/WorldHelperStartupPatch',
    'text/Text',
    'text/TextBuilder',
    'text/lang/LangGerman',
    'text/GermanSectorDescription',
    'text/GermanGameplayPatch',
    'text/GermanHardcodedUIPatch',
    'text/LocaleBootstrap',
    'network/SublevelAPI',
    'network/GuardianCommandClient',
    'network/SocketClient'
], function (
    module,
    jQuery,
    ConsoleLogger,
    Level13,
    GameConstants,
    WorldHelperStartupPatch,
    Text,
    TextBuilder,
    LangGerman,
    GermanSectorDescription,
    GermanGameplayPatch,
    GermanHardcodedUIPatch,
    LocaleBootstrap,
    SublevelAPI,
    GuardianCommandClient,
    SocketClient
) {
    'use strict';

    function showStartupError(error) {
        let isEnglish = document.documentElement.lang === 'en-GB';
        let title = isEnglish ? 'Sublevel could not start' : 'Sublevel konnte nicht gestartet werden';
        let message = error && error.message ? error.message : String(error || 'unknown_error');
        let container = document.createElement('div');
        container.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:#03080b;color:#eff8f7;font:16px/1.5 sans-serif;';
        container.innerHTML = '<div style="max-width:620px;padding:28px;border:1px solid #29444a;border-radius:16px;background:#0b171c"><h1 style="margin-top:0">' + title + '</h1><p>' + message + '</p><a href="/login" style="color:#72e1d1">' + (isEnglish ? 'Back to sign in' : 'Zurück zur Anmeldung') + '</a></div>';
        document.body.appendChild(container);
    }

    function SublevelApp() {
        this.initialise = function (config) {
            GameConstants.startTime = new Date().getTime();
            GameConstants.getTimeSinceStart = function () {
                return new Date().getTime() - this.startTime;
            };

            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
            GameConstants.isMobile = isMobileDevice;
            GameConstants.isMobileOverlayShown = isMobileDevice;
            GameConstants.isDebugVersion = config.isDebugVersion;
            GameConstants.isCheatsEnabled = config.isCheatsEnabled;
            GameConstants.isAutosaveEnabled = config.isAutosaveEnabled;
            ConsoleLogger.logInfo = config.isDebugOutputEnabled;

            const isOfficialVersion = GameConstants.isOfficialVersion();
            let errorCount = 0;
            const errorLimit = 10;

            if (config.isTrackingEnabled && isOfficialVersion) {
                try {
                    Sentry.init({
                        dsn: 'https://d29c47d03c8a4b17b9fd914320b105ea@app.glitchtip.com/12081',
                        tracesSampleRate: 0.01,
                        environment: config.isDebugVersion ? 'development' : 'production',
                        release: 'sublevel-' + config.version,
                        beforeSend: function (event) {
                            errorCount++;
                            if (errorCount > errorLimit) return null;
                            return event;
                        }
                    });
                } catch (error) {
                    log.w('error tracking not initialized');
                }
            }

            Text.isDebugMode = config.isDebugVersion;
            Text.language = LangGerman;
            TextBuilder.isDebugMode = config.isDebugVersion;
            TextBuilder.language = LangGerman;

            WorldHelperStartupPatch.apply();
            GermanSectorDescription.apply();
            GermanGameplayPatch.apply();
            GermanHardcodedUIPatch.apply();
            LocaleBootstrap.init();

            SublevelAPI.bootstrap()
                .then(function () {
                    SocketClient.init();
                    const sublevel = new Level13(config.plugins);
                    GuardianCommandClient.init();
                    if (GameConstants.isCheatsEnabled) window.app = sublevel;
                })
                .catch(showStartupError);
        };
    }

    new SublevelApp().initialise(module.config());
});
