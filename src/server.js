'use strict';

const http = require('node:http');
const { createRequestHandler } = require('./app');

const PORT = process.env.PORT || 3000;

function start() {
  const server = http.createServer(createRequestHandler());
  server.listen(PORT, () => {
    console.log(`BillingBuilder listening on port ${PORT}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start };
