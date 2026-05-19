import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { updateProfileSchema, getJwtConfig } from '@mono/shared';

// --- Public Profile Routes ---
export const profileRoutes = new Elysia({ prefix: '/api/profile' })
  /**
   * @swagger
   * /api/profile/{nickname}:
   *   get:
   *     summary: Ottieni profilo pubblico di un utente per nickname
   *     tags: [Profile]
   *     parameters:
   *       - name: nickname
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Profilo utente trovato
   *       404:
   *         description: Utente non trovato
   */
  .get('/:nickname', async ({ params, set }) => {
    const { nickname } = params;

    // Validate nickname format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(nickname)) {
      set.status = 400;
      return { success: false, error: 'Nickname non valido (3-20 caratteri, solo lettere, numeri, underscore)' };
    }

    const user = await db.user.findFirst({
      where: { nickname },
      select: {
        id: true,
        nickname: true,
        gender: true,
        birthDate: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      set.status = 404;
      return { success: false, error: 'Utente non trovato' };
    }

    return {
      success: true,
      data: {
        id: user.id,
        nickname: user.nickname!,
        gender: user.gender,
        birthDate: user.birthDate,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };
  });

// --- JWT Protected Profile Routes ---
const { secret: JWT_SECRET, expiry: JWT_EXPIRY } = getJwtConfig();
const authJwt = jwt({ name: 'profile-jwt', secret: JWT_SECRET, exp: JWT_EXPIRY });

export const protectedProfileRoutes = new Elysia({ prefix: '/api/profile' })
  .use(authJwt)
  /**
   * @swagger
   * /api/profile/me:
   *   get:
   *     summary: Ottieni il proprio profilo (richiede JWT)
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profilo utente
   *       401:
   *         description: Token non valido
   */
  .get('/me', async ({ 'profile-jwt': jwtHelper, request, set }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401;
      return { success: false, error: 'Token di autenticazione richiesto' };
    }

    const token = authHeader.slice(7);
    const user = await jwtHelper.verify(token);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Token non valido o scaduto' };
    }

    const dbUser = await db.user.findUnique({
      where: { id: Number(user.sub) },
      select: {
        id: true,
        nickname: true,
        gender: true,
        birthDate: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      set.status = 404;
      return { success: false, error: 'Utente non trovato' };
    }

    return {
      success: true,
      data: {
        id: dbUser.id,
        nickname: dbUser.nickname,
        gender: dbUser.gender,
        birthDate: dbUser.birthDate,
        avatar: dbUser.avatar,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      },
    };
  })
  /**
   * @swagger
   * /api/profile/me:
   *   put:
   *     summary: Aggiorna il proprio profilo (richiede JWT)
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               nickname:
   *                 type: string
   *               gender:
   *                 type: string
   *               birthDate:
   *                 type: string (date)
   *               avatar:
   *                 type: string
   */
  .put('/me', async ({ body, 'profile-jwt': jwtHelper, request, set }) => {
    // Manual auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401;
      return { success: false, error: 'Token di autenticazione richiesto' };
    }

    const token = authHeader.slice(7);
    const decoded = await jwtHelper.verify(token);
    if (!decoded) {
      set.status = 401;
      return { success: false, error: 'Token non valido o scaduto' };
    }

    // Validate body
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { success: false, error: parsed.error.issues.map(e => e.message).join(', ') };
    }

    const { nickname, gender, birthDate, avatar } = parsed.data;

    // Build update data (only include changed fields)
    const userId = Number(decoded.sub);
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    const updateData: Record<string, unknown> = {};
    if (nickname !== undefined) {
      // Check uniqueness if nickname changed
      if (existing?.nickname !== nickname) {
        const duplicate = await db.user.findFirst({ where: { nickname } });
        if (duplicate) {
          set.status = 409;
          return { success: false, error: 'Nickname già in uso' };
        }
        updateData.nickname = nickname || null;
      }
    }
    if (gender) updateData.gender = gender;
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (avatar) updateData.avatar = avatar || null;

    // If nothing to update, return existing
    if (Object.keys(updateData).length === 0) {
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true, nickname: true, gender: true, birthDate: true, avatar: true,
          createdAt: true, updatedAt: true,
        },
      });
      return { success: true, data: dbUser };
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, nickname: true, gender: true, birthDate: true, avatar: true,
        createdAt: true, updatedAt: true,
      },
    });

    return { success: true, data: updatedUser };
  })
  /**
   * @swagger
   * /api/profile/me:
   *   delete:
   *     summary: Elimina il proprio account (richiede JWT)
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Account eliminato
   *       401:
   *         description: Token non valido
   */
  .delete('/me', async ({ 'profile-jwt': jwtHelper, request, set }) => {
    // Manual auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401;
      return { success: false, error: 'Token di autenticazione richiesto' };
    }

    const token = authHeader.slice(7);
    const decoded = await jwtHelper.verify(token);
    if (!decoded) {
      set.status = 401;
      return { success: false, error: 'Token non valido o scaduto' };
    }

    await db.user.delete({ where: { id: Number(decoded.sub) } });
    return { success: true, message: 'Account eliminato con successo' };
  });
