'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { attachAuthContext, FIXED_AUTH_CONTEXT } = require('../src/auth/stubAuth');

test('attaches a fixed org+user identity to a request', () => {
  const req = {};
  attachAuthContext(req);

  assert.equal(req.auth, FIXED_AUTH_CONTEXT);
  assert.equal(req.auth.orgId, 'org_fixed');
  assert.equal(req.auth.userId, 'user_fixed');
});
