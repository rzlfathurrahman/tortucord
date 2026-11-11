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
 * Normalizes input division to standard allowed name
 */
export function normalizeDivision(input: string): AllowedDivision | null {
  if (!input) return null;
  const norm = input.trim().toLowerCase();

  // Check exact alias
  if (DIVISION_ALIASES[norm]) {
    return DIVISION_ALIASES[norm];
  }

  // Check standard list
  const standard = ALLOWED_DIVISIONS.find((d) => d.toLowerCase() === norm);
  if (standard) return standard;

  // Check partial match
  for (const [key, val] of Object.entries(DIVISION_ALIASES)) {
    if (norm.includes(key)) {
      return val;
    }
  }

  return null;
}

export interface ValidatedRegistrationData {
  fullName: string;
  idNumber: string;
  school: string;
  year: number;
  batch: string;
  division: AllowedDivision;
  discordUsername: string | null;
  isBotHoneypotTriggered: boolean;
}

/**
 * Validates and sanitizes registration input fields
 */
export function validateRegistrationPayload(body: any): {
  valid: boolean;
  error?: string;
  data?: ValidatedRegistrationData;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Data formulir tidak ditemukan.' };
  }

  // Anti-bot honeypot detection
  const honeypot = body.website || body.hp_token || body.company_url || body.honeypot;
  const isBotHoneypotTriggered = Boolean(honeypot && String(honeypot).trim().length > 0);

  // Full Name: 2-100 characters, no dangerous symbols
  const rawFullName = body.fullName || body.name;
  const fullName = sanitizeString(rawFullName, 100);
  if (!fullName || fullName.length < 2) {
    return { valid: false, error: 'Nama Lengkap wajib diisi (minimal 2 karakter).' };
  }

  // NIS / NIM: 3-50 characters, alphanumeric, dots, dashes, slashes
  const rawIdNumber = body.idNumber || body.nisNim || body.nis_nim;
  const idNumber = sanitizeString(rawIdNumber, 50).toUpperCase();
  if (!idNumber || idNumber.length < 3) {
    return { valid: false, error: 'NIS / NIM wajib diisi (minimal 3 karakter).' };
  }
  if (!/^[A-Z0-9.\-\/ ]+$/.test(idNumber)) {
    return { valid: false, error: 'NIS / NIM hanya boleh berisi huruf, angka, titik, atau strip.' };
  }

  // School / Institution: 2-150 characters
  const rawSchool = body.school || body.asalSekolah || body.university;
  const school = sanitizeString(rawSchool, 150).toUpperCase();
  if (!school || school.length < 2) {
    return { valid: false, error: 'Asal Sekolah / Universitas wajib diisi.' };
  }

  // Year: Integer between 2000 and 2050
  const rawYear = parseInt(String(body.year || body.tahunMasuk || new Date().getFullYear()), 10);
  if (isNaN(rawYear) || rawYear < 2000 || rawYear > 2050) {
    return { valid: false, error: 'Tahun masuk tidak valid (rentang 2000 - 2050).' };
  }

  // Batch: 1-50 characters
  const rawBatch = body.batch || body.batchMagang;
  const batch = sanitizeString(rawBatch, 50).toUpperCase();
  if (!batch) {
    return { valid: false, error: 'Batch magang wajib diisi.' };
  }

  // Division: Must match one of the 5 allowed divisions
  const rawDivision = body.division || body.role;
  const division = normalizeDivision(String(rawDivision || ''));
  if (!division) {
    return {
      valid: false,
      error: `Pilihan divisi tidak valid. Pilih salah satu dari: ${ALLOWED_DIVISIONS.join(', ')}`,
    };
  }

  // Discord Username: Optional, but if provided, validate standard discord username format
  let discordUsername: string | null = null;
  if (body.discordUsername) {
    const rawDisc = sanitizeString(body.discordUsername, 40).replace(/^@/, '');
    if (rawDisc) {
      if (!/^[a-zA-Z0-9_.]+$/.test(rawDisc) || rawDisc.length < 2 || rawDisc.length > 32) {
        return {
          valid: false,
          error: 'Format username Discord tidak valid (hanya huruf, angka, underscore, atau titik, 2-32 karakter).',
        };
      }
      discordUsername = rawDisc;
    }
  }

  return {
    valid: true,
    data: {
      fullName,
      idNumber,
      school,
      year: rawYear,
      batch,
      division,
      discordUsername,
      isBotHoneypotTriggered,
    },
  };
}

/**
 * Masks sensitive names for public status responses to protect intern privacy from scrapers
 * e.g., "Rizal Fathurrahman" -> "R*** F***********"
 */
export function maskName(fullName: string): string {
  if (!fullName) return '***';
  return fullName
    .split(' ')
    .map((word) => {
      if (word.length <= 1) return word;
      return word[0] + '*'.repeat(Math.max(1, word.length - 1));
    })
    .join(' ');
}
