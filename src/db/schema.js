'use strict';

// PRD section 5.1 — one row per feature config, unique per org.
const CREATE_FEATURES_TABLE = `
  CREATE TABLE IF NOT EXISTS features (
    featureId TEXT PRIMARY KEY,
    displayName TEXT NOT NULL,
    price REAL NOT NULL
  )
`;

// PRD section 5.2 — status is TEXT because v0 only ever writes 'active'.
const CREATE_SUBSCRIPTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    subscriptionId TEXT PRIMARY KEY,
    featureId TEXT NOT NULL REFERENCES features(featureId),
    orgId TEXT NOT NULL,
    status TEXT NOT NULL,
    activatedAt TEXT NOT NULL
  )
`;

function applySchema(db) {
  db.exec(CREATE_FEATURES_TABLE);
  db.exec(CREATE_SUBSCRIPTIONS_TABLE);
}

module.exports = { applySchema };
