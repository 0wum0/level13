import path from 'node:path';

function noStore(response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
}

export function registerPageRoutes(app, { rootDirectory, runtimeState }) {
  const viewsDirectory = path.join(rootDirectory, 'server', 'views');

  app.get('/install', (request, response) => {
    noStore(response);
    if (runtimeState.installation) {
      response.redirect(request.auth?.user ? '/' : '/login');
      return;
    }
    response.sendFile(path.join(viewsDirectory, 'installer.html'));
  });

  app.get('/login', (request, response) => {
    noStore(response);
    if (!runtimeState.installation) {
      response.redirect('/install');
      return;
    }
    if (request.auth?.user) {
      response.redirect('/');
      return;
    }
    response.sendFile(path.join(viewsDirectory, 'login.html'));
  });

  app.get('/guardian', (request, response) => {
    noStore(response);
    if (!runtimeState.installation) {
      response.redirect('/install');
      return;
    }
    if (!request.auth?.user) {
      response.redirect('/login');
      return;
    }
    if (request.auth.user.role !== 'guardian') {
      response.redirect('/');
      return;
    }
    response.sendFile(path.join(viewsDirectory, 'guardian.html'));
  });

  const gameRoute = (request, response) => {
    noStore(response);
    if (!runtimeState.installation) {
      response.redirect('/install');
      return;
    }
    if (!request.auth?.user) {
      response.redirect('/login');
      return;
    }
    response.sendFile(path.join(rootDirectory, 'index.html'));
  };

  app.get('/', gameRoute);
  app.get('/index.html', gameRoute);
}
