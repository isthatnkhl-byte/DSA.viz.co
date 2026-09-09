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
  const rawForwardedHost = req.headers["x-forwarded-host"];
  const rawHost =
    typeof rawForwardedHost === "string"
      ? (rawForwardedHost.split(",")[0]?.trim() || req.headers.host)
      : req.headers.host;

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
  if (req.secure) return true;

  // 1. X-Forwarded-Proto (standard proxy protocol indicator; can be comma-delimited across chained proxies)
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    const firstProto = forwardedProto.split(",")[0]?.trim().toLowerCase();
    if (firstProto === "https") return true;
  }

  // 2. X-Forwarded-Ssl (Nginx, AWS ELB, Azure)
  const forwardedSsl = req.headers["x-forwarded-ssl"];
  if (typeof forwardedSsl === "string" && forwardedSsl.trim().toLowerCase() === "on") {
    return true;
  }

  // 3. X-Url-Scheme (Cloudflare, Caddy, HAProxy)
  const urlScheme = req.headers["x-url-scheme"];
  if (typeof urlScheme === "string" && urlScheme.trim().toLowerCase() === "https") {
    return true;
  }

  // 4. Front-End-Https (Microsoft IIS ARR)
  const frontEndHttps = req.headers["front-end-https"];
  if (typeof frontEndHttps === "string" && frontEndHttps.trim().toLowerCase() === "on") {
    return true;
  }

  return false;
}

/**
 * Force HTTPS Middleware (Strict Transport Security & Secure Network Redirection)
 * Handles direct TLS requests and requests behind reverse proxies.
 * Redirects unencrypted HTTP traffic to HTTPS via 301 Permanent Redirect in production.
 */
export function httpsEnforcer(req: Request, res: Response, next: NextFunction) {
  const isProductionOrForced = process.env.NODE_ENV === "production" || process.env.FORCE_HTTPS === "true";

  if (isProductionOrForced) {
    const isSecure = isSecureRequest(req);
    const host = getSanitizedHost(req);
    const isLocal = isLocalhostHost(host);

    if (!isSecure && !isLocal && host) {
      // Defense-in-depth: Attach HSTS and security headers directly to the redirect response
      if (typeof res.setHeader === "function") {
        res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
      }

      // 301 Permanent Redirect to HTTPS for secure transport
      return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
    }
  }

  next();
}

/**
 * Hardened HTTP Security Headers Middleware (OWASP Defense-in-Depth & HSTS)
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  if (typeof res.setHeader === "function") {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");

    const isProductionOrForced = process.env.NODE_ENV === "production" || process.env.FORCE_HTTPS === "true";
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https: wss:",
      "media-src 'self' blob: data:",
      "frame-ancestors 'self'",
      isProductionOrForced ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; ");
    res.setHeader("Content-Security-Policy", cspDirectives);

    if (isProductionOrForced) {
      // 2 years max-age with preload and includeSubDomains for strict network security
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }
  }

  next();
}

