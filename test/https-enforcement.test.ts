import test from "node:test";
import assert from "node:assert/strict";
import { httpsEnforcer, securityHeadersMiddleware } from "../src/middleware/security.ts";

test("httpsEnforcer - redirects non-loopback plain HTTP requests to HTTPS even in development", () => {
  const origEnv = process.env.NODE_ENV;
  const origForce = process.env.FORCE_HTTPS;
  try {
    process.env.NODE_ENV = "development";
    delete process.env.FORCE_HTTPS;

    let nextCalled = false;
    let redirectedCode = 0;
    let redirectedUrl = "";

    const req: any = {
      headers: { host: "example.com" },
      url: "/problem/two-sum",
      secure: false,
    };
    const res: any = {
      setHeader: () => {},
      redirect: (code: number, url: string) => {
        redirectedCode = code;
        redirectedUrl = url;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    httpsEnforcer(req, res, next);
    assert.equal(nextCalled, false);
    assert.equal(redirectedCode, 301);
    assert.equal(redirectedUrl, "https://example.com/problem/two-sum");
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

test("httpsEnforcer - handles multi-proxy comma-separated x-forwarded-proto", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    // 1. First proxy reported http -> should redirect
    let redirectedCode = 0;
    let redirectedUrl = "";
    const req1: any = {
      headers: { host: "dsaviz.co", "x-forwarded-proto": "http, https" },
      url: "/compiler",
      secure: false,
    };
    const res1: any = {
      redirect: (code: number, url: string) => {
        redirectedCode = code;
        redirectedUrl = url;
      },
      setHeader: () => {},
    };
    httpsEnforcer(req1, res1, () => {});
    assert.equal(redirectedCode, 301);
    assert.equal(redirectedUrl, "https://dsaviz.co/compiler");

    // 2. First proxy reported https -> should pass through
    let passedNext = false;
    const req2: any = {
      headers: { host: "dsaviz.co", "x-forwarded-proto": "https, http" },
      url: "/compiler",
      secure: false,
    };
    const res2: any = {
      redirect: () => {},
    };
    httpsEnforcer(req2, res2, () => {
      passedNext = true;
    });
    assert.equal(passedNext, true);
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test("httpsEnforcer - recognizes x-forwarded-ssl and x-url-scheme", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    let sslPassed = false;
    const req1: any = {
      headers: { host: "dsaviz.co", "x-forwarded-ssl": "on" },
      url: "/dashboard",
      secure: false,
    };
    httpsEnforcer(req1, {} as any, () => {
      sslPassed = true;
    });
    assert.equal(sslPassed, true);

    let schemePassed = false;
    const req2: any = {
      headers: { host: "dsaviz.co", "x-url-scheme": "https" },
      url: "/dashboard",
      secure: false,
    };
    httpsEnforcer(req2, {} as any, () => {
      schemePassed = true;
    });
    assert.equal(schemePassed, true);
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test("httpsEnforcer - respects x-forwarded-host for public redirect target", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    let redirectedUrl = "";
    const headers: Record<string, string> = {};
    const req: any = {
      headers: {
        host: "internal-container-10-0-1:3000",
        "x-forwarded-host": "dsaviz.co",
        "x-forwarded-proto": "http",
      },
      url: "/live-interview",
      secure: false,
    };
    const res: any = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      redirect: (_code: number, url: string) => {
        redirectedUrl = url;
      },
    };

    httpsEnforcer(req, res, () => {});
    assert.equal(redirectedUrl, "https://dsaviz.co/live-interview");
    assert.equal(headers["Strict-Transport-Security"], "max-age=63072000; includeSubDomains; preload");
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

test("httpsEnforcer - ignores IPv6 loopback [::1] and 0.0.0.0 in production mode", () => {
  const origEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";

    let passedIpv6 = false;
    let redirectedIpv6 = false;
    const req1: any = {
      headers: { host: "[::1]:3000" },
      url: "/",
      secure: false,
    };
    const res1: any = {
      redirect: () => {
        redirectedIpv6 = true;
      },
    };
    httpsEnforcer(req1, res1, () => {
      passedIpv6 = true;
    });
    assert.equal(passedIpv6, true);
    assert.equal(redirectedIpv6, false);

    let passedZero = false;
    let redirectedZero = false;
    const req2: any = {
      headers: { host: "0.0.0.0:3000" },
      url: "/",
      secure: false,
    };
    const res2: any = {
      redirect: () => {
        redirectedZero = true;
      },
    };
    httpsEnforcer(req2, res2, () => {
      passedZero = true;
    });
    assert.equal(passedZero, true);
    assert.equal(redirectedZero, false);
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

