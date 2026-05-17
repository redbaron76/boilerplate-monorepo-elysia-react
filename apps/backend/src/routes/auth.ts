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

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  const saltB64 = encodeBase64(salt);
  const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltB64}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':');
  if (idx === -1) return false;
  const saltB64 = stored.slice(0, idx);
  const expectedHashHex = stored.slice(idx + 1);
  const salt = decodeBase64(saltB64);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashBytes = new Uint8Array(derivedBits);
  const hashHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHashHex;
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authPlugin)

  .post(
    '/register',
    async ({ body, error }) => {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return error(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const { email, password } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return error(409, 'Email già registrata');
      }

      const passwordHash = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          refreshToken: crypto.getRandomValues(new Uint8Array(32)).toString('hex'),
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
    async ({ body, jwt: jwtSign, error }) => {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return error(400, parsed.error.errors.map(e => e.message).join(', '));
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return error(401, 'Credenziali non valide');
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return error(401, 'Credenziali non valide');
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
    async ({ body, jwt: jwtSign, error }) => {
      const { refreshToken: rt } = body;
      if (!rt) {
        return error(400, 'Refresh token richiesto');
      }

      const decoded = await jwtSign.verify(rt);
      if (!decoded || decoded.type !== 'refresh') {
        return error(401, 'Refresh token non valido');
      }

      const dbUser = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!dbUser || dbUser.refreshToken !== rt) {
        return error(401, 'Refresh token non valido');
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
