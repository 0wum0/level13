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
    SocketClient
) {
    'use strict';

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

            // Install migration and localization guards before asynchronous game setup.
            WorldHelperStartupPatch.apply();
            GermanSectorDescription.apply();
            GermanGameplayPatch.apply();
            GermanHardcodedUIPatch.apply();
            LocaleBootstrap.init();
            SocketClient.init();

            const sublevel = new Level13(config.plugins);

            if (GameConstants.isCheatsEnabled) {
                window.app = sublevel;
            }
        };

    }

    new SublevelApp().initialise(module.config());
});