define(function () {
    'use strict';

    return {
        getIndefiniteArticle: function (word) {
            if (!word) return 'ein';

            const normalized = String(word).replaceAll('|', '').trim().toLowerCase();
            const feminineEndings = ['ung', 'heit', 'keit', 'schaft', 'ion', 'tät', 'ik', 'ei', 'ur'];
            const isFeminine = feminineEndings.some(ending => normalized.endsWith(ending));

            return isFeminine ? 'eine' : 'ein';
        }
    };
});
