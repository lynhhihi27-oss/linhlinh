import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'youtube_xu_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEFAULT_AUTH_SECRET = 'youtube-xu-dev-secret-key-32-chars-long';
const LEGACY_DEMO_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMye.I.kQ9v3wZ2P1aZ5vJ.OqUe5X.3r9yG';

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
    throw new Error('AUTH_SECRET must contain at least 32 characters in production.');
  }
  return secret || DEFAULT_AUTH_SECRET;
}

export function assertSessionConfig() {
  getSessionSecret();
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (storedHash === LEGACY_DEMO_HASH) {
    const valid = password === '123456';
    return { valid, needsRehash: valid };
  }

  if (typeof storedHash === 'string' && /^\$2[aby]\$/.test(storedHash)) {
    const valid = await bcrypt.compare(password, storedHash);
    return { valid, needsRehash: false };
  }

  const [algorithm, saltHex, hashHex] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/i.test(saltHex || '') || !/^[a-f0-9]{128}$/i.test(hashHex || '')) {
    return { valid: false, needsRehash: false };
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return {
    valid: timingSafeEqual(expected, actual),
    needsRehash: false
  };
}

function sign(payload) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createSessionCookie(userId) {
  const token = createSessionToken(userId);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function createSessionToken(userId) {
  const payload = Buffer.from(JSON.stringify({
    userId: Number(userId),
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function getSessionUserId(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenFromCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  if (tokenFromCookie) {
    const [payload, signature] = tokenFromCookie.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    try {
      const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (!Number.isSafeInteger(session.userId) || session.userId <= 0) return null;
      if (!Number.isSafeInteger(session.expiresAt) || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
      return session.userId;
    } catch {
      return null;
    }
  }

  return null;
}

export async function getSessionUser(request) {
  const userId = getSessionUserId(request);
  if (userId === null) return null;

  const users = await query(
    `SELECT user_id, email, phone, referral_code, full_name, birth_year, gender, province,
            system_role, account_status, xu_balance, referred_by, created_at
     FROM users WHERE user_id = ?`,
    [userId]
  );
  return users[0] || null;
}

export async function requireSession(request, allowedRoles = []) {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 })
    };
  }

  if (user.account_status !== 'ACTIVE') {
    return {
      user: null,
      response: NextResponse.json({ success: false, message: 'Tài khoản của bạn đang bị khóa.' }, { status: 403 })
    };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.system_role)) {
    return {
      user: null,
      response: NextResponse.json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này.' }, { status: 403 })
    };
  }

  return { user, response: null };
}
