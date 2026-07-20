'use strict';

// PRD section 7: "auth can be a stubbed/fixed org+user for testing purposes".
// Both the feature-config story and the billing-activation story read this
// same fixed identity instead of doing real authentication.
const FIXED_AUTH_CONTEXT = Object.freeze({
  orgId: 'org_fixed',
  userId: 'user_fixed',
});

function attachAuthContext(req) {
  req.auth = FIXED_AUTH_CONTEXT;
  return req;
}

module.exports = { FIXED_AUTH_CONTEXT, attachAuthContext };
