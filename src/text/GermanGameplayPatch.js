define([
    'text/Text',
    'game/GameGlobals',
    'game/constants/WorldConstants',
    'game/constants/TextConstants',
    'game/systems/ui/UIOutLevelSystem'
], function (Text, GameGlobals, WorldConstants, TextConstants, UIOutLevelSystem) {
    'use strict';

    let applied = false;

    function isGerman() {
        return Text.currentLanguage === 'DE_DE' || document.documentElement.lang === 'de-DE';
    }

    const exact = new Map([
        ['Unknown', 'noch unbekannt'],
        ['None', 'keine'],
        ['Some ingredient', 'eine noch unbekannte Zutat'],
        ['refinery', 'Raffinerie'],
        ['plantation', 'Plantage'],
        ['workshop', 'Werkstatt'],
        ['small camp', 'kleines Lager'],
        ['camp', 'Lager'],
        ['fairly harmless', 'weitgehend harmlos'],
        ['slightly unnerving', 'leicht beunruhigend'],
        ['intimidating', 'einschüchternd'],
        ['risky', 'riskant'],
        ['dangerous', 'gefährlich'],
        ['very dangerous', 'sehr gefährlich'],
        ['deadly', 'tödlich'],
        ['water', 'Wasser'],
        ['safety', 'Sicherheit'],
        ['clinic', 'Klinik'],
        ['hazard', 'Gefahr'],
        ['trade', 'Handel'],
        ['passage', 'Durchgang'],
        ['safe', 'sicher'],
        ['Bridge gap', 'Lücke überbrücken'],
        ['Clear waste', 'Abfall beseitigen'],
        ['Pay toll', 'Wegzoll bezahlen'],
        ['bridged', 'überbrückt'],
        ['cleared', 'beseitigt'],
        ['defeated', 'besiegt'],
        ['paid', 'bezahlt']
    ]);

    const htmlReplacements = [
        [/There is no (<span[^>]*>light<\/span>)\.?/gi, 'Es gibt kein $1.'],
        [/The area is swathed in relentless (<span[^>]*>daylight<\/span>)\.?/gi, 'Der Bereich liegt in unerbittlichem $1.'],
        [/The area is swathed in blinding (<span[^>]*>sunlight<\/span>)\.?/gi, 'Blendendes $1 überstrahlt den Bereich.'],
        [/The area is illuminated by (<span[^>]*>indirect sunlight<\/span>) from a nearby sector\.?/gi, 'Der Bereich wird durch $1 aus einem benachbarten Sektor erhellt.'],
        [/The glowstick fades out\.?/gi, 'Der Leuchtstab erlischt.'],
        [/A glowstick casts a sickly (<span[^>]*>light<\/span>)\.?/gi, 'Ein Leuchtstab verbreitet ein kränkliches $1.'],
        [/There is a graffiti here:/gi, 'Hier befindet sich ein Graffiti:'],
        [/ is located here\./gi, ' befindet sich hier.'],
        [/The area to the ([^<.]+) has collapsed\./gi, 'Der Bereich im $1 ist eingestürzt.'],
        [/The area is lit by a nearby sunwell\./gi, 'Ein nahe gelegener Lichtschacht erhellt den Bereich.'],
        [/A mountain interrupts the City to the ([^.<]+)\.?/gi, 'Im $1 unterbricht ein Berg die Stadt.'],
        [/The area is dominated by a massive concrete pillar, one of the great spines of the City\./gi, 'Ein gewaltiger Betonpfeiler, eines der großen Stützgerüste der Stadt, beherrscht den Bereich.'],
        [/The area is crossed by train tracks\./gi, 'Bahngleise durchqueren den Bereich.'],
        [/There is a (<span[^>]*>[^<]+<\/span>) here\./gi, 'Hier befindet sich $1.'],
        [/Both (<span[^>]*>water<\/span>) and (<span[^>]*>food<\/span>) can be collected here\./gi, 'Hier können sowohl $1 als auch $2 gesammelt werden.'],
        [/It looks like (<span[^>]*>rainwater<\/span>) could be collected here\./gi, 'Hier könnte $1 gesammelt werden.'],
        [/There is a bit of (<span[^>]*>water<\/span>) leaking here that could be collected\./gi, 'Hier tritt etwas $1 aus, das gesammelt werden könnte.'],
        [/It might be worthwhile to install (<span[^>]*>traps<\/span>) here\./gi, 'Es könnte sich lohnen, hier $1 aufzustellen.'],
        [/There is (.+?), but it has been picked clean\./gi, '$1 befindet sich hier, wurde aber bereits vollständig geplündert.'],
        [/There is (.+?), which can be scavenged for (.+?)\./gi, '$1 befindet sich hier und kann nach $2 durchsucht werden.'],
        [/There is a source of (<span[^>]*>.+?<\/span>) here\./gi, 'Hier befindet sich eine Quelle für $1.'],
        [/There is space here for a bigger building project\./gi, 'Hier ist Platz für ein größeres Bauprojekt.'],
        [/There is (<span[^>]*>.+?<\/span>) here \((cleared for use|not cleared)\)\./gi, function (_, name, state) {
            return name + ' befindet sich hier (' + (state === 'cleared for use' ? 'zur Nutzung freigeräumt' : 'noch nicht freigeräumt') + ').';
        }],
        [/This would be a good place for a (<span[^>]*>camp<\/span>)\./gi, 'Dies wäre ein guter Ort für ein $1.'],
        [/Some gangsters are lounging about\. They want you to pay for passage\./gi, 'Einige Gangmitglieder versperren den Weg und verlangen einen Wegzoll.'],
        [/Toll gate/gi, 'Wegzoll'],
        [/examine /gi, 'untersuchen: '],
        [/scout /gi, 'erkunden: '],
        [/scavenge /gi, 'durchsuchen: '],
        [/indirect sunlight/gi, 'indirektes Sonnenlicht'],
        [/daylight/gi, 'Tageslicht'],
        [/sunlight/gi, 'Sonnenlicht'],
        [/light/gi, 'Licht'],
        [/water/gi, 'Wasser'],
        [/food/gi, 'Nahrung'],
        [/rainwater/gi, 'Regenwasser'],
        [/traps/gi, 'Fallen'],
        [/greenhouse/gi, 'Gewächshaus']
    ];

    function translateHtml(value) {
        if (!isGerman() || value == null) return value;
        let result = String(value);
        for (const [pattern, replacement] of htmlReplacements) {
            result = result.replace(pattern, replacement);
        }
        return result;
    }

    function wrapHtmlMethod(target, methodName) {
        const original = target && target[methodName];
        if (typeof original !== 'function') return;
        target[methodName] = function () {
            return translateHtml(original.apply(this, arguments));
        };
    }

    function translateResourceList(discoveredResources, knownResources, resourcesScavengable) {
        const result = [];
        for (const key in resourceNames) {
            const name = resourceNames[key];
            const amount = resourcesScavengable.getResource(name);
            if (amount <= 0) continue;

            const displayName = Text.t('game.resources.' + name + '_name');
            if (discoveredResources.indexOf(name) >= 0) {
                let amountDescription = 'selten';
                if (amount === WorldConstants.resourcePrevalence.DEFAULT) amountDescription = 'knapp';
                if (amount === WorldConstants.resourcePrevalence.COMMON) amountDescription = 'häufig';
                if (amount === WorldConstants.resourcePrevalence.ABUNDANT) amountDescription = 'reichlich';
                result.push(displayName + ' (' + amountDescription + ')');
            } else if (knownResources.indexOf(name) >= 0) {
                result.push(displayName + ' (Menge noch unbekannt)');
            }
        }
        if (result.length > 0) return result.join(', ');
        return resourcesScavengable.getTotal() > 0 ? 'noch unbekannt' : 'keine';
    }

    return {
        apply: function () {
            if (applied) return;
            applied = true;

            const originalSetCurrentTexts = Text.setCurrentTexts;
            Text.setCurrentTexts = function (language, json) {
                originalSetCurrentTexts.call(this, language, json);
                if (language === 'DE_DE') {
                    this.currentTexts['ui.common.value_unknown'] = 'noch unbekannt';
                    this.currentTexts['ui.common.list_template_zero'] = '(keine)';
                }
            };

            const originalResources = TextConstants.getScaResourcesString;
            TextConstants.getScaResourcesString = function (discoveredResources, knownResources, resourcesScavengable) {
                return isGerman()
                    ? translateResourceList(discoveredResources, knownResources, resourcesScavengable)
                    : originalResources.apply(this, arguments);
            };

            const originalItems = TextConstants.getScaItemString;
            TextConstants.getScaItemString = function () {
                const value = originalItems.apply(this, arguments);
                if (!isGerman()) return value;
                return exact.get(value) || translateHtml(value);
            };

            ['getWorkshopName', 'getCampTerm', 'getFightChancesText', 'getMovementBlockerAction', 'getUnblockedVerb', 'getWaymarkTargetName', 'getLevelFeatureName'].forEach(methodName => {
                const original = TextConstants[methodName];
                if (typeof original !== 'function') return;
                TextConstants[methodName] = function () {
                    const value = original.apply(this, arguments);
                    if (!isGerman()) return value;
                    return exact.get(value) || translateHtml(value);
                };
            });

            const proto = UIOutLevelSystem.prototype;
            [
                'getTextureDescription',
                'getFunctionalDescription',
                'getStatusDescription',
                'getMovementDescription',
                'getDangerDescription',
                'getLevelFeatureDescription',
                'getWaymarkText'
            ].forEach(methodName => wrapHtmlMethod(proto, methodName));

            const originalUpdateActions = proto.updateLevelPageActions;
            if (typeof originalUpdateActions === 'function') {
                proto.updateLevelPageActions = function () {
                    const result = originalUpdateActions.apply(this, arguments);
                    if (isGerman()) {
                        $('#container-tab-two-out-actions .btn-label, #out-locales .btn-label').each(function () {
                            const $element = $(this);
                            $element.html(translateHtml($element.html()));
                        });
                    }
                    return result;
                };
            }

            const originalTollGate = proto.showTollGatePopup;
            if (typeof originalTollGate === 'function') {
                proto.showTollGatePopup = function (direction) {
                    if (!isGerman()) return originalTollGate.call(this, direction);
                    const action = 'clear_gate_' + direction;
                    GameGlobals.uiFunctions.showActionPopup(
                        action,
                        'Wegzoll',
                        'Einige Gangmitglieder versperren den Weg und verlangen einen Wegzoll.'
                    );
                };
            }
        }
    };
});