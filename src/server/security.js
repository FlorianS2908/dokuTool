const contentSecurityPolicy = [
  ["default-src", "'self'"],
  ["base-uri", "'self'"],
  ["connect-src", "'self'"],
  ["font-src", "'self'"],
  ["form-action", "'self'"],
  ["frame-ancestors", "'none'"],
  ["img-src", "'self'", 'data:'],
  ["object-src", "'none'"],
  ["script-src", "'self'"],
  ["style-src", "'self'"]
]
  .map((directive) => directive.join(' '))
  .join('; ');

export function securityHeaders(_req, res, next) {
  res.setHeader('Content-Security-Policy', contentSecurityPolicy);
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}
