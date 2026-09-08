import test from "node:test";
import assert from "node:assert/strict";
import { httpsEnforcer, securityHeadersMiddleware } from "../src/middleware/security.ts";

test("httpsEnforcer - passes through requests in non-production environment", () => {
  const origEnv = process.env.NODE_ENV;
  const origForce = process.env.FORCE_HTTPS;
  try {
    process.env.NODE_ENV = "development";
    delete process.env.FORCE_HTTPS;

    let nextCalled = false;
    let redirected = false;

    const req: any = {
      headers: { host: "example.com" },
      url: "/problem/two-sum",
      secure: false,
    };
    const res: any = {
      redirect: () => {
        redirected = true;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    httpsEnforcer(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(redirected, false);
  } finally {
    process.env.NODE_ENV = origEnv;
    if (origForce !== undefined) process.env.FORCE_HTTPS = origForce;
    else delete process.env.FORCE_HTTPS;
  }
});

test("httpsEnforcer - redirects plain HTTP requests to HTTPS with 301 in production", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    let redirectedCode = 0;
    let redirectedUrl = "";
    let nextCalled = false;

    const req: any = {
      headers: { host: "dsaviz.co", "x-forwarded-proto": "http" },
      url: "/problem/two-sum",
      originalUrl: "/problem/two-sum",
      secure: false,
    };
    const res: any = {
      redirect: (code: number, url: string) => {
        redirectedCode = code;
        redirectedUrl = url;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    httpsEnforcer(req, res, next);
    assert.equal(redirectedCode, 301);
    assert.equal(redirectedUrl, "https://dsaviz.co/problem/two-sum");
    assert.equal(nextCalled, false);
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test("httpsEnforcer - passes through requests that are already HTTPS in production", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    let nextCalled = false;
    let redirected = false;

    const req: any = {
      headers: { host: "dsaviz.co", "x-forwarded-proto": "https" },
      url: "/problems",
      secure: true,
    };
    const res: any = {
      redirect: () => {
        redirected = true;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    httpsEnforcer(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(redirected, false);
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test("httpsEnforcer - ignores localhost requests in production mode", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    let nextCalled = false;
    let redirected = false;

    const req: any = {
      headers: { host: "localhost:3000" },
      url: "/",
      secure: false,
    };
    const res: any = {
      redirect: () => {
        redirected = true;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    httpsEnforcer(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(redirected, false);
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test("securityHeadersMiddleware - sets HSTS and upgrade-insecure-requests in production", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    const headers: Record<string, string> = {};
    const req: any = {};
    const res: any = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    securityHeadersMiddleware(req, res, next);
    assert.equal(nextCalled, true);
    assert.equal(headers["Strict-Transport-Security"], "max-age=63072000; includeSubDomains; preload");
    assert.match(headers["Content-Security-Policy"], /upgrade-insecure-requests/);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["X-Frame-Options"], "SAMEORIGIN");
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});
