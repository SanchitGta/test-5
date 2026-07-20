'use strict';

function createSubscription(db, { subscriptionId, featureId, orgId, status, activatedAt }) {
  db.prepare(
    'INSERT INTO subscriptions (subscriptionId, featureId, orgId, status, activatedAt) VALUES (?, ?, ?, ?, ?)'
  ).run(subscriptionId, featureId, orgId, status, activatedAt);
  return getSubscriptionById(db, subscriptionId);
}

function getSubscriptionById(db, subscriptionId) {
  return db.prepare('SELECT * FROM subscriptions WHERE subscriptionId = ?').get(subscriptionId) || null;
}

function getActiveSubscriptionForFeatureOrg(db, featureId, orgId) {
  return (
    db
      .prepare(
        "SELECT * FROM subscriptions WHERE featureId = ? AND orgId = ? AND status = 'active' ORDER BY activatedAt DESC LIMIT 1"
      )
      .get(featureId, orgId) || null
  );
}

module.exports = { createSubscription, getSubscriptionById, getActiveSubscriptionForFeatureOrg };
