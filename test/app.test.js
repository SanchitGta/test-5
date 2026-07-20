'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRequestHandler } = require('../src/app');

function withServer(fn) {
  const server = http.createServer(createRequestHandler());
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
      }
    });
  });
}

test('boots and serves the empty app shell on GET /', () =>
  withServer((port) =>
    new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            assert.equal(res.statusCode, 200);
            assert.match(res.headers['content-type'], /text\/html/);
            assert.match(body, /<html/);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    })
  )
);

test('attaches the fixed auth context to every request', () => {
  const req = { method: 'GET', url: '/' };
  const res = {
    writeHead() {},
    end() {},
  };

  createRequestHandler()(req, res);

  assert.equal(req.auth.orgId, 'org_fixed');
  assert.equal(req.auth.userId, 'user_fixed');
});
