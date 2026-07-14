(() => {
  'use strict';

  const translations = {
    DE_DE: {
      guardianCenter: 'Wächterzentrale', navDashboard: 'Übersicht', navUsers: 'Spieler', navItems: 'Gegenstände', navCommands: 'Befehle', navAnnouncements: 'Meldungen', navSettings: 'Einstellungen', navAudit: 'Protokoll',
      backToGame: 'Zum Spiel', logout: 'Abmelden', dashboardTitle: 'Wächterübersicht', dashboardSubtitle: 'Systemstatus, Benutzer und Spielverwaltung.',
      usersViewTitle: 'Spieler verwalten', usersViewSubtitle: 'Konten, Rollen, Zugriff und Passwörter.', itemsViewTitle: 'Gegenstände verwalten', itemsViewSubtitle: 'Katalog, Metadaten und Verteilung.',
      commandsViewTitle: 'Wächterbefehle', commandsViewSubtitle: 'Direkte Eingriffe für einzelne Spieler.', announcementsViewTitle: 'Spielmeldungen', announcementsViewSubtitle: 'Zweisprachige Hinweise im Spiel.',
      settingsViewTitle: 'Systemeinstellungen', settingsViewSubtitle: 'Betrieb, Sprache und Wartungsmodus.', auditViewTitle: 'Wächterprotokoll', auditViewSubtitle: 'Nachvollziehbare Änderungen und Sicherheitsereignisse.',
      recentUsers: 'Neue Benutzer', showAll: 'Alle anzeigen', username: 'Benutzer', email: 'E-Mail', role: 'Rolle', status: 'Status', lastLogin: 'Letzte Anmeldung', save: 'Spielstand', actions: 'Aktionen',
      usersTitle: 'Spieler und Wächter', searchUsers: 'Benutzer suchen', newUser: 'Benutzer anlegen', itemsTitle: 'Gegenstandskatalog', newItem: 'Gegenstand hinzufügen',
      itemsInfo: 'Verwalte bekannte Spiel-Gegenstände und eigene Metadaten. Gegenstände können anschließend über Wächterbefehle verteilt werden.',
      commandsTitle: 'Wächterbefehle', newCommand: 'Befehl erstellen', commandsInfo: 'Sende einem Spieler Ressourcen, Gegenstände oder eine persönliche Nachricht. Der Befehl wird beim nächsten Spielstart automatisch ausgeführt und protokolliert.',
      announcementsTitle: 'Spielmeldungen', newAnnouncement: 'Meldung erstellen', settingsTitle: 'Systemeinstellungen', auditTitle: 'Wächterprotokoll', refresh: 'Aktualisieren',
      name: 'Name', category: 'Kategorie', target: 'Ziel', type: 'Typ', created: 'Erstellt', title: 'Titel', period: 'Zeitraum', actor: 'Wächter', action: 'Aktion', entity: 'Objekt', details: 'Details',
      metricUsers: 'Benutzer', metricGuardians: 'Wächter', metricSessions: 'Aktive Sitzungen', metricCommands: 'Offene Befehle', active: 'Aktiv', inactive: 'Deaktiviert', guardian: 'Wächter', player: 'Spieler', hasSave: 'Vorhanden', noSave: 'Noch keiner', never: 'Nie',
      edit: 'Bearbeiten', passwordReset: 'Passwort setzen', disable: 'Deaktivieren', enable: 'Aktivieren', delete: 'Löschen', cancel: 'Abbrechen', saveButton: 'Speichern', create: 'Erstellen',
      loading: 'Daten werden geladen …', saved: 'Änderung gespeichert.', failed: 'Die Aktion ist fehlgeschlagen.', confirmDelete: 'Diesen Eintrag wirklich löschen?', confirmCancel: 'Diesen ausstehenden Befehl abbrechen?',
      userModalNew: 'Benutzer anlegen', userModalEdit: 'Benutzer bearbeiten', password: 'Passwort', language: 'Sprache', enabled: 'Zugriff aktiviert',
      itemModal: 'Gegenstand speichern', itemId: 'Spiel-Gegenstands-ID', nameDe: 'Name (Deutsch)', nameEn: 'Name (Englisch)', descDe: 'Beschreibung (Deutsch)', descEn: 'Beschreibung (Englisch)', metadata: 'Metadaten (JSON)',
      commandModal: 'Wächterbefehl erstellen', commandType: 'Befehlstyp', grantItem: 'Gegenstand geben', grantResource: 'Ressource geben', message: 'Nachricht senden', forceSave: 'Speichern erzwingen', itemLevel: 'Gegenstandsstufe', amount: 'Menge', resource: 'Ressource', messageDe: 'Nachricht (Deutsch)', messageEn: 'Nachricht (Englisch)',
      announcementModal: 'Spielmeldung erstellen', bodyDe: 'Text (Deutsch)', bodyEn: 'Text (Englisch)', startsAt: 'Start (optional)', endsAt: 'Ende (optional)',
      maintenance: 'Wartungsmodus', maintenanceInfo: 'Aktiviert eine serverweite Wartungsmeldung.', defaultLanguage: 'Standardsprache', registration: 'Selbstregistrierung',
      pending: 'Ausstehend', completed: 'Ausgeführt', failedStatus: 'Fehlgeschlagen', cancelled: 'Abgebrochen', noEntries: 'Keine Einträge vorhanden.', invalidJson: 'Die Metadaten enthalten kein gültiges JSON.', passwordHint: 'Mindestens 10 Zeichen'
    },
    EN_GB: {
      guardianCenter: 'Guardian Center', navDashboard: 'Dashboard', navUsers: 'Players', navItems: 'Items', navCommands: 'Commands', navAnnouncements: 'Announcements', navSettings: 'Settings', navAudit: 'Audit log',
      backToGame: 'Back to game', logout: 'Sign out', dashboardTitle: 'Guardian dashboard', dashboardSubtitle: 'System status, users and game administration.',
      usersViewTitle: 'Manage players', usersViewSubtitle: 'Accounts, roles, access and passwords.', itemsViewTitle: 'Manage items', itemsViewSubtitle: 'Catalog, metadata and distribution.',
      commandsViewTitle: 'Guardian commands', commandsViewSubtitle: 'Direct actions for individual players.', announcementsViewTitle: 'Game announcements', announcementsViewSubtitle: 'Bilingual in-game notices.',
      settingsViewTitle: 'System settings', settingsViewSubtitle: 'Operations, language and maintenance mode.', auditViewTitle: 'Guardian audit log', auditViewSubtitle: 'Traceable changes and security events.',
      recentUsers: 'New users', showAll: 'Show all', username: 'User', email: 'Email', role: 'Role', status: 'Status', lastLogin: 'Last sign-in', save: 'Save', actions: 'Actions',
      usersTitle: 'Players and Guardians', searchUsers: 'Search users', newUser: 'Create user', itemsTitle: 'Item catalog', newItem: 'Add item',
      itemsInfo: 'Manage known game items and custom metadata. Items can then be distributed through Guardian commands.',
      commandsTitle: 'Guardian commands', newCommand: 'Create command', commandsInfo: 'Send a player resources, items or a personal message. The command is executed automatically on the next game start and logged.',
      announcementsTitle: 'Game announcements', newAnnouncement: 'Create announcement', settingsTitle: 'System settings', auditTitle: 'Guardian audit log', refresh: 'Refresh',
      name: 'Name', category: 'Category', target: 'Target', type: 'Type', created: 'Created', title: 'Title', period: 'Period', actor: 'Guardian', action: 'Action', entity: 'Entity', details: 'Details',
      metricUsers: 'Users', metricGuardians: 'Guardians', metricSessions: 'Active sessions', metricCommands: 'Pending commands', active: 'Active', inactive: 'Disabled', guardian: 'Guardian', player: 'Player', hasSave: 'Available', noSave: 'None yet', never: 'Never',
      edit: 'Edit', passwordReset: 'Set password', disable: 'Disable', enable: 'Enable', delete: 'Delete', cancel: 'Cancel', saveButton: 'Save', create: 'Create',
      loading: 'Loading data …', saved: 'Change saved.', failed: 'The action failed.', confirmDelete: 'Delete this entry?', confirmCancel: 'Cancel this pending command?',
      userModalNew: 'Create user', userModalEdit: 'Edit user', password: 'Password', language: 'Language', enabled: 'Access enabled',
      itemModal: 'Save item', itemId: 'Game item ID', nameDe: 'Name (German)', nameEn: 'Name (English)', descDe: 'Description (German)', descEn: 'Description (English)', metadata: 'Metadata (JSON)',
      commandModal: 'Create Guardian command', commandType: 'Command type', grantItem: 'Grant item', grantResource: 'Grant resource', message: 'Send message', forceSave: 'Force save', itemLevel: 'Item level', amount: 'Amount', resource: 'Resource', messageDe: 'Message (German)', messageEn: 'Message (English)',
      announcementModal: 'Create game announcement', bodyDe: 'Text (German)', bodyEn: 'Text (English)', startsAt: 'Starts (optional)', endsAt: 'Ends (optional)',
      maintenance: 'Maintenance mode', maintenanceInfo: 'Enables a server-wide maintenance message.', defaultLanguage: 'Default language', registration: 'Self-registration',
      pending: 'Pending', completed: 'Completed', failedStatus: 'Failed', cancelled: 'Cancelled', noEntries: 'No entries available.', invalidJson: 'Metadata is not valid JSON.', passwordHint: 'At least 10 characters'
    }
  };

  const state = {
    language: localStorage.getItem('sublevel-guardian-language') === 'EN_GB' ? 'EN_GB' : 'DE_DE',
    csrf: '', user: null, users: [], items: [], itemDefinitions: [], commands: [], announcements: [], settings: []
  };
  const titleMap = {
    dashboard: ['dashboardTitle', 'dashboardSubtitle'], users: ['usersViewTitle', 'usersViewSubtitle'], items: ['itemsViewTitle', 'itemsViewSubtitle'],
    commands: ['commandsViewTitle', 'commandsViewSubtitle'], announcements: ['announcementsViewTitle', 'announcementsViewSubtitle'],
    settings: ['settingsViewTitle', 'settingsViewSubtitle'], audit: ['auditViewTitle', 'auditViewSubtitle']
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const t = key => translations[state.language][key] || translations.DE_DE[key] || key;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const date = value => value ? new Intl.DateTimeFormat(state.language === 'EN_GB' ? 'en-GB' : 'de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : t('never');
  const badge = (label, kind = '') => `<span class="badge ${kind}">${esc(label)}</span>`;

  async function api(url, options = {}) {
    const method = options.method || 'GET';
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && state.csrf ? { 'X-Sublevel-CSRF': state.csrf } : {}),
        ...(options.headers || {})
      }
    });
    if (response.status === 401) {
      window.location.replace('/login');
      throw new Error('authentication_required');
    }
    if (response.status === 403 && url !== '/api/auth/me') {
      window.location.replace('/');
      throw new Error('guardian_required');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || t('failed'));
    return payload;
  }

  function showNotice(message, kind = 'success') {
    const element = $('#global-notice');
    element.textContent = message;
    element.className = `notice visible ${kind}`;
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => { element.className = 'notice'; }, 4500);
  }

  function applyLanguage() {
    document.documentElement.lang = state.language === 'EN_GB' ? 'en-GB' : 'de-DE';
    $$('[data-i18n]').forEach(element => { const value = t(element.dataset.i18n); if (value) element.textContent = value; });
    $$('[data-i18n-placeholder]').forEach(element => { element.placeholder = t(element.dataset.i18nPlaceholder); });
    $$('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === state.language));
    const activeView = $('.guardian-nav button.active')?.dataset.view || 'dashboard';
    updateTitle(activeView);
  }

  function updateTitle(view) {
    const pair = titleMap[view] || titleMap.dashboard;
    $('#view-title').textContent = t(pair[0]);
    $('#view-subtitle').textContent = t(pair[1]);
  }

  async function showView(view) {
    $$('.guardian-nav button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $$('[data-view-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    updateTitle(view);
    try {
      if (view === 'dashboard') await loadDashboard();
      if (view === 'users') await loadUsers();
      if (view === 'items') await loadItems();
      if (view === 'commands') await loadCommands();
      if (view === 'announcements') await loadAnnouncements();
      if (view === 'settings') await loadSettings();
      if (view === 'audit') await loadAudit();
    } catch (error) { showNotice(error.message, 'error'); }
  }

  function openModal(title, html, submitHandler) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = html;
    $('#modal-backdrop').classList.add('visible');
    $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeModal));
    const form = $('#modal-body form');
    if (form && submitHandler) {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        try {
          await submitHandler(form);
          closeModal();
          showNotice(t('saved'));
        } catch (error) {
          showNotice(error.message, 'error');
          if (submit) submit.disabled = false;
        }
      });
    }
  }

  function closeModal() {
    $('#modal-backdrop').classList.remove('visible');
    $('#modal-body').innerHTML = '';
  }

  async function loadDashboard() {
    const data = await api('/api/guardian/dashboard');
    const metrics = [
      [t('metricUsers'), data.metrics.users], [t('metricGuardians'), data.metrics.guardians],
      [t('metricSessions'), data.metrics.activeSessions], [t('metricCommands'), data.metrics.pendingCommands]
    ];
    $('#metric-grid').innerHTML = metrics.map(metric => `<article class="metric"><span>${esc(metric[0])}</span><strong>${Number(metric[1] || 0)}</strong></article>`).join('');
    $('#recent-users-body').innerHTML = data.recentUsers.length ? data.recentUsers.map(user => `<tr><td><strong>${esc(user.username)}</strong><br><small>${esc(user.email)}</small></td><td>${badge(t(user.role), user.role === 'guardian' ? 'success' : '')}</td><td>${badge(user.enabled ? t('active') : t('inactive'), user.enabled ? 'success' : 'danger')}</td><td>${esc(date(user.lastLoginAt))}</td></tr>`).join('') : `<tr><td colspan="4" class="empty">${t('noEntries')}</td></tr>`;
  }

  async function loadUsers(search = '') {
    const data = await api('/api/guardian/users' + (search ? `?search=${encodeURIComponent(search)}` : ''));
    state.users = data.users;
    $('#users-body').innerHTML = state.users.length ? state.users.map(user => `<tr>
      <td><strong>${esc(user.username)}</strong><br><small>#${user.id}</small></td><td>${esc(user.email)}</td>
      <td>${badge(t(user.role), user.role === 'guardian' ? 'success' : '')}</td>
      <td>${badge(user.enabled ? t('active') : t('inactive'), user.enabled ? 'success' : 'danger')}</td>
      <td>${badge(user.hasSave ? t('hasSave') : t('noSave'), user.hasSave ? 'success' : '')}<br><small>${user.saveUpdatedAt ? esc(date(user.saveUpdatedAt)) : ''}</small></td>
      <td><div class="toolbar"><button class="button small secondary" data-user-edit="${user.id}">${t('edit')}</button><button class="button small secondary" data-user-password="${user.id}">${t('passwordReset')}</button><button class="button small ${user.enabled ? 'danger' : 'secondary'}" data-user-toggle="${user.id}">${user.enabled ? t('disable') : t('enable')}</button></div></td>
    </tr>`).join('') : `<tr><td colspan="6" class="empty">${t('noEntries')}</td></tr>`;
  }

  function userForm(user = null) {
    return `<form class="form-grid">
      <div class="field"><label>${t('username')}</label><input name="username" required minlength="3" maxlength="64" value="${esc(user?.username || '')}"></div>
      <div class="field"><label>${t('email')}</label><input name="email" type="email" required value="${esc(user?.email || '')}"></div>
      ${user ? '' : `<div class="field full"><label>${t('password')}</label><input name="password" type="password" required minlength="10"><small>${t('passwordHint')}</small></div>`}
      <div class="field"><label>${t('role')}</label><select name="role"><option value="player" ${user?.role !== 'guardian' ? 'selected' : ''}>${t('player')}</option><option value="guardian" ${user?.role === 'guardian' ? 'selected' : ''}>${t('guardian')}</option></select></div>
      <div class="field"><label>${t('language')}</label><select name="language"><option value="DE_DE" ${user?.language !== 'EN_GB' ? 'selected' : ''}>Deutsch</option><option value="EN_GB" ${user?.language === 'EN_GB' ? 'selected' : ''}>English</option></select></div>
      ${user ? `<label class="checkbox field full"><input name="enabled" type="checkbox" ${user.enabled ? 'checked' : ''}><span>${t('enabled')}</span></label>` : ''}
      <div class="actions end field full"><button class="button secondary" type="button" data-close-modal>${t('cancel')}</button><button class="button primary" type="submit">${user ? t('saveButton') : t('create')}</button></div>
    </form>`;
  }

  function openUser(user = null) {
    openModal(user ? t('userModalEdit') : t('userModalNew'), userForm(user), async form => {
      const data = Object.fromEntries(new FormData(form));
      if (user) {
        data.enabled = form.elements.enabled.checked;
        await api(`/api/guardian/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        await api('/api/guardian/users', { method: 'POST', body: JSON.stringify(data) });
      }
      await loadUsers($('#user-search').value.trim());
    });
  }

  function openPassword(user) {
    openModal(`${t('passwordReset')}: ${user.username}`, `<form class="form-grid"><div class="field full"><label>${t('password')}</label><input name="password" type="password" minlength="10" required><small>${t('passwordHint')}</small></div><div class="actions end field full"><button class="button secondary" type="button" data-close-modal>${t('cancel')}</button><button class="button primary" type="submit">${t('saveButton')}</button></div></form>`, async form => {
      await api(`/api/guardian/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password: form.elements.password.value }) });
    });
  }

  async function ensureItemDefinitions() {
    if (state.itemDefinitions.length) return;
    const data = await api('/api/guardian/item-definitions');
    state.itemDefinitions = data.items;
  }

  async function loadItems() {
    const data = await api('/api/guardian/items');
    state.items = data.items;
    $('#items-body').innerHTML = state.items.length ? state.items.map(item => `<tr><td><code>${esc(item.gameItemId)}</code></td><td><strong>${esc(state.language === 'EN_GB' ? item.nameEn : item.nameDe)}</strong></td><td>${esc(item.category)}</td><td>${badge(item.enabled ? t('active') : t('inactive'), item.enabled ? 'success' : 'danger')}</td><td><div class="toolbar"><button class="button small secondary" data-item-edit="${item.id}">${t('edit')}</button><button class="button small danger" data-item-delete="${item.id}">${t('delete')}</button></div></td></tr>`).join('') : `<tr><td colspan="5" class="empty">${t('noEntries')}</td></tr>`;
  }

  async function openItem(item = null) {
    await ensureItemDefinitions();
    const options = state.itemDefinitions.slice(0, 3000).map(definition => `<option value="${esc(definition.id)}">${esc(definition.type)}</option>`).join('');
    openModal(t('itemModal'), `<form class="form-grid">
      <div class="field full"><label>${t('itemId')}</label><input name="gameItemId" list="game-items" required value="${esc(item?.gameItemId || '')}" ${item ? 'readonly' : ''}><datalist id="game-items">${options}</datalist></div>
      <div class="field"><label>${t('nameDe')}</label><input name="nameDe" required value="${esc(item?.nameDe || '')}"></div><div class="field"><label>${t('nameEn')}</label><input name="nameEn" required value="${esc(item?.nameEn || '')}"></div>
      <div class="field"><label>${t('descDe')}</label><textarea name="descriptionDe">${esc(item?.descriptionDe || '')}</textarea></div><div class="field"><label>${t('descEn')}</label><textarea name="descriptionEn">${esc(item?.descriptionEn || '')}</textarea></div>
      <div class="field"><label>${t('category')}</label><input name="category" value="${esc(item?.category || 'other')}"></div><label class="checkbox field"><input name="enabled" type="checkbox" ${item?.enabled !== false ? 'checked' : ''}><span>${t('active')}</span></label>
      <div class="field full"><label>${t('metadata')}</label><textarea name="metadata">${esc(JSON.stringify(item?.metadata || {}, null, 2))}</textarea></div>
      <div class="actions end field full"><button class="button secondary" type="button" data-close-modal>${t('cancel')}</button><button class="button primary" type="submit">${t('saveButton')}</button></div>
    </form>`, async form => {
      const data = Object.fromEntries(new FormData(form));
      data.enabled = form.elements.enabled.checked;
      try { data.metadata = JSON.parse(data.metadata || '{}'); } catch { throw new Error(t('invalidJson')); }
      if (item) await api(`/api/guardian/items/${item.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      else await api('/api/guardian/items', { method: 'POST', body: JSON.stringify(data) });
      await loadItems();
    });
  }

  async function loadCommands() {
    const data = await api('/api/guardian/commands');
    state.commands = data.commands;
    $('#commands-body').innerHTML = state.commands.length ? state.commands.map(command => `<tr><td>#${command.id}</td><td>${esc(command.targetUsername || command.targetUserId || '')}</td><td><code>${esc(command.type)}</code></td><td>${badge(t(command.status === 'failed' ? 'failedStatus' : command.status), command.status === 'completed' ? 'success' : command.status === 'pending' ? 'warning' : 'danger')}</td><td>${esc(date(command.createdAt))}</td><td>${command.status === 'pending' ? `<button class="button small danger" data-command-cancel="${command.id}">${t('cancel')}</button>` : ''}</td></tr>`).join('') : `<tr><td colspan="6" class="empty">${t('noEntries')}</td></tr>`;
  }

  function commandFields(type) {
    if (type === 'grant_item') return `<div class="form-grid"><div class="field"><label>${t('itemId')}</label><input name="itemId" required></div><div class="field"><label>${t('amount')}</label><input name="amount" type="number" min="1" max="100" value="1" required></div><div class="field"><label>${t('itemLevel')}</label><input name="level" type="number" min="1" max="100" value="50"></div></div>`;
    if (type === 'grant_resource') return `<div class="form-grid"><div class="field"><label>${t('resource')}</label><select name="resource"><option>water</option><option>food</option><option>metal</option><option>rope</option><option>fuel</option><option>rubber</option><option>medicine</option><option>tools</option><option>concrete</option><option>robots</option><option>herbs</option><option>currency</option></select></div><div class="field"><label>${t('amount')}</label><input name="amount" type="number" min="1" max="1000000" value="100" required></div></div>`;
    if (type === 'message') return `<div class="form-grid"><div class="field"><label>${t('messageDe')}</label><textarea name="messageDe" required></textarea></div><div class="field"><label>${t('messageEn')}</label><textarea name="messageEn" required></textarea></div></div>`;
    return `<p style="color:var(--muted)">${t('forceSave')}</p>`;
  }

  async function openCommand() {
    if (!state.users.length) await loadUsers();
    const users = state.users.filter(user => user.enabled).map(user => `<option value="${user.id}">${esc(user.username)} (#${user.id})</option>`).join('');
    openModal(t('commandModal'), `<form class="form-grid"><div class="field full"><label>${t('target')}</label><select name="targetUserId" required>${users}</select></div><div class="field full"><label>${t('commandType')}</label><select name="type" id="command-type"><option value="grant_item">${t('grantItem')}</option><option value="grant_resource">${t('grantResource')}</option><option value="message">${t('message')}</option><option value="force_save">${t('forceSave')}</option></select></div><div id="command-fields" class="field full">${commandFields('grant_item')}</div><div class="actions end field full"><button class="button secondary" type="button" data-close-modal>${t('cancel')}</button><button class="button primary" type="submit">${t('create')}</button></div></form>`, async form => {
      const raw = Object.fromEntries(new FormData(form));
      let payload = {};
      if (raw.type === 'grant_item') payload = { itemId: raw.itemId.trim(), amount: Number(raw.amount), level: Number(raw.level || 50) };
      if (raw.type === 'grant_resource') payload = { resource: raw.resource, amount: Number(raw.amount) };
      if (raw.type === 'message') payload = { messageDe: raw.messageDe, messageEn: raw.messageEn };
      await api('/api/guardian/commands', { method: 'POST', body: JSON.stringify({ targetUserId: Number(raw.targetUserId), type: raw.type, payload }) });
      await loadCommands();
    });
    $('#command-type').addEventListener('change', event => { $('#command-fields').innerHTML = commandFields(event.target.value); });
  }

  async function loadAnnouncements() {
    const data = await api('/api/guardian/announcements');
    state.announcements = data.announcements;
    $('#announcements-body').innerHTML = state.announcements.length ? state.announcements.map(item => `<tr><td><strong>${esc(state.language === 'EN_GB' ? item.titleEn : item.titleDe)}</strong></td><td>${esc(item.startsAt ? date(item.startsAt) : '—')} – ${esc(item.endsAt ? date(item.endsAt) : '∞')}</td><td>${badge(item.active ? t('active') : t('inactive'), item.active ? 'success' : 'danger')}</td><td><button class="button small secondary" data-announcement-toggle="${item.id}">${item.active ? t('disable') : t('enable')}</button></td></tr>`).join('') : `<tr><td colspan="4" class="empty">${t('noEntries')}</td></tr>`;
  }

  function openAnnouncement() {
    openModal(t('announcementModal'), `<form class="form-grid"><div class="field"><label>${t('nameDe')}</label><input name="titleDe" required></div><div class="field"><label>${t('nameEn')}</label><input name="titleEn" required></div><div class="field"><label>${t('bodyDe')}</label><textarea name="bodyDe" required></textarea></div><div class="field"><label>${t('bodyEn')}</label><textarea name="bodyEn" required></textarea></div><div class="field"><label>${t('startsAt')}</label><input name="startsAt" type="datetime-local"></div><div class="field"><label>${t('endsAt')}</label><input name="endsAt" type="datetime-local"></div><label class="checkbox field full"><input name="active" type="checkbox" checked><span>${t('active')}</span></label><div class="actions end field full"><button class="button secondary" type="button" data-close-modal>${t('cancel')}</button><button class="button primary" type="submit">${t('create')}</button></div></form>`, async form => {
      const data = Object.fromEntries(new FormData(form));
      data.active = form.elements.active.checked;
      data.startsAt = data.startsAt || null; data.endsAt = data.endsAt || null;
      await api('/api/guardian/announcements', { method: 'POST', body: JSON.stringify(data) });
      await loadAnnouncements();
    });
  }

  async function loadSettings() {
    const data = await api('/api/guardian/settings');
    state.settings = data.settings;
    const value = key => state.settings.find(setting => setting.key === key)?.value || {};
    const maintenance = value('game.maintenance');
    const defaultLanguage = value('game.default_language');
    const registration = value('game.registration');
    $('#settings-container').innerHTML = `<form id="settings-form" class="form-grid"><label class="checkbox field full"><input name="maintenanceEnabled" type="checkbox" ${maintenance.enabled ? 'checked' : ''}><span><strong>${t('maintenance')}</strong><br><small>${t('maintenanceInfo')}</small></span></label><div class="field"><label>${t('messageDe')}</label><input name="maintenanceDe" value="${esc(maintenance.message_de || 'Wartungsarbeiten')}"></div><div class="field"><label>${t('messageEn')}</label><input name="maintenanceEn" value="${esc(maintenance.message_en || 'Maintenance')}"></div><div class="field"><label>${t('defaultLanguage')}</label><select name="defaultLanguage"><option value="DE_DE" ${defaultLanguage.value !== 'EN_GB' ? 'selected' : ''}>Deutsch</option><option value="EN_GB" ${defaultLanguage.value === 'EN_GB' ? 'selected' : ''}>English</option></select></div><label class="checkbox field"><input name="registrationEnabled" type="checkbox" ${registration.enabled ? 'checked' : ''}><span>${t('registration')}</span></label><div class="actions end field full"><button class="button primary" type="submit">${t('saveButton')}</button></div></form>`;
    $('#settings-form').addEventListener('submit', async event => {
      event.preventDefault(); const form = event.currentTarget;
      try {
        await Promise.all([
          api('/api/guardian/settings/game.maintenance', { method: 'PUT', body: JSON.stringify({ value: { enabled: form.elements.maintenanceEnabled.checked, message_de: form.elements.maintenanceDe.value, message_en: form.elements.maintenanceEn.value } }) }),
          api('/api/guardian/settings/game.default_language', { method: 'PUT', body: JSON.stringify({ value: { value: form.elements.defaultLanguage.value } }) }),
          api('/api/guardian/settings/game.registration', { method: 'PUT', body: JSON.stringify({ value: { enabled: form.elements.registrationEnabled.checked } }) })
        ]);
        showNotice(t('saved'));
      } catch (error) { showNotice(error.message, 'error'); }
    });
  }

  async function loadAudit() {
    const data = await api('/api/guardian/audit?limit=500');
    $('#audit-body').innerHTML = data.entries.length ? data.entries.map(entry => `<tr><td>${esc(date(entry.createdAt))}</td><td>${esc(entry.actorUsername)}</td><td><code>${esc(entry.action)}</code></td><td>${esc([entry.entityType, entry.entityId].filter(Boolean).join(' #'))}</td><td><small>${esc(entry.details ? JSON.stringify(entry.details) : '')}</small></td></tr>`).join('') : `<tr><td colspan="5" class="empty">${t('noEntries')}</td></tr>`;
  }

  async function initialise() {
    try {
      const me = await api('/api/auth/me');
      state.user = me.user; state.csrf = me.csrfToken;
      $('#current-user').textContent = `${state.user.username} · ${t('guardian')}`;
      applyLanguage();
      await loadDashboard();
    } catch (error) { showNotice(error.message, 'error'); }
  }

  $$('.guardian-nav button').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  $$('[data-open-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.openView)));
  $$('[data-language]').forEach(button => button.addEventListener('click', () => { state.language = button.dataset.language === 'EN_GB' ? 'EN_GB' : 'DE_DE'; localStorage.setItem('sublevel-guardian-language', state.language); applyLanguage(); showView($('.guardian-nav button.active')?.dataset.view || 'dashboard'); }));
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-backdrop').addEventListener('click', event => { if (event.target === $('#modal-backdrop')) closeModal(); });
  $('#new-user-button').addEventListener('click', () => openUser());
  $('#new-item-button').addEventListener('click', () => openItem().catch(error => showNotice(error.message, 'error')));
  $('#new-command-button').addEventListener('click', () => openCommand().catch(error => showNotice(error.message, 'error')));
  $('#new-announcement-button').addEventListener('click', openAnnouncement);
  $('#refresh-audit-button').addEventListener('click', () => loadAudit().catch(error => showNotice(error.message, 'error')));
  $('#user-search').addEventListener('input', event => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(() => loadUsers(event.target.value.trim()).catch(error => showNotice(error.message, 'error')), 250); });
  $('#logout-button').addEventListener('click', async () => { try { const result = await api('/api/auth/logout', { method: 'POST', body: '{}' }); window.location.replace(result.redirect || '/login'); } catch (error) { showNotice(error.message, 'error'); } });

  document.addEventListener('click', async event => {
    const target = event.target.closest('button'); if (!target) return;
    try {
      if (target.dataset.userEdit) openUser(state.users.find(user => user.id === Number(target.dataset.userEdit)));
      if (target.dataset.userPassword) openPassword(state.users.find(user => user.id === Number(target.dataset.userPassword)));
      if (target.dataset.userToggle) { const user = state.users.find(entry => entry.id === Number(target.dataset.userToggle)); await api(`/api/guardian/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !user.enabled }) }); await loadUsers($('#user-search').value.trim()); showNotice(t('saved')); }
      if (target.dataset.itemEdit) await openItem(state.items.find(item => item.id === Number(target.dataset.itemEdit)));
      if (target.dataset.itemDelete && confirm(t('confirmDelete'))) { await api(`/api/guardian/items/${target.dataset.itemDelete}`, { method: 'DELETE', body: '{}' }); await loadItems(); showNotice(t('saved')); }
      if (target.dataset.commandCancel && confirm(t('confirmCancel'))) { await api(`/api/guardian/commands/${target.dataset.commandCancel}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }); await loadCommands(); showNotice(t('saved')); }
      if (target.dataset.announcementToggle) { const item = state.announcements.find(entry => entry.id === Number(target.dataset.announcementToggle)); await api(`/api/guardian/announcements/${item.id}`, { method: 'PATCH', body: JSON.stringify({ active: !item.active }) }); await loadAnnouncements(); showNotice(t('saved')); }
    } catch (error) { showNotice(error.message, 'error'); }
  });

  applyLanguage();
  initialise();
})();
