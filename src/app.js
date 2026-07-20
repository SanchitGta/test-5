'use strict';

const { attachAuthContext } = require('./auth/stubAuth');
const { createFeature, getFeatureById } = require('./models/feature');

// Empty app shell only — no UI belongs here yet.
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

// PRD 3.1: "Feature ID — lowercase slug, unique within the org."
const FEATURE_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function isValidFeatureInput({ featureId, displayName, price } = {}) {
  return (
    typeof featureId === 'string' &&
    FEATURE_ID_PATTERN.test(featureId) &&
    typeof displayName === 'string' &&
    displayName.trim().length > 0 &&
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price >= 0
  );
}

async function handleCreateFeature(db, req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (!isValidFeatureInput(body)) {
    sendJson(res, 400, {
      error: 'featureId (lowercase slug), displayName, and price (non-negative number) are required',
    });
    return;
  }

  const { featureId, displayName, price } = body;

  if (getFeatureById(db, featureId)) {
    sendJson(res, 409, { error: `Feature '${featureId}' already exists` });
    return;
  }

  sendJson(res, 201, createFeature(db, { featureId, displayName, price }));
}

function handleGetFeature(db, featureId, res) {
  const feature = getFeatureById(db, featureId);
  if (!feature) {
    sendJson(res, 404, { error: `Feature '${featureId}' not found` });
    return;
  }
  sendJson(res, 200, feature);
}

function createRequestHandler(db) {
  return function handleRequest(req, res) {
    attachAuthContext(req);

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(SHELL_HTML);
      return;
    }

    if (req.method === 'POST' && req.url === '/features') {
      handleCreateFeature(db, req, res).catch(() => {
        sendJson(res, 500, { error: 'Internal Server Error' });
      });
      return;
    }

    const featureMatch = req.method === 'GET' && req.url.match(/^\/features\/([^/]+)$/);
    if (featureMatch) {
      handleGetFeature(db, decodeURIComponent(featureMatch[1]), res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  };
}

module.exports = { createRequestHandler, SHELL_HTML };
