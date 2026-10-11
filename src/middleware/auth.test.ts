import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth, type AuthRequest } from './auth';
import type { Response, NextFunction } from 'express';

test('requireAuth - rejects requests without Authorization header', async () => {
  const req = {
    headers: {},
  } as unknown as AuthRequest;

  let statusCode = 0;
  let responseBody: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  await requireAuth(req, res, next);

  assert.equal(statusCode, 401);
  assert.equal(nextCalled, false);
  assert.match(responseBody.error, /Unauthorized/);
});

test('requireAuth - rejects forged unverified JWT payload without signature bypass', async () => {
  // Construct an unverified forged JWT payload
  const fakeHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64");
  const fakePayload = Buffer.from(JSON.stringify({ uid: "attacker_victim_uid", sub: "victim_123", email: "victim@target.com" })).toString("base64");
  const forgedToken = `${fakeHeader}.${fakePayload}.fake_signature`;

  const req = {
    headers: {
      authorization: `Bearer ${forgedToken}`,
    },
  } as unknown as AuthRequest;

  let statusCode = 0;
  let responseBody: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: any) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  await requireAuth(req, res, next);

  // Must reject with 401 Unauthorized and NOT call next() with the unverified uid
  assert.equal(statusCode, 401);
  assert.equal(nextCalled, false);
  assert.equal(req.user, undefined);
  assert.match(responseBody.error, /Unauthorized/);
});

test('requireAuth - rejects local-dev-token and mock user header bypasses', async () => {
  const req = {
    headers: {
      authorization: 'Bearer local-dev-token',
      'x-test-mock-user-id': 'test_engineer_42',
      'x-test-mock-email': 'dev@dsaviz.internal',
    },
  } as unknown as AuthRequest;

  let statusCode = 0;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  await requireAuth(req, res, next);

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 401);
  assert.equal(req.user, undefined);
});
