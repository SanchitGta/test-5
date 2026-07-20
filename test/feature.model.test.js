'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConnection } = require('../src/db/connection');
const { createFeature, getFeatureById } = require('../src/models/feature');

test('creates and reads back a feature', () => {
  const db = createConnection(':memory:');

  const created = createFeature(db, {
    featureId: 'dark-mode',
    displayName: 'Dark Mode',
    price: 4.99,
  });

  assert.equal(created.featureId, 'dark-mode');
  assert.equal(created.displayName, 'Dark Mode');
  assert.equal(created.price, 4.99);

  const fetched = getFeatureById(db, 'dark-mode');
  assert.deepEqual(fetched, created);

  db.close();
});

test('returns null for an unknown feature', () => {
  const db = createConnection(':memory:');
  assert.equal(getFeatureById(db, 'does-not-exist'), null);
  db.close();
});
