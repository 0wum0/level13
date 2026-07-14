define([
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/constants/ItemConstants',
    'network/SublevelAPI'
], function (GameGlobals, GlobalSignals, GameConstants, ItemConstants, SublevelAPI) {
    'use strict';

    let started = false;

    function isReady() {
        return Boolean(
            GameGlobals.playerActionFunctions
            && GameGlobals.playerActionFunctions.playerStatsNodes
            && GameGlobals.playerActionFunctions.playerStatsNodes.head
            && GameGlobals.playerActionFunctions.playerResourcesNodes
            && GameGlobals.playerActionFunctions.playerResourcesNodes.head
        );
    }

    function language() {
        let user = SublevelAPI.getUser();
        return user && user.language === 'EN_GB' ? 'EN_GB' : 'DE_DE';
    }

    function applyGrantItem(payload) {
        let itemID = String(payload.itemId || '');
        let amount = Math.max(1, Math.min(100, Number(payload.amount || 1)));
        let level = Math.max(1, Math.min(100, Number(payload.level || 50)));
        let items = GameGlobals.playerActionFunctions.playerStatsNodes.head.items;
        let carried = !GameGlobals.playerHelper.isInCamp();
        let added = 0;
        for (let i = 0; i < amount; i++) {
            let item = ItemConstants.getNewItemInstanceByID(itemID, level, true);
            if (!item) throw new Error('Unknown item: ' + itemID);
            items.addItem(item, carried);
            added++;
        }
        return added + ' × ' + itemID;
    }

    function applyGrantResource(payload) {
        let resource = String(payload.resource || '');
        let amount = Math.max(1, Math.min(1000000, Number(payload.amount || 1)));
        let resourcesNode = GameGlobals.playerActionFunctions.playerResourcesNodes.head;
        if (resource === 'currency') {
            resourcesNode.currency.currency += amount;
        } else {
            resourcesNode.resources.addResource(resource, amount);
        }
        return amount + ' × ' + resource;
    }

    function applyMessage(payload) {
        let isEnglish = language() === 'EN_GB';
        let message = isEnglish ? payload.messageEn : payload.messageDe;
        message = message || payload.messageDe || payload.messageEn || '';
        let title = isEnglish ? 'Guardian message' : 'Nachricht des Wächters';
        if (GameGlobals.uiFunctions && GameGlobals.uiFunctions.showInfoPopup) {
            GameGlobals.uiFunctions.showInfoPopup(title, String(message), isEnglish ? 'Continue' : 'Weiter', null, null, true, true);
        }
        return 'message_shown';
    }

    function saveAfterCommand() {
        if (GlobalSignals.updateButtonsSignal) GlobalSignals.updateButtonsSignal.dispatch();
        if (GlobalSignals.saveGameSignal) GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, true);
    }

    function applyCommand(command) {
        let result;
        switch (command.type) {
            case 'grant_item': result = applyGrantItem(command.payload || {}); break;
            case 'grant_resource': result = applyGrantResource(command.payload || {}); break;
            case 'message': result = applyMessage(command.payload || {}); break;
            case 'force_save': result = 'save_requested'; break;
            default: throw new Error('Unsupported command: ' + command.type);
        }
        saveAfterCommand();
        return result;
    }

    function processCommands() {
        let commands = SublevelAPI.getCommands();
        let chain = Promise.resolve();
        commands.forEach(function (command) {
            chain = chain.then(function () {
                try {
                    let result = applyCommand(command);
                    return SublevelAPI.completeCommand(command.id, true, result);
                } catch (error) {
                    return SublevelAPI.completeCommand(command.id, false, error.message || String(error));
                }
            });
        });
        return chain;
    }

    function waitUntilReady(tries) {
        tries = tries || 0;
        if (isReady()) {
            processCommands();
            return;
        }
        if (tries >= 120) return;
        setTimeout(function () { waitUntilReady(tries + 1); }, 500);
    }

    return {
        init: function () {
            if (started) return;
            started = true;
            waitUntilReady(0);
        }
    };
});
