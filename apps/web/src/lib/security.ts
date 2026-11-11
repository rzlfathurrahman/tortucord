import { NextRequest, NextResponse } from 'next/server';
import { redis } from './redis';

// Security configuration & rate limits
export const RATE_LIMITS = {
  // Public registration: 5 requests per 10 minutes (600s) per IP
  REGISTER: {
    limit: 5,
    windowSec: 600,
  },
  // Global burst registration protector: max 30 per minute across all callers
  GLOBAL_REGISTER: {
    limit: 30,
    windowSec: 60,
  },
  // Status check: 60 requests per minute (60s) per IP
  STATUS: {
    limit: 60,
    windowSec: 60,
  },
  // Info / divisions directory: 120 requests per minute (60s) per IP
  INFO: {
    limit: 120,
    windowSec: 60,
  },
} as const;

export const ALLOWED_DIVISIONS = [
  'Backend Developer',
  'Frontend Developer',
  'UI/UX Designer',
  'Quality Assurance',
  'Product Manager',
] as const;

export type AllowedDivision = (typeof ALLOWED_DIVISIONS)[number];

const DIVISION_ALIASES: Record<string, AllowedDivision> = {
  qa: 'Quality Assurance',
  'quality assurance': 'Quality Assurance',
  pm: 'Product Manager',
  'product manager': 'Product Manager',
  uiux: 'UI/UX Designer',
  'ui/ux': 'UI/UX Designer',
  'ui/ux designer': 'UI/UX Designer',
  backend: 'Backend Developer',
  'backend developer': 'Backend Developer',
  frontend: 'Frontend Developer',
  'frontend developer': 'Frontend Developer',
};

/**
 * Safely extracts client IP address across various reverse proxies & Cloudflare
 */
export function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return sanitizeIp(cfIp);

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return sanitizeIp(realIp);

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return sanitizeIp(firstIp);
  }

  // Next.js standard ip property or fallback
  const ip = (request as any).ip || '127.0.0.1';
  return sanitizeIp(ip);
}

function sanitizeIp(rawIp: string): string {
  let cleaned = rawIp.trim();
  // Strip IPv4-mapped IPv6 prefix (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  // Strip any characters not valid in IPv4/IPv6 to prevent key-injection attacks
  return cleaned.replace(/[^a-fA-F0-9:.]/g, '').slice(0, 45) || '127.0.0.1';
}

/**
 * Standard Security and CORS headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Preflight OPTIONS response helper
 */
export function handleCorsPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getSecurityHeaders(),
  });
}

/**
 * Check rate limit for a specific client IP and action
 */
export async function enforceRateLimit(
  ip: string,
  action: keyof typeof RATE_LIMITS
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
  responseHeaders: Record<string, string>;
}> {
  const cfg = RATE_LIMITS[action];
  const rateLimitKey = `rl:magang:${action.toLowerCase()}:${ip}`;
  const result = await redis.rateLimit(rateLimitKey, cfg.limit, cfg.windowSec);

  const responseHeaders: Record<string, string> = {
    ...getSecurityHeaders(),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (!result.allowed) {
    responseHeaders['Retry-After'] = String(result.retryAfter);
  }

  return {
    ...result,
    responseHeaders,
  };
}

/**
 * Recursively inspects object keys to guard against Prototype Pollution attacks
 */
export function hasPrototypePollution(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;

  const stack: unknown[] = [obj];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    for (const key of Object.getOwnPropertyNames(current)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      const val = (current as any)[key];
      if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }

  return false;
}

/**
 * Sanitize strings against control characters, null bytes, and dangerous HTML/script injections
 */
export function sanitizeString(val: unknown, maxLength = 200): string {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Strip null bytes and control chars
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Strip HTML tags to neutralize XSS
  str = str.replace(/<[^>]*>/g, '');

  // Neutralize script execution schemes
  str = str.replace(/(javascript|vbscript|data):/gi, '');

  // Trim whitespace and limit length
  return str.trim().slice(0, maxLength);
}

/**
 * Safely parse incoming JSON with payload size ceiling and prototype pollution check
 */
export async function parseSafeJson<T = any>(
  request: NextRequest,
  maxBytes = 32768 // 32 KB default limit
): Promise<
  | { success: true; data: T }
  | { success: false; error: string; status: number; headers: Record<string, string> }
> {
  const headers = getSecurityHeaders();

  // 1. Verify Content-Type
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      success: false,
      error: 'Content-Type harus berupa application/json',
      status: 415,
      headers,
    };
  }

  // 2. Verify Content-Length header if provided
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > maxBytes) {
    return {
      success: false,
      error: `Payload terlalu besar. Maksimum ${Math.round(maxBytes / 1024)} KB.`,
      status: 413,
      headers,
    };
  }

  // 3. Read body and enforce size ceiling
  try {
    const rawText = await request.text();
    if (new TextEncoder().encode(rawText).length > maxBytes) {
      return {
        success: false,
        error: `Payload terlalu besar. Maksimum ${Math.round(maxBytes / 1024)} KB.`,
        status: 413,
        headers,
      };
    }

    if (!rawText.trim()) {
      return {
        success: false,
        error: 'Body permintaan tidak boleh kosong',
        status: 400,
        headers,
      };
    }

    const parsed = JSON.parse(rawText);

    // 4. Prototype pollution check
    if (hasPrototypePollution(parsed)) {
      return {
        success: false,
        error: 'Payload tidak valid (terdeteksi percobaan eksploitasi prototype).',
        status: 400,
        headers,
      };
    }

    return { success: true, data: parsed };
  } catch {
    return {
      success: false,
      error: 'Format JSON tidak valid atau malformed.',
      status: 400,
      headers,
    };
  }
}

/**
 * Validates external outbound URLs to prevent SSRF (Server-Side Request Forgery).
 * Rejects private, loopback, internal IP ranges and dangerous URL schemes.
 */
export function isSafeOutboundUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Rejection of loopback & internal domains
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.arpa') ||
      hostname.endsWith('.test') ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    ) {
      return false;
    }

    // Reject Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, 100.64.0.0/10)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [b0, b1] = [parseInt(ipv4Match[1], 10), parseInt(ipv4Match[2], 10)];
      if (b0 === 10) return false;
      if (b0 === 127) return false;
      if (b0 === 169 && b1 === 254) return false;
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return false;
      if (b0 === 192 && b1 === 168) return false;
      if (b0 === 100 && b1 >= 64 && b1 <= 127) return false; // Tailscale / CGNAT
      if (b0 === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}
