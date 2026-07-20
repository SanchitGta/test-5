'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createConnection } = require('../src/db/connection');
const { createFeature } = require('../src/models/feature');
const {
  createSubscription,
  getSubscriptionById,
  getActiveSubscriptionForFeatureOrg,
} = require('../src/models/subscription');

test('creates and reads back a subscription for a feature', () => {
  const db = createConnection(':memory:');
  createFeature(db, { featureId: 'dark-mode', displayName: 'Dark Mode', price: 4.99 });

  const activatedAt = new Date('2026-07-20T00:00:00.000Z').toISOString();
  const created = createSubscription(db, {
    subscriptionId: 'sub_1',
    featureId: 'dark-mode',
    orgId: 'org_fixed',
    status: 'active',
    activatedAt,
  });

  assert.equal(created.subscriptionId, 'sub_1');
  assert.equal(created.featureId, 'dark-mode');
  assert.equal(created.orgId, 'org_fixed');
  assert.equal(created.status, 'active');
  assert.equal(created.activatedAt, activatedAt);

  const fetched = getSubscriptionById(db, 'sub_1');
  assert.deepEqual(fetched, created);

  db.close();
});

test('returns null for an unknown subscription', () => {
  const db = createConnection(':memory:');
  assert.equal(getSubscriptionById(db, 'does-not-exist'), null);
  db.close();
});

test('getActiveSubscriptionForFeatureOrg returns null when no subscription exists', () => {
  const db = createConnection(':memory:');
  createFeature(db, { featureId: 'dark-mode', displayName: 'Dark Mode', price: 4.99 });

  assert.equal(getActiveSubscriptionForFeatureOrg(db, 'dark-mode', 'org_fixed'), null);
  db.close();
});

test('getActiveSubscriptionForFeatureOrg finds the active subscription for the org', () => {
  const db = createConnection(':memory:');
  createFeature(db, { featureId: 'dark-mode', displayName: 'Dark Mode', price: 4.99 });

  const activatedAt = new Date('2026-07-20T00:00:00.000Z').toISOString();
  createSubscription(db, {
    subscriptionId: 'sub_1',
    featureId: 'dark-mode',
    orgId: 'org_fixed',
    status: 'active',
    activatedAt,
  });

  const found = getActiveSubscriptionForFeatureOrg(db, 'dark-mode', 'org_fixed');
  assert.equal(found.subscriptionId, 'sub_1');

  assert.equal(getActiveSubscriptionForFeatureOrg(db, 'dark-mode', 'other_org'), null);
  db.close();
});
