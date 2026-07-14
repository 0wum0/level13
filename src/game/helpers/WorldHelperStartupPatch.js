define([
    'game/helpers/WorldHelper',
    'game/constants/WorldConstants'
], function (WorldHelper, WorldConstants) {
    'use strict';

    let applied = false;

    function getEmptyResult(worldVO, worldTemplateVO) {
        return {
            changes: [],
            worldGeneratorVersion: WorldConstants.version,
            worldVersion: worldVO && worldVO.version ? worldVO.version : null,
            worldTemplateVersion: worldTemplateVO && worldTemplateVO.version ? worldTemplateVO.version : null
        };
    }

    return {
        apply: function () {
            if (applied) return;
            applied = true;

            const originalDetectWorldChanges = WorldHelper.prototype.detectWorldChanges;

            WorldHelper.prototype.detectWorldChanges = function (worldVO, worldTemplateVO, levels) {
                const emptyResult = getEmptyResult(worldVO, worldTemplateVO);

                // Saves from older builds can contain a seed and entities without a valid
                // world template. That is a recoverable migration state, not a fatal error.
                if (!worldVO || !worldTemplateVO) {
                    if (typeof log !== 'undefined' && log.w) {
                        log.w('Skipping world change detection: no compatible saved world template.');
                    }
                    return emptyResult;
                }

                try {
                    return originalDetectWorldChanges.call(this, worldVO, worldTemplateVO, levels) || emptyResult;
                } catch (error) {
                    // World comparison is informational. A malformed legacy template must
                    // never prevent the generated world and the save from loading.
                    if (typeof log !== 'undefined' && log.w) {
                        log.w('Skipping world change detection after recoverable error: ' + error);
                    }
                    return emptyResult;
                }
            };
        }
    };
});