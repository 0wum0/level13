(() => {
  'use strict';

  const text = {
    DE_DE: {
      subtitle: 'Anmeldung', identifier: 'Benutzername oder E-Mail-Adresse', password: 'Passwort', login: 'Anmelden',
      secure: 'Geschützte Anmeldung mit serverseitiger Sitzung.', loggingIn: 'Anmeldung läuft …',
      invalidCredentials: 'Benutzername/E-Mail-Adresse oder Passwort ist falsch.', databaseUnavailable: 'Die Datenbank ist derzeit nicht erreichbar.',
      installationRequired: 'Sublevel muss zuerst installiert werden.', unknownError: 'Die Anmeldung ist fehlgeschlagen.'
    },
    EN_GB: {
      subtitle: 'Sign in', identifier: 'Username or email address', password: 'Password', login: 'Sign in',
      secure: 'Protected sign-in with a server-side session.', loggingIn: 'Signing in …',
      invalidCredentials: 'The username/email address or password is incorrect.', databaseUnavailable: 'The database is currently unavailable.',
      installationRequired: 'Sublevel must be installed first.', unknownError: 'Sign-in failed.'
    }
  };

  let language = localStorage.getItem('sublevel-login-language') === 'EN_GB' ? 'EN_GB' : 'DE_DE';
  const form = document.getElementById('login-form');
  const button = document.getElementById('login-button');
  const notice = document.getElementById('login-notice');

  function t(key) { return text[language][key] || text.DE_DE[key] || key; }

  function applyLanguage() {
    document.documentElement.lang = language === 'EN_GB' ? 'en-GB' : 'de-DE';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const value = t(element.dataset.i18n);
      if (value) element.textContent = value;
    });
    document.querySelectorAll('[data-language]').forEach(element => element.classList.toggle('active', element.dataset.language === language));
  }

  function showNotice(message, kind = 'error') {
    notice.textContent = message;
    notice.className = `notice visible ${kind}`;
  }

  async function login(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    notice.className = 'notice';
    button.disabled = true;
    button.textContent = t('loggingIn');

    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: data.identifier.trim(), password: data.password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = {
          invalid_credentials: t('invalidCredentials'),
          database_unavailable: payload.message || t('databaseUnavailable'),
          installation_required: t('installationRequired'),
        };
        throw new Error(messages[payload.error] || payload.message || t('unknownError'));
      }
      localStorage.setItem('sublevel-login-language', language);
      window.location.replace(payload.redirect || '/');
    } catch (error) {
      showNotice(error.message || t('unknownError'));
      button.disabled = false;
      button.textContent = t('login');
    }
  }

  document.querySelectorAll('[data-language]').forEach(element => {
    element.addEventListener('click', () => {
      language = element.dataset.language === 'EN_GB' ? 'EN_GB' : 'DE_DE';
      localStorage.setItem('sublevel-login-language', language);
      applyLanguage();
    });
  });
  form.addEventListener('submit', login);
  applyLanguage();
})();
