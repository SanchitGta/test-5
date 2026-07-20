'use strict';

const http = require('node:http');
const { createRequestHandler } = require('./app');
const { createConnection } = require('./db/connection');

const PORT = process.env.PORT || 3000;

function start() {
  const db = createConnection();
  const server = http.createServer(createRequestHandler(db));
  server.listen(PORT, () => {
    console.log(`BillingBuilder listening on port ${PORT}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
