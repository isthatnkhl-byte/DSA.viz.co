import type { Request, Response, NextFunction } from "express";

/**
 * Force HTTPS Middleware (Strict Transport Security & Secure Network Redirection)
 * Handles direct TLS requests and requests behind reverse proxies (Cloudflare, AWS ALB, Nginx, Vercel, Lovable, Heroku).
 */
export function httpsEnforcer(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "production" || process.env.FORCE_HTTPS === "true") {
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
    const host = req.headers.host;
    const isLocalhost = host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"));

    if (proto !== "https" && !isLocalhost && host) {
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
  next();
}
