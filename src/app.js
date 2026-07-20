'use strict';

const { attachAuthContext } = require('./auth/stubAuth');

// Empty app shell only — no UI or feature routes belong here yet.
const SHELL_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>BillingBuilder</title>
  </head>
  <body>
  </body>
</html>
`;

function createRequestHandler() {
  return function handleRequest(req, res) {
    attachAuthContext(req);

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(SHELL_HTML);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  };
}

module.exports = { createRequestHandler, SHELL_HTML };
