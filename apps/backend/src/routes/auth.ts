import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { prisma } from '../db/prisma';
import { registerSchema, loginSchema } from '@mono/shared';
import { JWT_EXPIRY, REFRESH_TOKEN_EXPIRY } from '@mono/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-2024';

export const authPlugin = jwt({
  name: 'jwt',
  secret: JWT_SECRET,
  exp: JWT_EXPIRY,
});

function encodeBase64(data: Uint8Array): string {
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    bytes[i] = data[i] & 0xFF;
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltBuffer = salt.buffer as ArrayBuffer;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  const saltB64 = encodeBase64(salt);
  const hashHex = uint8ToHex(hashBytes);
  return `${saltB64}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':');
  if (idx === -1) return false;
  const saltB64 = stored.slice(0, idx);
  const expectedHashHex = stored.slice(idx + 1);
  const salt = decodeBase64(saltB64);
  const saltBuffer = salt.buffer as ArrayBuffer;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  const hashHex = uint8ToHex(hashBytes);
  return hashHex === expectedHashHex;
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authPlugin)

  .post(
    '/register',
    async ({ body, set }) => {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { success: false, error: parsed.error.issues.map(e => e.message).join(', ') };
      }

      const { email, password } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        set.status = 409;
        return { success: false, error: 'Email già registrata' };
      }

      const passwordHash = await hashPassword(password);

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const refreshToken = uint8ToHex(randomBytes);

      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          refreshToken,
        },
      });

      return { success: true, message: 'Registrazione completata' };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  .post(
    '/login',
    async ({ body, set, jwt: jwtSign }) => {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return { success: false, error: parsed.error.issues.map(e => e.message).join(', ') };
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        set.status = 401;
        return { success: false, error: 'Credenziali non valide' };
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        set.status = 401;
        return { success: false, error: 'Credenziali non valide' };
      }

      const accessToken = await jwtSign.sign({
        sub: user.id,
        email: user.email,
        type: 'access',
      });

      const refreshToken = await jwtSign.sign({
        sub: user.id,
        email: user.email,
        type: 'refresh',
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken },
      });

      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  .post(
    '/refresh',
    async ({ body, set, jwt: jwtSign }) => {
      const { refreshToken: rt } = body;
      if (!rt) {
        set.status = 400;
        return { success: false, error: 'Refresh token richiesto' };
      }

      const decoded = await jwtSign.verify(rt);
      if (!decoded || decoded.type !== 'refresh') {
        set.status = 401;
        return { success: false, error: 'Refresh token non valido' };
      }

      const dbUser = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!dbUser || dbUser.refreshToken !== rt) {
        set.status = 401;
        return { success: false, error: 'Refresh token non valido' };
      }

      const accessToken = await jwtSign.sign({
        sub: dbUser.id,
        email: dbUser.email,
        type: 'access',
      });

      const newRefreshToken = await jwtSign.sign({
        sub: dbUser.id,
        email: dbUser.email,
        type: 'refresh',
      });

      await prisma.user.update({
        where: { id: dbUser.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      };
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
    }
  );
