import type { Request, Response, NextFunction } from "express";

/**
 * Checks if a hostname belongs to a local development environment or loopback interface.
 */
export function isLocalhostHost(host?: string): boolean {
  if (!host) return false;
  let hostname = host.toLowerCase().trim();
  if (hostname.startsWith("[")) {
    const closeBracket = hostname.indexOf("]");
    if (closeBracket !== -1) {
      hostname = hostname.slice(1, closeBracket);
    }
  } else {
    hostname = hostname.split(":")[0] ?? hostname;
  }

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Extracts and sanitizes the requested hostname from proxy headers or the host header.
 * Prevents Host Header Injection and CRLF attacks.
 */
export function getSanitizedHost(req: Request): string | undefined {
  const headers = req?.headers || {};
  const rawForwardedHost = headers["x-forwarded-host"];
  const rawHost =
    typeof rawForwardedHost === "string"
      ? (rawForwardedHost.split(",")[0]?.trim() || headers.host)
      : headers.host;

  if (!rawHost) return undefined;

  // Sanitize host: allow only alphanumeric, dots, hyphens, colons (for ports), and IPv6 brackets
  const sanitized = rawHost.trim().replace(/[^a-zA-Z0-9.:\-_[\]]/g, "");
  return sanitized || undefined;
}

/**
 * Determines whether the current request is delivered over a secure TLS/HTTPS channel.
 * Handles direct TLS requests and reverse proxies (Cloudflare, AWS ALB, Nginx, Vercel, Lovable, Heroku, Azure).
 */
export function isSecureRequest(req: Request): boolean {
  if (req?.secure) return true;
  const headers = req?.headers || {};

  // 1. X-Forwarded-Proto (standard proxy protocol indicator; can be comma-delimited across chained proxies)
  const forwardedProto = headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    const firstProto = forwardedProto.split(",")[0]?.trim().toLowerCase();
    if (firstProto === "https") return true;
  }

  // 2. X-Forwarded-Ssl (Nginx, AWS ELB, Azure)
  const forwardedSsl = headers["x-forwarded-ssl"];
  if (typeof forwardedSsl === "string" && forwardedSsl.trim().toLowerCase() === "on") {
    return true;
  }

  // 3. X-Url-Scheme (Cloudflare, Caddy, HAProxy)
  const urlScheme = headers["x-url-scheme"];
  if (typeof urlScheme === "string" && urlScheme.trim().toLowerCase() === "https") {
    return true;
  }

  // 4. Front-End-Https (Microsoft IIS ARR)
  const frontEndHttps = headers["front-end-https"];
  if (typeof frontEndHttps === "string" && frontEndHttps.trim().toLowerCase() === "on") {
    return true;
  }

  return false;
}

/**
 * Force HTTPS Middleware (Strict Transport Security & Secure Network Redirection)
 * Handles direct TLS requests and requests behind reverse proxies.
 * Redirects unencrypted HTTP traffic to HTTPS via 301 Permanent Redirect on all non-loopback hosts.
 */
export function httpsEnforcer(req: Request, res: Response, next: NextFunction) {
  const isSecure = isSecureRequest(req);
  const host = getSanitizedHost(req);
  const isLocal = isLocalhostHost(host);
  const forceHttpsOnLocal = process.env.FORCE_HTTPS === "true";

  if (!isSecure && host && (!isLocal || forceHttpsOnLocal)) {
    // Defense-in-depth: Attach HSTS and security headers directly to the redirect response
    if (typeof res.setHeader === "function") {
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Cache-Control", "no-store");
    }

    // 301 Permanent Redirect to HTTPS for secure transport
    return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
  }

  next();
}

/**
 * Hardened HTTP Security Headers Middleware (OWASP Defense-in-Depth & HSTS)
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  if (typeof res.setHeader === "function") {
    const host = getSanitizedHost(req);
    const isLocal = isLocalhostHost(host);
    const isSecure = isSecureRequest(req);
    const enforceStrictTls = !isLocal || isSecure || process.env.NODE_ENV === "production" || process.env.FORCE_HTTPS === "true";

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("Origin-Agent-Cluster", "?1");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), browsing-topics=(), interest-cohort=()"
    );

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.gstatic.com https: blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
      "worker-src 'self' blob: https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https: http:",
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.google.com",
      enforceStrictTls ? "connect-src 'self' https: wss:" : "connect-src 'self' http: https: ws: wss:",
      "media-src 'self' blob: data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com https://github.com",
      "frame-ancestors 'self'",
      enforceStrictTls ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; ");
    res.setHeader("Content-Security-Policy", cspDirectives);

    if (enforceStrictTls) {
      // 2 years max-age with preload and includeSubDomains for strict network security
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }
  }

  next();
}


