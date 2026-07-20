'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { applySchema } = require('./schema');

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'billingbuilder.db');

function createConnection(dbPath) {
  const resolvedPath = dbPath || process.env.DB_PATH || DEFAULT_DB_PATH;

  if (resolvedPath !== ':memory:') {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  applySchema(db);
  return db;
}

module.exports = { createConnection, DEFAULT_DB_PATH };
