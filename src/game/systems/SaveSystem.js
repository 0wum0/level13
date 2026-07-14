define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'lzstring/lz-string',
    'game/nodes/common/SaveNode',
    'network/SocketClient'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, LZString, SaveNode, SocketClient) {
    var SaveSystem = Ash.System.extend({

        engine: null,
        saveNodes: null,
        pendingManualSaves: [],
        pendingAutosaves: [],
        lastDefaultSaveTimestamp: 0,
        autoSaveFrequency: 1000 * 60 * 2,
        error: null,

        constructor: function () {},

        addToEngine: function (engine) {
            this.engine = engine;
            this.saveNodes = engine.getNodeList(SaveNode);
            this.lastDefaultSaveTimestamp = new Date().getTime();
            GlobalSignals.add(this, GlobalSignals.saveGameSignal, this.onSaveGameSignal);
            GlobalSignals.add(this, GlobalSignals.restartGameSignal, this.onRestart);
        },

        removeFromEngine: function () {
            GlobalSignals.removeAll(this);
            this.engine = null;
            this.saveNodes = null;
        },

        update: function () {
            if (this.paused) return;
            if (GameGlobals.gameState.isLaunched) return;

            if (this.pendingManualSaves.length > 0) {
                for (let i = 0; i < this.pendingManualSaves.length; i++) {
                    this.save(this.pendingManualSaves[i], true);
                }
                this.pendingManualSaves = [];
                return;
            }

            if (!GameConstants.isAutosaveEnabled) return;

            if (this.pendingAutosaves.length > 0) {
                for (let i = 0; i < this.pendingAutosaves.length; i++) {
                    this.save(this.pendingAutosaves[i], false);
                }
                this.pendingAutosaves = [];
                return;
            }

            const timeStamp = new Date().getTime();
            if (timeStamp - this.lastDefaultSaveTimestamp > this.autoSaveFrequency) {
                this.save(GameConstants.SAVE_SLOT_DEFAULT, false);
            }
        },

        pause: function () {
            this.paused = true;
        },

        resume: function () {
            this.paused = false;
        },

        save: function (slotID, isPlayerInitiated) {
            slotID = slotID || GameConstants.SAVE_SLOT_DEFAULT;
            isPlayerInitiated = isPlayerInitiated || false;
            const isDefaultSlot = slotID == GameConstants.SAVE_SLOT_DEFAULT;

            if (!isPlayerInitiated) {
                if (isDefaultSlot && this.paused) return;
                if (isDefaultSlot && !GameConstants.isAutosaveEnabled) return;
                if (GameGlobals.gameState.isLaunchStarted || GameGlobals.gameState.isLaunched || GameGlobals.gameState.isLaunchCompleted || GameGlobals.gameState.isFinished) return;
            }

            const data = this.getCompressedSaveJSON();
            const success = this.saveDataToSlot(slotID, data);
            this.saveMetaState();

            if (isDefaultSlot) {
                this.error = success ? null : 'Failed to save';
                this.lastDefaultSaveTimestamp = new Date().getTime();
                if (success) SocketClient.pushSave(data);
            }
        },

        saveDataToDefaultSlot: function (data) {
            return this.saveDataToSlot(GameConstants.SAVE_SLOT_DEFAULT, data);
        },

        saveDataToSlot: function (slotID, data) {
            if (!data) return;
            if (typeof(Storage) === 'undefined') {
                log.w('Could not save to save slot [' + slotID + ']: Storage not found');
                return false;
            }

            try {
                const storageKeys = this.getStorageKeysForSaveSlotID(slotID);
                for (let i = 0; i < storageKeys.length; i++) {
                    localStorage.setItem(storageKeys[i], data);
                }
                log.i('Saved to slot [' + slotID + ']');
                return true;
            } catch (ex) {
                log.w('Could not save to save slot [' + slotID + ']: Exception: ' + ex);
                return false;
            }
        },

        saveMetaState: function () {
            if (typeof(Storage) === 'undefined') {
                log.w('Could not save meta state: Storage not found');
                return false;
            }

            const data = this.getCompressedMetaStateJSON();
            try {
                localStorage.setItem('meta-state', data);
                log.i('Saved meta state');
                return true;
            } catch (ex) {
                log.w('Could not save meta state: Exception: ' + ex);
                return false;
            }
        },

        getMetaStateData: function () {
            return localStorage.getItem('meta-state') || {};
        },

        getDataFromSlot: function (slotID) {
            const storageKeys = this.getStorageKeysForSaveSlotID(slotID);
            for (let i = 0; i < storageKeys.length; i++) {
                const data = localStorage.getItem(storageKeys[i]);
                if (data) return data;
            }
            return null;
        },

        clearSlot: function (slotID) {
            if (typeof(Storage) === 'undefined') return;
            const storageKeys = this.getStorageKeysForSaveSlotID(slotID);
            for (let i = 0; i < storageKeys.length; i++) {
                localStorage.removeItem(storageKeys[i]);
            }
            log.i('Cleared save slot [' + slotID + ']');
        },

        getSaveJSON: function () {
            const version = GameGlobals.changeLogHelper.getCurrentVersionNumber();
            const entitiesObject = {};
            let entityObject;
            let nodes = 0;

            for (let node = this.saveNodes.head; node; node = node.next) {
                entityObject = this.getEntitySaveObject(node);
                if (entityObject && Object.keys(entityObject).length > 0) {
                    nodes++;
                    entitiesObject[node.save.entityKey] = entityObject;
                }
            }

            const save = {};
            save.entitiesObject = entitiesObject;
            save.gameState = GameGlobals.gameState;
            save.worldState = {};
            Object.assign(save.worldState, GameGlobals.worldState);
            save.worldState.worldTemplateVO = GameGlobals.worldState.worldTemplateVO.getCustomSaveObject();
            save.timeStamp = new Date();
            save.version = version;

            return this.getSaveJSONForObject(save, 'save');
        },

        getSaveJSONForObject: function (saveObject, objectName) {
            try {
                return JSON.stringify(saveObject);
            } catch (error) {
                log.e('Error stringifying save object [' + objectName + ']: ' + error);
                return null;
            }
        },

        getEntitySaveObject: function (node) {
            const entityObject = {};
            let biggestComponent = null;
            let biggestComponentSize = 0;
            let totalSize = 0;

            for (let i = 0; i < node.save.components.length; i++) {
                const componentType = node.save.components[i];
                const component = node.entity.get(componentType);
                if (!component) continue;

                const componentKey = component.getSaveKey ? component.getSaveKey() : componentType;
                let saveObject = component;
                if (component.getCustomSaveObject) saveObject = component.getCustomSaveObject();
                if (saveObject) entityObject[componentKey] = saveObject;

                const saveString = this.getSaveJSONForObject(saveObject, 'component:' + componentKey) || '{}';
                const size = saveString.length;
                if (size > biggestComponentSize) {
                    biggestComponent = saveObject;
                    biggestComponentSize = size;
                }
                totalSize += size;
            }

            return entityObject;
        },

        getSaveJSONfromCompressed: function (compressed) {
            return LZString.decompressFromBase64(compressed);
        },

        getCompressedSaveJSON: function (json) {
            json = json || this.getSaveJSON();
            return LZString.compressToBase64(json);
        },

        getMetaStateJSON: function () {
            return this.getSaveJSONForObject(GameGlobals.metaState, 'meta-state');
        },

        getCompressedMetaStateJSON: function () {
            return LZString.compressToBase64(this.getMetaStateJSON());
        },

        getStorageKeysForSaveSlotID: function (slotID) {
            const result = ['save-' + slotID];
            if (slotID == GameConstants.SAVE_SLOT_DEFAULT) result.push('save');
            return result;
        },

        onSaveGameSignal: function (slotID, isPlayerInitiated) {
            slotID = slotID || GameConstants.SAVE_SLOT_DEFAULT;
            if (isPlayerInitiated && this.pendingManualSaves.indexOf(slotID) < 0) {
                this.pendingManualSaves.push(slotID);
            }
            if (!isPlayerInitiated && this.pendingAutosaves.indexOf(slotID) < 0) {
                this.pendingAutosaves.push(slotID);
            }
        },

        onRestart: function (resetSave) {
            if (!resetSave) return;
            this.clearSlot(GameConstants.SAVE_SLOT_DEFAULT);
        }

    });

    return SaveSystem;
});
