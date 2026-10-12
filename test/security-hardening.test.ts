import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeUntrustedObject,
  prototypePollutionGuardMiddleware,
  csrfFetchMetadataGuard,
} from '../src/middleware/security';
import { isSealedGithubTokenEnvelope } from '../src/lib/github-sync';
import { consumeOAuthNonceOnce } from '../src/lib/redis-cache';

test('sanitizeUntrustedObject - strips __proto__, constructor, and prototype from deeply nested structures', () => {
  const payload = JSON.parse(`{
    "safeField": "hello",
    "nested": {
      "__proto__": { "polluted": true },
      "constructor": { "prototype": { "polluted": true } },
      "array": [1, { "__proto__": { "isAdmin": true } }, 3]
    }
  }`);

  sanitizeUntrustedObject(payload);

  assert.strictEqual(payload.safeField, 'hello');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(payload.nested, '__proto__'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(payload.nested, 'constructor'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(payload.nested.array[1], '__proto__'), false);
  assert.strictEqual(({} as any).polluted, undefined);
  assert.strictEqual(({} as any).isAdmin, undefined);
});

test('prototypePollutionGuardMiddleware - sanitizes req.body, req.query, and req.params', () => {
  const req: any = {
    body: JSON.parse('{"__proto__": {"admin": true}, "title": "Graph"}'),
    query: JSON.parse('{"constructor": "bad", "page": "1"}'),
    params: { slug: 'two-sum' },
  };
  const res: any = {};
  let nextCalled = false;

  prototypePollutionGuardMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(req.body, '__proto__'), false);
  assert.strictEqual(req.body.title, 'Graph');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(req.query, 'constructor'), false);
  assert.strictEqual(req.query.page, '1');
});

test('csrfFetchMetadataGuard - blocks cross-site state mutating requests (POST, PUT, DELETE)', () => {
  const makeReq = (method: string, secFetchSite: string, origin?: string, host = 'dsavizco.vercel.app') => ({
    method,
    headers: {
      'sec-fetch-site': secFetchSite,
      ...(origin ? { origin } : {}),
      host,
    },
  });

  // 1. GET requests should always pass through even if cross-site
  let nextCalled = false;
  csrfFetchMetadataGuard(makeReq('GET', 'cross-site') as any, {} as any, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true);

  // 2. Cross-site POST should be blocked with 403
  let blockedStatus = 0;
  let blockedJson: any = null;
  const mockRes: any = {
    status(code: number) {
      blockedStatus = code;
      return {
        json(data: any) {
          blockedJson = data;
        },
      };
    },
  };

  csrfFetchMetadataGuard(makeReq('POST', 'cross-site') as any, mockRes, () => {
    assert.fail('Should not call next for cross-site POST');
  });
  assert.strictEqual(blockedStatus, 403);
  assert.match(blockedJson.error, /Cross-site state-mutating request blocked/);

  // 3. Same-origin POST should be permitted
  let sameOriginNext = false;
  csrfFetchMetadataGuard(
    makeReq('POST', 'same-origin', 'https://dsavizco.vercel.app', 'dsavizco.vercel.app') as any,
    mockRes,
    () => {
      sameOriginNext = true;
    }
  );
  assert.strictEqual(sameOriginNext, true);

  // 4. Mismatched origin on POST should be blocked with 403
  let mismatchedStatus = 0;
  const mismatchRes: any = {
    status(code: number) {
      mismatchedStatus = code;
      return { json: () => {} };
    },
  };
  csrfFetchMetadataGuard(
    makeReq('POST', 'same-site', 'https://malicious-site.com', 'dsavizco.vercel.app') as any,
    mismatchRes,
    () => {
      assert.fail('Should not call next for mismatched Origin');
    }
  );
  assert.strictEqual(mismatchedStatus, 403);
});

test('isSealedGithubTokenEnvelope - only accepts enc_v1: sealed tokens', () => {
  assert.strictEqual(isSealedGithubTokenEnvelope(null), false);
  assert.strictEqual(isSealedGithubTokenEnvelope(undefined), false);
  assert.strictEqual(isSealedGithubTokenEnvelope('gho_1234567890abcdefghijklmnopqrstuvwxyz'), false);
  assert.strictEqual(isSealedGithubTokenEnvelope('ghp_abcdefghijklmnopqrstuvwxyz1234567890'), false);
  assert.strictEqual(isSealedGithubTokenEnvelope('enc_v1:'), false); // Too short
  assert.strictEqual(isSealedGithubTokenEnvelope('enc_v1:0123456789abcdef0123456789abcdef:abc'), true);
});

test('consumeOAuthNonceOnce - atomically claims nonce and prevents replay attacks', async () => {
  const nonce = `test_nonce_${Date.now()}_${Math.random()}`;
  const expiry = Date.now() + 60_000;

  // First consumption succeeds
  const firstClaim = await consumeOAuthNonceOnce(nonce, expiry);
  assert.strictEqual(firstClaim, true);

  // Replay attempt fails
  const replayClaim = await consumeOAuthNonceOnce(nonce, expiry);
  assert.strictEqual(replayClaim, false);
});
