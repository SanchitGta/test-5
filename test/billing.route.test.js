'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRequestHandler } = require('../src/app');
const { createConnection } = require('../src/db/connection');

function withServer(fn) {
  const db = createConnection(':memory:');
  const server = http.createServer(createRequestHandler(db));
  return new Promise((resolve, reject) => {
    server.listen(0, async () => {
      try {
        const { port } = server.address();
        await fn(port, db);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
        db.close();
      }
    });
  });
}

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          const contentType = res.headers['content-type'] || '';
          const parsedBody = raw && contentType.includes('application/json') ? JSON.parse(raw) : raw;
          resolve({ statusCode: res.statusCode, headers: res.headers, body: parsedBody });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function createFeature(port, overrides = {}) {
  return request(port, 'POST', '/features', {
    featureId: 'dark-mode',
    displayName: 'Dark Mode',
    price: 4.99,
    ...overrides,
  });
}

test('GET /billing/:featureId/state returns 404 for an unknown feature', () =>
  withServer(async (port) => {
    const res = await request(port, 'GET', '/billing/does-not-exist/state');
    assert.equal(res.statusCode, 404);
  })
);

test('GET /billing/:featureId/state reports inactive with no subscription', () =>
  withServer(async (port) => {
    await createFeature(port);

    const res = await request(port, 'GET', '/billing/dark-mode/state');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.featureId, 'dark-mode');
    assert.equal(res.body.displayName, 'Dark Mode');
    assert.equal(res.body.price, 4.99);
    assert.equal(res.body.active, false);
    assert.equal(res.body.activatedAt, null);
  })
);

test('POST /billing/:featureId/activate returns 404 for an unknown feature', () =>
  withServer(async (port) => {
    const res = await request(port, 'POST', '/billing/does-not-exist/activate');
    assert.equal(res.statusCode, 404);
  })
);

test('POST /billing/:featureId/activate creates a Subscription and flips state to active', () =>
  withServer(async (port) => {
    await createFeature(port);

    const activated = await request(port, 'POST', '/billing/dark-mode/activate');
    assert.equal(activated.statusCode, 201);
    assert.equal(activated.body.featureId, 'dark-mode');
    assert.equal(activated.body.orgId, 'org_fixed');
    assert.equal(activated.body.status, 'active');
    assert.equal(typeof activated.body.activatedAt, 'string');

    const state = await request(port, 'GET', '/billing/dark-mode/state');
    assert.equal(state.body.active, true);
    assert.equal(state.body.activatedAt, activated.body.activatedAt);
  })
);

test('POST /billing/:featureId/activate is idempotent for an already-active subscription', () =>
  withServer(async (port) => {
    await createFeature(port);

    const first = await request(port, 'POST', '/billing/dark-mode/activate');
    const second = await request(port, 'POST', '/billing/dark-mode/activate');

    assert.equal(second.statusCode, 200);
    assert.equal(second.body.subscriptionId, first.body.subscriptionId);
  })
);

test('GET /billing/:featureId renders display name, price, and an Activate button when inactive', () =>
  withServer(async (port) => {
    await createFeature(port);

    const res = await request(port, 'GET', '/billing/dark-mode');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, /Dark Mode/);
    assert.match(res.body, /4\.99/);
    assert.match(res.body, /Activate/);
    assert.doesNotMatch(res.body, /Active since/);
  })
);

test('GET /billing/:featureId shows only "Active since <date>" once activated', () =>
  withServer(async (port) => {
    await createFeature(port);
    await request(port, 'POST', '/billing/dark-mode/activate');

    const res = await request(port, 'GET', '/billing/dark-mode');
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /Active since \d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(res.body, /Activate</);
  })
);

test('GET /billing/:featureId returns 404 for an unknown feature', () =>
  withServer(async (port) => {
    const res = await request(port, 'GET', '/billing/does-not-exist');
    assert.equal(res.statusCode, 404);
  })
);
