define(function () {
    'use strict';

    let bootstrapPromise = null;
    let bootstrapData = null;
    let csrfToken = null;
    let saveRevision = 0;

    function request(url, options) {
        options = options || {};
        options.credentials = 'same-origin';
        options.headers = options.headers || {};
        if (options.body !== undefined) options.headers['Content-Type'] = 'application/json';
        if (csrfToken && options.method && options.method !== 'GET') {
            options.headers['X-Sublevel-CSRF'] = csrfToken;
        }
        return fetch(url, options).then(function (response) {
            if (response.status === 401) {
                window.location.replace('/login');
                throw new Error('authentication_required');
            }
            return response.json().catch(function () { return {}; }).then(function (payload) {
                if (!response.ok) throw new Error(payload.message || payload.error || 'request_failed');
                return payload;
            });
        });
    }

    function currentUserID() {
        return bootstrapData && bootstrapData.user ? String(bootstrapData.user.id) : 'unknown';
    }

    function userKey(suffix) {
        return 'sublevel-user-' + currentUserID() + '-' + suffix;
    }

    function getLegacySave() {
        try {
            return localStorage.getItem('save-default') || localStorage.getItem('save');
        } catch (error) {
            return null;
        }
    }

    function clearGenericSave() {
        try {
            localStorage.removeItem('save-default');
            localStorage.removeItem('save');
        } catch (error) {}
    }

    function setLocalSave(data) {
        if (!data) return;
        try {
            localStorage.setItem('save-default', data);
            localStorage.setItem('save', data);
            localStorage.setItem(userKey('save-default'), data);
            localStorage.setItem('sublevel-active-save-owner', currentUserID());
        } catch (error) {
            if (typeof log !== 'undefined' && log.w) log.w('Could not store database save locally: ' + error);
        }
    }

    function prepareLocalStorage(data) {
        try {
            let userID = currentUserID();
            let activeSaveOwner = localStorage.getItem('sublevel-active-save-owner');
            let userSave = localStorage.getItem(userKey('save-default'));
            let legacySave = getLegacySave();

            if (data.save && data.save.data) {
                setLocalSave(data.save.data);
                saveRevision = data.save.revision || 0;
            } else if (userSave) {
                setLocalSave(userSave);
                pushSave(userSave);
            } else if (!activeSaveOwner || activeSaveOwner === userID) {
                if (legacySave) {
                    setLocalSave(legacySave);
                    pushSave(legacySave);
                } else {
                    clearGenericSave();
                    localStorage.setItem('sublevel-active-save-owner', userID);
                }
            } else {
                clearGenericSave();
                localStorage.setItem('sublevel-active-save-owner', userID);
            }

            let activeMetaOwner = localStorage.getItem('sublevel-active-meta-owner');
            let userMeta = localStorage.getItem(userKey('meta-state'));
            if (userMeta) {
                localStorage.setItem('meta-state', userMeta);
                localStorage.setItem('sublevel-active-meta-owner', userID);
            } else if (!activeMetaOwner || activeMetaOwner === userID) {
                let legacyMeta = localStorage.getItem('meta-state');
                if (legacyMeta) localStorage.setItem(userKey('meta-state'), legacyMeta);
                localStorage.setItem('sublevel-active-meta-owner', userID);
            } else {
                localStorage.removeItem('meta-state');
                localStorage.setItem('sublevel-active-meta-owner', userID);
            }
        } catch (error) {
            if (typeof log !== 'undefined' && log.w) log.w('User storage preparation skipped: ' + error);
        }
    }

    function pushSave(data, clientVersion) {
        if (!data || !csrfToken) return Promise.resolve(null);
        return request('/api/game/save', {
            method: 'PUT',
            body: JSON.stringify({ data: data, revision: saveRevision, clientVersion: clientVersion || null })
        }).then(function (result) {
            saveRevision = result.revision || saveRevision;
            try {
                localStorage.setItem(userKey('save-default'), data);
                localStorage.setItem('sublevel-active-save-owner', currentUserID());
            } catch (error) {}
            return result;
        }).catch(function (error) {
            if (typeof log !== 'undefined' && log.w) log.w('Database save failed: ' + error.message);
            return null;
        });
    }

    function clearSave() {
        clearGenericSave();
        try { localStorage.removeItem(userKey('save-default')); } catch (error) {}
        return request('/api/game/save', { method: 'DELETE', body: '{}' }).catch(function () { return null; });
    }

    function storeMetaState(data) {
        if (!data) return;
        try {
            localStorage.setItem(userKey('meta-state'), data);
            localStorage.setItem('sublevel-active-meta-owner', currentUserID());
        } catch (error) {}
    }

    function language() {
        try {
            let meta = bootstrapData && bootstrapData.user && bootstrapData.user.language;
            return meta === 'EN_GB' ? 'EN_GB' : 'DE_DE';
        } catch (error) {
            return 'DE_DE';
        }
    }

    function installAccountUI() {
        let setup = function () {
            if (!bootstrapData || !bootstrapData.user || document.getElementById('sublevel-account-controls')) return;
            let container = document.createElement('div');
            container.id = 'sublevel-account-controls';
            container.style.cssText = 'position:fixed;right:12px;top:12px;z-index:1200;display:flex;align-items:center;gap:7px;font:12px/1.2 sans-serif;flex-wrap:wrap;justify-content:flex-end;max-width:calc(100vw - 24px);';

            let label = document.createElement('span');
            label.textContent = bootstrapData.user.username;
            label.style.cssText = 'padding:7px 9px;background:rgba(8,19,23,.92);border:1px solid rgba(130,210,205,.25);color:#d9efec;border-radius:8px;';
            container.appendChild(label);

            if (bootstrapData.user.role === 'guardian') {
                let guardian = document.createElement('a');
                guardian.href = '/guardian';
                guardian.textContent = language() === 'EN_GB' ? 'Guardian' : 'Wächter';
                guardian.style.cssText = 'padding:7px 9px;background:#63d8c8;color:#03100f;text-decoration:none;border-radius:8px;font-weight:700;';
                container.appendChild(guardian);
            }

            let logout = document.createElement('button');
            logout.type = 'button';
            logout.textContent = language() === 'EN_GB' ? 'Sign out' : 'Abmelden';
            logout.style.cssText = 'padding:7px 9px;background:rgba(8,19,23,.92);border:1px solid rgba(130,210,205,.25);color:#d9efec;border-radius:8px;cursor:pointer;';
            logout.addEventListener('click', function () {
                request('/api/auth/logout', { method: 'POST', body: '{}' })
                    .then(function (result) { window.location.replace(result.redirect || '/login'); });
            });
            container.appendChild(logout);
            document.body.appendChild(container);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
        else setup();
    }

    function showAnnouncements() {
        if (!bootstrapData || !bootstrapData.announcements || bootstrapData.announcements.length === 0) return;
        let setup = function () {
            if (document.getElementById('sublevel-announcement')) return;
            let announcement = bootstrapData.announcements[0];
            let isEnglish = language() === 'EN_GB';
            let seenKey = 'sublevel-announcement-seen-' + announcement.id;
            try { if (sessionStorage.getItem(seenKey)) return; } catch (error) {}
            let box = document.createElement('aside');
            box.id = 'sublevel-announcement';
            box.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:1300;width:min(92vw,620px);padding:14px 44px 14px 16px;background:rgba(10,24,29,.97);border:1px solid rgba(114,225,209,.4);border-radius:12px;color:#eaf7f5;box-shadow:0 18px 50px rgba(0,0,0,.4);font:14px/1.45 sans-serif;';
            box.innerHTML = '<strong>' + escapeHTML(isEnglish ? announcement.titleEn : announcement.titleDe) + '</strong><div style="margin-top:5px;color:#b9cfcc">' + escapeHTML(isEnglish ? announcement.bodyEn : announcement.bodyDe) + '</div>';
            let close = document.createElement('button');
            close.type = 'button'; close.textContent = '×';
            close.style.cssText = 'position:absolute;right:10px;top:8px;border:0;background:transparent;color:#eaf7f5;font-size:22px;cursor:pointer;';
            close.addEventListener('click', function () { try { sessionStorage.setItem(seenKey, '1'); } catch (error) {} box.remove(); });
            box.appendChild(close); document.body.appendChild(box);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true }); else setup();
    }

    function escapeHTML(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
        });
    }

    function enforceMaintenance(data) {
        let maintenance = data && data.settings ? data.settings['game.maintenance'] : null;
        if (!maintenance || !maintenance.enabled || data.user.role === 'guardian') return;
        let message = data.user.language === 'EN_GB' ? maintenance.message_en : maintenance.message_de;
        throw new Error(message || (data.user.language === 'EN_GB' ? 'Sublevel is currently under maintenance.' : 'Sublevel befindet sich derzeit im Wartungsmodus.'));
    }

    function bootstrap() {
        if (bootstrapPromise) return bootstrapPromise;
        bootstrapPromise = request('/api/game/bootstrap').then(function (data) {
            bootstrapData = data;
            csrfToken = data.csrfToken;
            enforceMaintenance(data);
            prepareLocalStorage(data);
            installAccountUI();
            showAnnouncements();
            return data;
        });
        return bootstrapPromise;
    }

    function completeCommand(id, success, message) {
        return request('/api/game/commands/' + id + '/complete', {
            method: 'POST',
            body: JSON.stringify({ success: success !== false, message: message || null })
        });
    }

    return {
        bootstrap: bootstrap,
        pushSave: pushSave,
        clearSave: clearSave,
        storeMetaState: storeMetaState,
        getBootstrapData: function () { return bootstrapData; },
        getUser: function () { return bootstrapData ? bootstrapData.user : null; },
        getCommands: function () { return bootstrapData && bootstrapData.commands ? bootstrapData.commands.slice() : []; },
        completeCommand: completeCommand,
        getCSRFToken: function () { return csrfToken; }
    };
});
