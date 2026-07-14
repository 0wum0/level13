import { createServer } from 'node:http';

const port = Number.parseInt(process.env.PORT || '3000', 10);

function safeError(error) {
  const stack = String(error?.stack || '')
    .split('\n')
    .slice(0, 8)
    .join('\n');
  return {
    name: error?.name || 'Error',
    code: error?.code || 'STARTUP_FAILED',
    message: error?.message || String(error || 'Unbekannter Startfehler'),
    stack,
  };
}

function startDiagnosticServer(error) {
  const startupError = safeError(error);
  const server = createServer((request, response) => {
    response.statusCode = 200;
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    const payload = {
      ok: false,
      service: 'sublevel',
      startupFailed: true,
      startupError,
      node: process.version,
      port,
      timestamp: new Date().toISOString(),
    };

    if (request.url === '/healthz' || request.headers.accept?.includes('application/json')) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(payload, null, 2));
      return;
    }

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sublevel – Startdiagnose</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#03090c;color:#ecf7f5;font:16px/1.5 system-ui,sans-serif;padding:24px;box-sizing:border-box}
    main{width:min(860px,100%);background:#0a171c;border:1px solid #29464c;border-radius:18px;padding:28px;box-shadow:0 24px 80px rgba(0,0,0,.45)}
    h1{margin-top:0;color:#75e0d1}code,pre{background:#061014;border:1px solid #20383d;border-radius:10px}code{padding:.15em .35em}pre{padding:16px;white-space:pre-wrap;overflow-wrap:anywhere;color:#ffd7a3}p{color:#bfd2cf}
  </style>
</head>
<body>
<main>
  <h1>Sublevel konnte nicht vollständig starten</h1>
  <p>Der Node-Prozess läuft jetzt weiter und zeigt den tatsächlichen Startfehler statt eines anonymen Hostinger-503.</p>
  <p><strong>Fehlercode:</strong> <code>${escapeHtml(startupError.code)}</code></p>
  <p><strong>Meldung:</strong> ${escapeHtml(startupError.message)}</p>
  <pre>${escapeHtml(startupError.stack)}</pre>
  <p>Die gleichen Angaben stehen maschinenlesbar unter <code>/healthz</code>.</p>
</main>
</body>
</html>`);
  });

  server.on('error', serverError => {
    console.error('[sublevel] diagnostic server failed:', serverError);
    process.exitCode = 1;
  });

  server.listen(port, '0.0.0.0', () => {
    console.error('[sublevel] application startup failed:', startupError);
    console.log(`[sublevel] diagnostic server listening on 0.0.0.0:${port}`);
  });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

try {
  await import('./server-main.js');
} catch (error) {
  startDiagnosticServer(error);
}
