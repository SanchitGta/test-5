'use strict';

function createFeature(db, { featureId, displayName, price }) {
  db.prepare(
    'INSERT INTO features (featureId, displayName, price) VALUES (?, ?, ?)'
  ).run(featureId, displayName, price);
  return getFeatureById(db, featureId);
}

function getFeatureById(db, featureId) {
  return db.prepare('SELECT * FROM features WHERE featureId = ?').get(featureId) || null;
}

module.exports = { createFeature, getFeatureById };
