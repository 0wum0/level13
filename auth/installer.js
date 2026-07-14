(() => {
  'use strict';

  const text = {
    DE_DE: {
      subtitle: 'Sichere Ersteinrichtung', stepWelcome: 'Willkommen', stepDatabase: 'Datenbank', stepGuardian: 'Wächter',
      welcomeTitle: 'Willkommen bei Sublevel',
      welcomeText: 'Dieser Installer verbindet Sublevel mit deiner MySQL- oder MariaDB-Datenbank, erstellt alle benötigten Tabellen und legt den ersten Wächter-Account an. Sicherheitswerte werden automatisch erzeugt und die Datenbank-Zugangsdaten verschlüsselt gespeichert.',
      welcomeInfo: 'Der Installer verändert keine vorhandenen Tabellen außerhalb des Präfixes „sublevel_“.',
      databaseTitle: 'Datenbankverbindung', databaseText: 'Trage die Zugangsdaten der Datenbank ein, die du bei deinem Hoster angelegt hast. Sublevel erstellt darin ausschließlich eigene Tabellen.',
      dbHost: 'Host', dbPort: 'Port', dbName: 'Datenbankname', dbUser: 'Datenbank-Benutzer', dbPassword: 'Datenbank-Passwort', dbSsl: 'SSL-Verbindung verwenden',
      guardianTitle: 'Ersten Wächter anlegen', guardianText: 'Der Wächter ist der geschützte Hauptaccount für Spielverwaltung, Benutzer, Gegenstände, Meldungen, Spielstände und Systemeinstellungen.',
      username: 'Benutzername', email: 'E-Mail-Adresse', password: 'Passwort', passwordConfirm: 'Passwort wiederholen', passwordHint: 'Mindestens 10 Zeichen.', accountLanguage: 'Standardsprache',
      continue: 'Weiter', back: 'Zurück', testConnection: 'Verbindung testen', install: 'Sublevel installieren',
      testing: 'Verbindung wird geprüft …', testSuccess: 'Datenbankverbindung erfolgreich.', testRequired: 'Bitte teste zuerst die Datenbankverbindung.',
      connectionFailed: 'Die Verbindung konnte nicht hergestellt werden.', passwordsMismatch: 'Die Passwörter stimmen nicht überein.', installing: 'Sublevel wird installiert …', installed: 'Installation abgeschlossen. Sublevel wird geöffnet …',
      formInvalid: 'Bitte fülle alle Pflichtfelder korrekt aus.', alreadyInstalled: 'Sublevel ist bereits installiert.', unknownError: 'Ein unbekannter Fehler ist aufgetreten.'
    },
    EN_GB: {
      subtitle: 'Secure first-time setup', stepWelcome: 'Welcome', stepDatabase: 'Database', stepGuardian: 'Guardian',
      welcomeTitle: 'Welcome to Sublevel',
      welcomeText: 'This installer connects Sublevel to your MySQL or MariaDB database, creates all required tables and creates the first Guardian account. Security values are generated automatically and database credentials are stored encrypted.',
      welcomeInfo: 'The installer does not change existing tables outside the “sublevel_” prefix.',
      databaseTitle: 'Database connection', databaseText: 'Enter the credentials of the database created with your hosting provider. Sublevel creates only its own tables inside it.',
      dbHost: 'Host', dbPort: 'Port', dbName: 'Database name', dbUser: 'Database user', dbPassword: 'Database password', dbSsl: 'Use SSL connection',
      guardianTitle: 'Create the first Guardian', guardianText: 'The Guardian is the protected primary account for game management, users, items, messages, saves and system settings.',
      username: 'Username', email: 'Email address', password: 'Password', passwordConfirm: 'Repeat password', passwordHint: 'At least 10 characters.', accountLanguage: 'Default language',
      continue: 'Continue', back: 'Back', testConnection: 'Test connection', install: 'Install Sublevel',
      testing: 'Testing connection …', testSuccess: 'Database connection successful.', testRequired: 'Test the database connection first.',
      connectionFailed: 'The connection could not be established.', passwordsMismatch: 'The passwords do not match.', installing: 'Installing Sublevel …', installed: 'Installation completed. Opening Sublevel …',
      formInvalid: 'Complete all required fields correctly.', alreadyInstalled: 'Sublevel is already installed.', unknownError: 'An unknown error occurred.'
    }
  };

  let language = localStorage.getItem('sublevel-installer-language') === 'EN_GB' ? 'EN_GB' : 'DE_DE';
  let currentStep = 0;
  let databaseTested = false;
  let databaseFingerprint = '';

  const panels = [...document.querySelectorAll('[data-step]')];
  const indicators = [...document.querySelectorAll('[data-step-indicator]')];
  const databaseForm = document.getElementById('database-form');
  const guardianForm = document.getElementById('guardian-form');
  const databaseNotice = document.getElementById('database-notice');
  const installNotice = document.getElementById('install-notice');
  const completeButton = document.getElementById('complete-installation');
  const testButton = document.getElementById('test-database');

  function t(key) { return text[language][key] || text.DE_DE[key] || key; }

  function applyLanguage() {
    document.documentElement.lang = language === 'EN_GB' ? 'en-GB' : 'de-DE';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = t(element.dataset.i18n);
      if (value) element.textContent = value;
    });
    document.querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === language));
    document.getElementById('guardian-language').value = language;
  }

  function showNotice(element, message, kind = 'error') {
    element.textContent = message;
    element.className = `notice visible ${kind}`;
  }

  function clearNotice(element) {
    element.textContent = '';
    element.className = 'notice';
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(2, index));
    panels.forEach(panel => panel.classList.toggle('active', Number(panel.dataset.step) === currentStep));
    indicators.forEach(indicator => {
      const step = Number(indicator.dataset.stepIndicator);
      indicator.classList.toggle('active', step === currentStep);
      indicator.classList.toggle('done', step < currentStep);
    });
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function databaseData() {
    const data = formData(databaseForm);
    return {
      host: data.host.trim(),
      port: Number(data.port || 3306),
      database: data.database.trim(),
      user: data.user.trim(),
      password: data.password || '',
      ssl: document.getElementById('db-ssl').checked,
    };
  }

  function fingerprint(database) {
    return JSON.stringify(database);
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || t('unknownError'));
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function testDatabase() {
    clearNotice(databaseNotice);
    if (!databaseForm.reportValidity()) {
      showNotice(databaseNotice, t('formInvalid'));
      return false;
    }
    testButton.disabled = true;
    testButton.textContent = t('testing');
    const database = databaseData();
    try {
      const result = await request('/api/install/test-database', {
        method: 'POST',
        body: JSON.stringify({ database }),
      });
      databaseTested = true;
      databaseFingerprint = fingerprint(database);
      showNotice(databaseNotice, `${t('testSuccess')} ${result.version || ''}`.trim(), 'success');
      return true;
    } catch (error) {
      databaseTested = false;
      showNotice(databaseNotice, error.message || t('connectionFailed'));
      return false;
    } finally {
      testButton.disabled = false;
      testButton.textContent = t('testConnection');
    }
  }

  async function completeInstallation() {
    clearNotice(installNotice);
    if (!guardianForm.reportValidity()) {
      showNotice(installNotice, t('formInvalid'));
      return;
    }
    const guardian = formData(guardianForm);
    if (guardian.password !== guardian.passwordConfirm) {
      showNotice(installNotice, t('passwordsMismatch'));
      return;
    }
    const database = databaseData();
    if (!databaseTested || databaseFingerprint !== fingerprint(database)) {
      showNotice(installNotice, t('testRequired'));
      showStep(1);
      return;
    }

    completeButton.disabled = true;
    completeButton.textContent = t('installing');
    try {
      const result = await request('/api/install/complete', {
        method: 'POST',
        body: JSON.stringify({
          database,
          guardian: {
            username: guardian.username.trim(),
            email: guardian.email.trim(),
            password: guardian.password,
            language: guardian.language,
          },
        }),
      });
      showNotice(installNotice, t('installed'), 'success');
      setTimeout(() => { window.location.href = result.redirect || '/'; }, 700);
    } catch (error) {
      showNotice(installNotice, error.message);
      completeButton.disabled = false;
      completeButton.textContent = t('install');
    }
  }

  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => {
      language = button.dataset.language === 'EN_GB' ? 'EN_GB' : 'DE_DE';
      localStorage.setItem('sublevel-installer-language', language);
      applyLanguage();
    });
  });

  document.querySelectorAll('[data-next]').forEach(button => {
    button.addEventListener('click', async () => {
      if (currentStep === 1) {
        if (!databaseForm.reportValidity()) return;
        if (!databaseTested || databaseFingerprint !== fingerprint(databaseData())) {
          const success = await testDatabase();
          if (!success) return;
        }
      }
      showStep(currentStep + 1);
    });
  });
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
  databaseForm.addEventListener('input', () => { databaseTested = false; clearNotice(databaseNotice); });
  testButton.addEventListener('click', testDatabase);
  completeButton.addEventListener('click', completeInstallation);

  request('/api/install/status').then(status => {
    if (status.installed) window.location.replace('/login');
  }).catch(() => {});

  applyLanguage();
  showStep(0);
})();
