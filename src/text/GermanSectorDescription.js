define([
    'text/Text',
    'game/constants/TextConstants'
], function (Text, TextConstants) {
    'use strict';

    let applied = false;

    const sectorTypes = {
        residential: 'Wohnbereich',
        industrial: 'Industriegebiet',
        maintenance: 'Wartungsbereich',
        commercial: 'Geschäftsviertel',
        public: 'öffentlicher Bereich',
        slum: 'Slumviertel',
        empty: 'unbebauter Bereich'
    };

    const styles = {
        cittadinian: 'historisch und verwinkelt',
        humanist: 'funktional und streng geplant',
        industrial: 'massiv und zweckmäßig',
        karboque: 'symmetrisch und monumental',
        kievan: 'ornamentreich und ungewöhnlich',
        modern: 'futuristisch und glatt',
        'neo-western': 'organisch und dekorativ',
        'neo-westerm': 'organisch und dekorativ',
        western: 'weitläufig und traditionell',
        'slum-general': 'improvisiert und dicht bebaut',
        'slum-hun': 'improvisiert und individuell gestaltet'
    };

    function isGerman() {
        return Text.currentLanguage === 'DE_DE' || document.documentElement.lang === 'de-DE';
    }

    function deterministicPick(values, features, offset) {
        if (!values || values.length === 0) return '';
        const seed = Math.abs(
            Number(features.level || 0) * 31
            + Number(features.sectorX || 0) * 17
            + Number(features.sectorY || 0) * 13
            + Number(features.buildingDensity || 0) * 7
            + Number(offset || 0)
        );
        return values[seed % values.length];
    }

    function addSentence(sentences, text) {
        if (!text) return;
        const normalized = String(text).trim();
        if (!normalized) return;
        sentences.push(/[.!?]$/.test(normalized) ? normalized : normalized + '.');
    }

    function getBaseDescription(features) {
        const type = sectorTypes[features.sectorType] || 'Sektor';
        const style = styles[features.sectorStyle];
        const density = Number(features.buildingDensity || 0);
        const variants = [];

        if (density >= 8) {
            variants.push(`Ein äußerst dicht bebauter ${type} mit engen Korridoren und übereinanderliegenden Bauwerken`);
            variants.push(`Ein verschachtelter ${type}, in dem kaum Platz zwischen den Gebäuden bleibt`);
        } else if (density >= 5) {
            variants.push(`Ein dicht bebauter ${type} mit langen Durchgängen zwischen hohen Gebäuden`);
            variants.push(`Ein ausgedehnter ${type}, dessen Straßen von großen Gebäudekomplexen begrenzt werden`);
        } else if (density >= 2) {
            variants.push(`Ein teilweise offener ${type} zwischen einzelnen Gebäudekomplexen`);
            variants.push(`Ein weitläufiger ${type} mit Straßen, Plätzen und verstreuten Gebäuden`);
        } else {
            variants.push(`Ein ungewöhnlich offener ${type} mit nur wenigen Bauwerken`);
            variants.push(`Eine große freie Fläche innerhalb eines ${type}s`);
        }

        let result = deterministicPick(variants, features, 1);
        if (style) result += `; die Architektur wirkt ${style}`;
        return result;
    }

    function buildDescription(hasVision, features) {
        const sentences = [];
        addSentence(sentences, getBaseDescription(features));

        const sunlit = Number(features.sunlit || 0);
        if (sunlit >= 1) {
            addSentence(sentences, hasVision
                ? 'Helles Tageslicht fällt unbarmherzig auf die Umgebung'
                : 'Blendendes Sonnenlicht überstrahlt jedes Detail');
        } else if (sunlit > 0) {
            addSentence(sentences, 'Indirektes Sonnenlicht aus einem benachbarten Sektor erhellt die Umgebung schwach');
        } else if (!hasVision) {
            addSentence(sentences, 'Der Sektor liegt tief im Inneren der Stadt und ist vollständig in Dunkelheit gehüllt');
        } else {
            addSentence(sentences, 'Künstliches Licht macht Teile der dunklen Umgebung sichtbar');
        }

        const wear = Number(features.wear || 0);
        const damage = Number(features.damage || 0);
        if (damage >= 7) {
            addSentence(sentences, 'Die meisten Bauwerke sind zerstört; Trümmer und freiliegende Stahlteile versperren die Sicht');
        } else if (damage >= 3) {
            addSentence(sentences, 'Viele Gebäude sind schwer beschädigt und nur noch teilweise erhalten');
        } else if (wear >= 8) {
            addSentence(sentences, 'Alles wirkt seit langer Zeit verlassen, verwittert und dem langsamen Verfall überlassen');
        } else if (wear >= 5) {
            addSentence(sentences, 'Abgenutzte Oberflächen und verlassene Räume zeugen vom langen Niedergang der Stadt');
        } else if (wear <= 3) {
            addSentence(sentences, 'Erstaunlich viele Strukturen sind noch gut erhalten');
        }

        if (Number(features.debris || 0) > 0) {
            addSentence(sentences, 'Schutt und Trümmer erschweren das Vorankommen');
        }
        if (Number(features.flooded || 0) > 0) {
            addSentence(sentences, 'Trübes Wasser bedeckt Teile des Bodens, während irgendwo Tropfen durch die Gänge hallen');
        }
        if (Number(features.poison || 0) > 0) {
            addSentence(sentences, 'Ein beißender Geruch deutet auf gefährliche Verschmutzung hin');
        }
        if (Number(features.radiation || 0) > 0) {
            addSentence(sentences, 'Die unnatürliche Stille und seltsame Verfärbungen lassen eine Strahlenbelastung vermuten');
        }
        if (Number(features.cold || 0) > 0) {
            addSentence(sentences, 'Ein kalter Luftzug zieht durch den gesamten Bereich');
        }
        if (Number(features.territory || 0) > 0) {
            addSentence(sentences, 'Markierungen und Barrikaden zeigen, dass eine feindliche Gruppe dieses Gebiet beansprucht');
        }

        if (features.hasEnemies || (features.enemyTags && features.enemyTags.length > 0)) {
            addSentence(sentences, 'Geräusche und frische Spuren verraten, dass der Sektor nicht unbewohnt ist');
        } else if (Number(features.activity || 0) >= 8) {
            addSentence(sentences, 'Frische Spuren lassen auf kürzliche menschliche Aktivität schließen');
        } else if (Number(features.activity || 0) <= 3) {
            addSentence(sentences, 'Nichts deutet darauf hin, dass sich hier in letzter Zeit jemand aufgehalten hat');
        }

        if (features.hasGrove) {
            addSentence(sentences, 'Zwischen den Ruinen wächst ein ungewöhnlich lebendiger Hain, der trotz seiner Fremdartigkeit friedlich wirkt');
        }

        return sentences.join(' ');
    }

    function buildHeader(hasVision, features) {
        if (features.hasCamp) return 'Sektor mit Lager';
        if (features.hasGrove) return 'Verwilderter Park';
        if (!hasVision) return features.sunlit ? 'Lichtdurchfluteter Sektor' : 'Dunkler Sektor';
        return sectorTypes[features.sectorType] || 'Sektor';
    }

    return {
        apply: function () {
            if (applied) return;
            applied = true;

            const originalDescription = TextConstants.getSectorDescription;
            const originalHeader = TextConstants.getSectorHeader;
            const originalName = TextConstants.getSectorName;

            TextConstants.getSectorDescription = function (hasVision, features) {
                return isGerman() ? buildDescription(hasVision, features || {}) : originalDescription.call(this, hasVision, features);
            };

            TextConstants.getSectorHeader = function (hasVision, features) {
                return isGerman() ? buildHeader(hasVision, features || {}) : originalHeader.call(this, hasVision, features);
            };

            TextConstants.getSectorName = function (isScouted, features) {
                return isGerman() ? buildHeader(Boolean(isScouted), features || {}) : originalName.call(this, isScouted, features);
            };
        }
    };
});