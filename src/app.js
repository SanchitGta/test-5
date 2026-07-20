'use strict';

const { randomUUID } = require('node:crypto');
const { attachAuthContext } = require('./auth/stubAuth');
const { createFeature, getFeatureById } = require('./models/feature');
const {
  createSubscription,
  getActiveSubscriptionForFeatureOrg,
} = require('./models/subscription');

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

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// PRD 3.2: billing state is derived from whether an active Subscription exists
// for this feature + the caller's org — there is no separate "flag" record.
function getBillingState(db, featureId, orgId) {
  const feature = getFeatureById(db, featureId);
  if (!feature) return null;

  const subscription = getActiveSubscriptionForFeatureOrg(db, featureId, orgId);
  return {
    featureId: feature.featureId,
    displayName: feature.displayName,
    price: feature.price,
    active: Boolean(subscription),
    activatedAt: subscription ? subscription.activatedAt : null,
  };
}

function handleGetBillingState(db, featureId, req, res) {
  const state = getBillingState(db, featureId, req.auth.orgId);
  if (!state) {
    sendJson(res, 404, { error: `Feature '${featureId}' not found` });
    return;
  }
  sendJson(res, 200, state);
}

function handleActivate(db, featureId, req, res) {
  if (!getFeatureById(db, featureId)) {
    sendJson(res, 404, { error: `Feature '${featureId}' not found` });
    return;
  }

  const orgId = req.auth.orgId;
  const existing = getActiveSubscriptionForFeatureOrg(db, featureId, orgId);
  if (existing) {
    sendJson(res, 200, existing);
    return;
  }

  const subscription = createSubscription(db, {
    subscriptionId: randomUUID(),
    featureId,
    orgId,
    status: 'active',
    activatedAt: new Date().toISOString(),
  });
  sendJson(res, 201, subscription);
}

// PRD 3.2: no active subscription -> display name, price, Activate button.
// Active subscription -> "Active since <date>" and nothing else.
function renderBillingPage(state) {
  const body = state.active
    ? `<p>Active since ${escapeHtml(state.activatedAt.slice(0, 10))}</p>`
    : `<h1>${escapeHtml(state.displayName)}</h1>
    <p>${escapeHtml(state.price)}</p>
    <button id="activate-btn" type="button">Activate</button>
    <script>
      document.getElementById('activate-btn').addEventListener('click', function () {
        fetch(${JSON.stringify(`/billing/${state.featureId}/activate`)}, { method: 'POST' })
          .then(function () { location.reload(); });
      });
    </script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(state.displayName)} — Billing</title>
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

function handleBillingPage(db, featureId, req, res) {
  const state = getBillingState(db, featureId, req.auth.orgId);
  if (!state) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderBillingPage(state));
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

    const billingStateMatch = req.method === 'GET' && req.url.match(/^\/billing\/([^/]+)\/state$/);
    if (billingStateMatch) {
      handleGetBillingState(db, decodeURIComponent(billingStateMatch[1]), req, res);
      return;
    }

    const activateMatch = req.method === 'POST' && req.url.match(/^\/billing\/([^/]+)\/activate$/);
    if (activateMatch) {
      handleActivate(db, decodeURIComponent(activateMatch[1]), req, res);
      return;
    }

    const billingPageMatch = req.method === 'GET' && req.url.match(/^\/billing\/([^/]+)$/);
    if (billingPageMatch) {
      handleBillingPage(db, decodeURIComponent(billingPageMatch[1]), req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  };
}

module.exports = { createRequestHandler, SHELL_HTML };
