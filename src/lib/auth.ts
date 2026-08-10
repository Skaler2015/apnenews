import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { randomBytes, createHmac } from 'crypto';
import prisma from './db';
import { ROLE_PERMISSIONS, type Role } from './constants';

// Lightweight session auth (spec §50/§51). Passwords hashed with bcrypt;
// sessions are random tokens stored server-side, referenced by a signed,
// httpOnly cookie. RBAC via role -> permission mapping with per-user overrides.

const COOKIE = 'apnenews_session';
const SESSION_DAYS = 7;

function sign(token: string): string {
  const secret = process.env.AUTH_SECRET || 'insecure-dev-secret';
  return createHmac('sha256', secret).update(token).digest('hex').slice(0, 32);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  cookies().set(COOKIE, `${token}.${sign(token)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const raw = cookies().get(COOKIE)?.value;
  if (raw) {
    const token = raw.split('.')[0];
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookies().delete(COOKIE);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: string[];
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const [token, sig] = raw.split('.');
  if (!token || sig !== sign(token)) return null;

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;

  const role = session.user.role as Role;
  const overrides = safeParseArray(session.user.permissions);
  const permissions = Array.from(new Set([...(ROLE_PERMISSIONS[role] ?? []), ...overrides]));
  return { id: session.user.id, email: session.user.email, name: session.user.name, role, permissions };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.role === 'SUPER_ADMIN' || user.permissions.includes(permission);
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) throw new Error('FORBIDDEN');
  return user;
}

function safeParseArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
