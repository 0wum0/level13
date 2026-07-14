define([
    'game/GameGlobals',
    'game/GlobalSignals'
], function (GameGlobals, GlobalSignals) {
    'use strict';

    const SESSION_KEY = 'level13-live-session-id';
    const REMOTE_SAVE_KEY = 'level13-remote-save';
    const CLIENT_SCRIPT = '/socket.io/socket.io.js';

    let socket = null;
    let initPromise = null;
    let revision = 0;
    let presence = { connections: 0, sessions: 0 };

    function randomSessionID() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID().replaceAll('-', '');
        }

        const values = new Uint32Array(4);
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            window.crypto.getRandomValues(values);
            return Array.from(values, value => value.toString(16).padStart(8, '0')).join('');
        }

        return 'session_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function getSessionID() {
        try {
            let sessionID = localStorage.getItem(SESSION_KEY);
            if (!sessionID || sessionID.length < 16) {
                sessionID = randomSessionID();
                localStorage.setItem(SESSION_KEY, sessionID);
            }
            return sessionID;
        } catch (error) {
            return randomSessionID();
        }
    }

    function getLanguage() {
        const settings = GameGlobals.metaState && GameGlobals.metaState.settings;
        return settings && settings.language ? settings.language : 'DE_DE';
    }

    function statusTexts() {
        const language = getLanguage();
        if (language === 'EN_GB') {
            return {
                connecting: 'Server: connecting…',
                connected: 'Server connected',
                disconnected: 'Server offline',
                online: 'online',
                remoteSave: 'A newer save from another session is available.',
            };
        }
        if (language === 'FI_FI') {
            return {
                connecting: 'Palvelin: yhdistetään…',
                connected: 'Palvelin yhdistetty',
                disconnected: 'Palvelin ei käytettävissä',
                online: 'linjoilla',
                remoteSave: 'Toisesta istunnosta on saatavilla uudempi tallennus.',
            };
        }
        return {
            connecting: 'Server: Verbindung wird hergestellt…',
            connected: 'Server verbunden',
            disconnected: 'Server nicht erreichbar',
            online: 'online',
            remoteSave: 'Ein neuerer Spielstand aus einer anderen Sitzung ist verfügbar.',
        };
    }

    function ensureStatusElement() {
        let element = document.getElementById('socket-status');
        if (element) return element;

        element = document.createElement('span');
        element.id = 'socket-status';
        element.className = 'p-meta';
        element.setAttribute('aria-live', 'polite');
        element.style.marginLeft = '0.75rem';
        element.style.whiteSpace = 'nowrap';

        const footer = document.getElementById('footer') || document.body;
        footer.appendChild(element);
        return element;
    }

    function renderStatus(state) {
        const element = ensureStatusElement();
        const texts = statusTexts();
        element.dataset.state = state;

        if (state === 'connected') {
            element.textContent = `${texts.connected} · ${presence.connections || 1} ${texts.online}`;
            return;
        }
        if (state === 'connecting') {
            element.textContent = texts.connecting;
            return;
        }
        element.textContent = texts.disconnected;
    }

    function dispatch(name, detail) {
        window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    }

    function loadClientScript() {
        if (window.io) return Promise.resolve(window.io);

        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${CLIENT_SCRIPT}"]`);
            if (existing) {
                existing.addEventListener('load', () => resolve(window.io), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = CLIENT_SCRIPT;
            script.async = true;
            script.onload = () => resolve(window.io);
            script.onerror = () => reject(new Error('Socket.IO client is unavailable'));
            document.head.appendChild(script);
        });
    }

    function joinSession() {
        if (!socket || !socket.connected) return;
        socket.emit('game:join', {
            sessionId: getSessionID(),
            language: getLanguage(),
        }, response => {
            if (!response || !response.ok) return;
            if (response.presence) presence = response.presence;
            if (response.save && Number.isInteger(response.save.revision)) {
                revision = response.save.revision;
            }
            renderStatus('connected');
        });
    }

    function storeRemoteSave(save) {
        if (!save || !save.data) return;
        try {
            localStorage.setItem(REMOTE_SAVE_KEY, JSON.stringify(save));
        } catch (error) {
            // Keep realtime connectivity optional when browser storage is full or disabled.
        }

        const texts = statusTexts();
        const message = document.getElementById('game-msg');
        if (message) message.textContent = texts.remoteSave;
        dispatch('level13:remote-save', save);
    }

    function pullRemoteSave() {
        if (!socket || !socket.connected) return;
        socket.emit('save:pull', response => {
            if (!response || !response.ok || !response.data) return;
            revision = response.revision || revision;
            storeRemoteSave(response);
        });
    }

    function connect() {
        renderStatus('connecting');
        return loadClientScript()
            .then(() => {
                socket = window.io({
                    path: '/socket.io',
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 10000,
                    timeout: 10000,
                });

                socket.on('connect', () => {
                    joinSession();
                    dispatch('level13:socket-connected', { socketId: socket.id });
                });

                socket.on('disconnect', reason => {
                    renderStatus('disconnected');
                    dispatch('level13:socket-disconnected', { reason });
                });

                socket.on('connect_error', () => {
                    renderStatus('disconnected');
                });

                socket.on('presence:update', nextPresence => {
                    presence = nextPresence || presence;
                    if (socket.connected) renderStatus('connected');
                    dispatch('level13:presence', presence);
                });

                socket.on('save:updated', update => {
                    if (update && update.revision > revision) pullRemoteSave();
                });

                return socket;
            })
            .catch(() => {
                renderStatus('disconnected');
                return null;
            });
    }

    const SocketClient = {
        init: function () {
            if (initPromise) return initPromise;

            initPromise = new Promise(resolve => {
                const start = () => connect().then(resolve);
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', start, { once: true });
                } else {
                    start();
                }
            });

            GlobalSignals.add(this, GlobalSignals.settingsChangedSignal, function () {
                renderStatus(socket && socket.connected ? 'connected' : 'disconnected');
                if (socket && socket.connected) {
                    socket.emit('client:language', getLanguage());
                }
            });

            return initPromise;
        },

        isConnected: function () {
            return Boolean(socket && socket.connected);
        },

        pushSave: function (data) {
            if (!this.isConnected() || typeof data !== 'string' || data.length === 0) return;

            socket.emit('save:push', { data, revision }, response => {
                if (!response) return;
                if (response.ok) {
                    revision = response.revision || revision;
                    return;
                }
                if (response.error === 'revision_conflict') pullRemoteSave();
            });
        },

        pullSave: pullRemoteSave,

        getRemoteSave: function () {
            try {
                const raw = localStorage.getItem(REMOTE_SAVE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                return null;
            }
        },
    };

    return SocketClient;
});
