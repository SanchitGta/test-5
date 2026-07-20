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
        await fn(port);
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
          resolve({ statusCode: res.statusCode, body: raw ? JSON.parse(raw) : null });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test('POST /features creates a config and GET /features/:featureId returns it', () =>
  withServer(async (port) => {
    const created = await request(port, 'POST', '/features', {
      featureId: 'dark-mode',
      displayName: 'Dark Mode',
      price: 4.99,
    });

    assert.equal(created.statusCode, 201);
    assert.equal(created.body.featureId, 'dark-mode');
    assert.equal(created.body.displayName, 'Dark Mode');
    assert.equal(created.body.price, 4.99);

    const fetched = await request(port, 'GET', '/features/dark-mode');
    assert.equal(fetched.statusCode, 200);
    assert.deepEqual(fetched.body, created.body);
  })
);

test('GET /features/:featureId returns 404 for an unknown feature', () =>
  withServer(async (port) => {
    const res = await request(port, 'GET', '/features/does-not-exist');
    assert.equal(res.statusCode, 404);
  })
);

test('POST /features rejects an invalid featureId slug', () =>
  withServer(async (port) => {
    const res = await request(port, 'POST', '/features', {
      featureId: 'Not A Slug',
      displayName: 'Bad',
      price: 1,
    });
    assert.equal(res.statusCode, 400);
  })
);

test('POST /features rejects a missing displayName or price', () =>
  withServer(async (port) => {
    const res = await request(port, 'POST', '/features', { featureId: 'no-price' });
    assert.equal(res.statusCode, 400);
  })
);

test('POST /features rejects a duplicate featureId', () =>
  withServer(async (port) => {
    await request(port, 'POST', '/features', {
      featureId: 'dark-mode',
      displayName: 'Dark Mode',
      price: 4.99,
    });

    const res = await request(port, 'POST', '/features', {
      featureId: 'dark-mode',
      displayName: 'Dark Mode Again',
      price: 5.99,
    });

    assert.equal(res.statusCode, 409);
  })
);
