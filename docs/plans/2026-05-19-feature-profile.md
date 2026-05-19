# Feature Profile — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Creare un sistema di profili utente con pagina pubblica (`/:nickname`) visibile a tutti e pagina privata (`/profile`) dove l'utente registrato può gestire il proprio profilo (nickname univoco, gender, data di nascita, avatar base64, eliminazione account).

**Architecture:** 
1. Prisma schema esteso con campi profilo (nickname univoco, gender enum, birthDate, avatar base64)
2. Backend: 2 set di rotte — pubbliche (GET /:nickname, no auth) e private (GET/PUT/DELETE /me, JWT auth)
3. Frontend: 2 route — `/:nickname` (pubblico, Suspense) e `/profile` (protetto, form con TanStack Form)
4. Shared package: Zod schemas + TypeScript types per validazione cross-layer

**Tech Stack:** Prisma 7, ElysiaJS, TanStack Router, TanStack Form, TanStack Query (useSuspenseQuery), Zustand, Zod, TailwindCSS v4

---

## Database & Schema Design

```
User model esteso:
- nickname: String @unique  (3-20 chars, alphanumeric + underscores)
- gender: ProfileGender?     (enum: MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY)
- birthDate: DateTime?       (date of birth, nullable)
- avatar: String?            (base64 encoded image data URL, nullable)

ProfileGender enum:
  MALE
  FEMALE
  NON_BINARY
  PREFER_NOT_TO_SAY
```

## API Design

**Public (no auth):**
- `GET /api/profile/:nickname` → `{ success: true, data: { id, nickname, gender, birthDate, avatar, createdAt } }`
- `404` se nickname non trovato
- `400` se nickname malformed

**Private (JWT required):**
- `GET /api/profile/me` → `{ success: true, data: { id, nickname, gender, birthDate, avatar, createdAt, updatedAt } }`
- `PUT /api/profile/me` → `{ success: true, data: { ...updated fields... } }`
- `DELETE /api/profile/me` → `{ success: true, message: 'Account eliminato' }`

**Query Keys:**
- `profile:me` → for user's own profile
- `profile:byNickname` → for public profile lookup

---

## Task 1: Prisma Schema + Migration

**Objective:** Estendere il modello User con i 4 nuovi campi e creare la migration.

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Aggiungere enum e campi allo schema**

Aggiungere PRIMA del model User:
```prisma
enum ProfileGender {
  MALE
  FEMALE
  NON_BINARY
  PREFER_NOT_TO_SAY
}
```

Aggiungere dopo `name String?` nel model User:
```prisma
nickname    String?   @unique
gender      ProfileGender?
birthDate   DateTime?
avatar      String?
```

**Step 2: Rigenerare Prisma client**

```bash
cd /opt/data/boilerplate-monorepo-elysia-react/apps/backend
node_modules/.bun/prisma@7.2.0/node_modules/@prisma/client/scripts/postinstall.js 2>/dev/null || true
# Oppure:
cd apps/backend && bunx prisma generate
```

Oppure con il binary Prisma diretto:
```bash
cd /opt/data/boilerplate-monorepo-elysia-react && npx prisma generate --schema apps/backend/prisma/schema.prisma
```

**Step 3: Push schema al database (PGlite/SQLite mode)**

```bash
cd /opt/data/boilerplate-monorepo-elysia-react/apps/backend
npx prisma db push --schema prisma/schema.prisma
```

**Verification:**
- `prisma generate` senza errori
- `prisma db push` applica le nuove colonne
- TypeScript types aggiornati (i campi compaiono nel modello User)

---

## Task 2: Shared Zod Schemas + TypeScript Types

**Objective:** Creare schemi Zod e tipi TypeScript condivisi per i dati di profilo.

**Files:**
- Modify: `packages/shared/src/schemas.ts`
- Modify: `packages/shared/src/types.ts`

**Step 1: Aggiungere schemi Zod in `packages/shared/src/schemas.ts`**

Aggiungere dopo gli auth schemas esistenti:

```typescript
// --- Profile Gender ---
export const profileGenderSchema = z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']);
export type ProfileGender = z.infer<typeof profileGenderSchema>;

// --- Profile Input Schemas ---
export const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(3, 'Il nickname deve avere almeno 3 caratteri')
    .max(20, 'Il nickname non può superare i 20 caratteri')
    .regex(/^[a-zA-Z0-9_]+$/, 'Il nickname può contenere solo lettere, numeri e underscore')
    .optional()
    .or(z.literal('')),
  gender: profileGenderSchema.optional().or(z.literal('')),
  birthDate: z.string().refine(
    (val) => {
      if (!val) return true;
      const d = new Date(val);
      return !isNaN(d.getTime()) && d < new Date();
    },
    'La data di nascita deve essere una data valida nel passato'
  ).optional().or(z.literal('')),
  avatar: z.string().url('L\'avatar deve essere un URL o data URL valido').optional().or(z.literal('')),
}).refine(data => data.nickname || data.gender || data.birthDate || data.avatar, {
  message: 'Almeno un campo deve essere specificato',
});

// --- Public Profile Response ---
export const publicProfileSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  gender: profileGenderSchema.nullable(),
  birthDate: z.date().nullable(),
  avatar: z.string().nullable(),
  createdAt: z.date(),
});

// --- Inferred Types ---
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
```

**Step 2: Aggiungere tipi TypeScript in `packages/shared/src/types.ts`**

Aggiungere dopo `JwtPayload`:

```typescript
// --- Profile Types ---
export interface PublicProfile {
  id: number;
  nickname: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface OwnProfile {
  id: number;
  nickname: string | null;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## Task 3: Backend Public Profile Route

**Objective:** Creare rotta GET pubblica per cercare utente per nickname.

**Files:**
- Create: `apps/backend/src/routes/profile.ts` (nuovo file)

**Step 1: Creare il file `apps/backend/src/routes/profile.ts`**

```typescript
import { Elysia, t } from 'elysia';
import { db } from '../db';

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
```

**Step 2: Montare le rotte in `apps/backend/src/index.ts`**

Aggiungere l'import:
```typescript
import { profileRoutes } from './routes/profile';
```

Aggiungere il mount DOPO `publicRoutes` ma PRIMA di `authRoutes`:
```typescript
.use(profileRoutes)
```

---

## Task 4: Backend Protected Profile Routes

**Objective:** Creare rotte protette JWT per gestire il proprio profilo (GET, PUT, DELETE).

**Files:**
- Modify: `apps/backend/src/routes/profile.ts` (aggiungere sezioni protette)

**Step 1: Aggiungere JWT plugin e rotte protette allo stesso file**

Aggiungere dopo la sezione pubblica (ma dentro lo stesso file, come Elysia chain):

```typescript
// --- JWT Protected Routes ---
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-2024';
const authJwt = jwt({ name: 'profile-jwt', secret: JWT_SECRET, exp: '15m' });

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
  .get('/me', async ({ jwt: jwtHelper, request, set }) => {
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
  .put('/me', async ({ body, jwt: jwtHelper, request, set }) => {
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
      return { success: false, error: parsed.error.errors.map(e => e.message).join(', ') };
    }

    const { nickname, gender, birthDate, avatar } = parsed.data;

    // Build update data (only include changed fields)
    const userId = Number(decoded.sub);
    const existing = await db.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });

    const updateData: any = {};
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
  .delete('/me', async ({ jwt: jwtHelper, request, set }) => {
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
```

**Step 2: Aggiungere import di jwt e schemas**

Aggiungere all'inizio del file `apps/backend/src/routes/profile.ts`:
```typescript
import { jwt } from '@elysiajs/jwt';
import { updateProfileSchema } from '@mono/shared';
```

**Step 3: Montare le rotte protette in `apps/backend/src/index.ts`**

Aggiungere:
```typescript
import { protectedProfileRoutes } from './routes/profile';
```

Aggiungere DOPO `protectedRoutes`:
```typescript
.use(protectedProfileRoutes)
```

**Verification:**
- Le rotte sono accessibili in Swagger su `/swagger`
- La rotta pubblica non richiede JWT
- Le rotte private richiedono Bearer token
- Uniqueness del nickname verificata
- DELETE cancella l'utente dal DB

---

## Task 5: Frontend API Layer + Query Keys

**Objective:** Creare gli API methods e aggiornare le query keys per il profilo.

**Files:**
- Create: `apps/frontend/src/apis/profile.ts`
- Modify: `apps/frontend/src/libs/query-keys.ts`
- Modify: `apps/frontend/src/types/api.ts`

**Step 1: Creare `apps/frontend/src/apis/profile.ts`**

```typescript
import { api } from '@/libs/api';

/**
 * ProfilePublic — risposta API per profilo pubblico.
 */
export interface ProfilePublic {
  id: number;
  nickname: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
}

/**
 * ProfileOwn — risposta API per profilo proprio (con updatedAt).
 */
export interface ProfileOwn {
  id: number;
  nickname: string | null;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload per l'aggiornamento del profilo.
 */
export interface UpdateProfilePayload {
  nickname?: string;
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | '';
  birthDate?: string | '';
  avatar?: string | '';
}

/**
 * Ottieni il profilo pubblico di un utente per nickname.
 * @param nickname — nickname dell'utente da cercare
 * @returns Profilo pubblico dell'utente
 */
export async function getPublicProfile(nickname: string) {
  return api.get<{ success: true; data: ProfilePublic } | { success: false; error: string }>(`/profile/${encodeURIComponent(nickname)}`);
}

/**
 * Ottieni il proprio profilo (richiede autenticazione).
 * @returns Profilo completo dell'utente corrente
 */
export async function getOwnProfile() {
  return api.get<{ success: true; data: ProfileOwn } | { success: false; error: string }>('/profile/me');
}

/**
 * Aggiorna il proprio profilo (richiede autenticazione).
 * @param payload — Campi da aggiornare (solo quelli non-null/non-vuoti)
 * @returns Profilo aggiornato
 */
export async function updateOwnProfile(payload: UpdateProfilePayload) {
  return api.put<{ success: true; data: ProfileOwn } | { success: false; error: string }>('/profile/me', payload);
}

/**
 * Elimina il proprio account (richiede autenticazione).
 * @returns Conferma eliminazione
 */
export async function deleteOwnAccount() {
  return api.delete<{ success: true; message: string } | { success: false; error: string }>('/profile/me');
}
```

**Step 2: Aggiornare query keys in `apps/frontend/src/libs/query-keys.ts`**

Aggiungere alla fine del `queryKeys` object:
```typescript
/** Profilo pubblico per nickname — /profile/:nickname */
publicProfile: (nickname: string) => ['profile', 'public', nickname] as const,

/** Profilo proprio — /profile/me */
ownProfile: ['profile', 'own'] as const,
```

**Step 3: Aggiornare types in `apps/frontend/src/types/api.ts`**

Aggiungere all'inizio o fine file:
```typescript
/** Profilo pubblico — dato esposto a visitatori */
export interface PublicProfile {
  id: number;
  nickname: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
}

/** Profilo proprio — dati completi dell'utente autenticato */
export interface OwnProfile extends PublicProfile {
  updatedAt: string;
}
```

---

## Task 6: Frontend Query Hooks

**Objective:** Creare custom hooks per i dati di profilo usando il pattern useQueryOptions + useSuspenseQuery.

**Files:**
- Create: `apps/frontend/src/hooks/useProfileData.ts`
- Create: `apps/frontend/src/hooks/usePublicProfileData.ts`

**Step 1: Creare `apps/frontend/src/hooks/useProfileData.ts`**

```typescript
import { useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { api } from '@/libs/api';
import type { ProfileOwn } from '@/apis/profile';

/**
 * Factory per le opzioni della query profilo proprio.
 * Centralizza queryKey, queryFn, staleTime e refetchOnWindowFocus.
 * @returns QueryOptions per il profilo utente corrente
 */
export function useOwnProfileQueryOptions(): UseSuspenseQueryOptions<ProfileOwn> {
  return {
    queryKey: queryKeys.ownProfile,
    queryFn: async () => {
      const r = await api.getOwnProfile();
      if (!r.success) {
        throw new Error(r.error || 'Errore sconosciuto');
      }
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
  };
}

/**
 * Hook per i dati del profilo proprio.
 * Usa useSuspenseQuery + Suspense boundary.
 * @returns Dati del profilo
 */
export function useOwnProfileData() {
  const queryOptions = useOwnProfileQueryOptions();
  return useSuspenseQuery({
    ...queryOptions,
    refetchOnWindowFocus: false,
  });
}
```

**Step 2: Creare `apps/frontend/src/hooks/usePublicProfileData.ts`**

```typescript
import { useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { getPublicProfile } from '@/apis/profile';
import type { ProfilePublic } from '@/apis/profile';

/**
 * Factory per le opzioni della query profilo pubblico.
 * @param nickname — nickname dell'utente da cercare
 * @returns QueryOptions per il profilo pubblico
 */
export function usePublicProfileQueryOptions(nickname: string): UseSuspenseQueryOptions<ProfilePublic> {
  return {
    queryKey: queryKeys.publicProfile(nickname),
    queryFn: async () => {
      const r = await getPublicProfile(nickname);
      if (!r.success) {
        throw new Error(r.error || 'Errore sconosciuto');
      }
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
  };
}

/**
 * Hook per i dati del profilo pubblico.
 * @param nickname — nickname dell'utente da cercare
 * @returns Dati del profilo pubblico
 */
export function usePublicProfileData(nickname: string) {
  const queryOptions = usePublicProfileQueryOptions(nickname);
  return useSuspenseQuery(queryOptions);
}
```

---

## Task 7: Frontend Public Profile Route (/:nickname)

**Objective:** Creare la rotta file-based `/:nickname` che mostra il profilo pubblico.

**Files:**
- Create: `apps/frontend/src/routes/profile._nickname.tsx`

**Step 1: Creare il file di route**

```typescript
import { createFileRoute, Link } from '@tanstack/react-router';
import { usePublicProfileData } from '@/hooks/usePublicProfileData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Italian } from 'date-fns/locale';

/**
 * Route profilo pubblico (/:nickname).
 * Mostra i dati pubblici di un utente cercati per nickname.
 */
export const Route = createFileRoute('/profile/_nickname')({
  component: PublicProfilePage,
});

/**
 * Componente pagina profilo pubblico.
 */
function PublicProfilePage() {
  const { nickname } = Route.useParams();
  const { data, isLoading, error } = usePublicProfileData(nickname);

  const genderLabels: Record<string, string> = {
    MALE: 'Maschile',
    FEMALE: 'Femminile',
    NON_BINARY: 'Non binario',
    PREFER_NOT_TO_SAY: 'Preferisco non specificare',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mb-6 text-6xl">👤</div>
        <h1 className="text-2xl font-bold mb-2">Utente non trovato</h1>
        <p className="text-muted-foreground mb-6">
          L'utente @{nickname} non esiste o è stato eliminato.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft size={16} className="mr-2" />
            Torna alla home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={14} />
        Torna alla home
      </Link>

      {/* Profile Card */}
      <Card className="border-border/50 shadow-card">
        <CardHeader className="text-center pb-4">
          {/* Avatar */}
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden bg-muted mb-4 border-2 border-border/50">
            {data.avatar ? (
              <img src={data.avatar} alt={data.nickname} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-3xl font-bold">
                {data.nickname.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">@{data.nickname}</CardTitle>
          <CardDescription>Membro dal {format(new Date(data.createdAt), 'MMMM yyyy', { locale: Italian })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gender */}
          {data.gender && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="text-muted-foreground flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-muted-foreground">Genere</p>
                <p className="font-medium">{genderLabels[data.gender]}</p>
              </div>
            </div>
          )}

          {/* Birth Date */}
          {data.birthDate && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
              <div>
                <p className="text-xs text-muted-foreground">Data di nascita</p>
                <p className="font-medium">
                  {format(new Date(data.birthDate), 'dd MMMM yyyy', { locale: Italian })}
                </p>
              </div>
            </div>
          )}

          {/* User ID */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="text-muted-foreground flex-shrink-0" size={16} />
            <div>
              <p className="text-xs text-muted-foreground">ID Utente</p>
              <code className="text-xs font-mono bg-background px-2 py-0.5 rounded border">#{data.id}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 8: Frontend Private Profile Route (/profile)

**Objective:** Creare la rotta protetta `/profile` per la gestione completa del profilo.

**Files:**
- Create: `apps/frontend/src/routes/profile.tsx`

**Step 1: Creare la route protetta con form di gestione profilo**

```typescript
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useAuthStore } from '@/stores/auth';
import { useOwnProfileData, useOwnProfileQueryOptions } from '@/hooks/useProfileData';
import { updateOwnProfile, deleteOwnAccount, type UpdateProfilePayload } from '@/apis/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/components/ui/alert';
import { User, Mail, Shield, Edit2, Save, Trash2, ArrowLeft, Upload, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { updateProfileSchema } from '@mono/shared';
import { queryClient } from '@/main';

/**
 * Guard di autenticazione per la pagina profilo.
 */
function requireAuth() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    window.location.href = '/login';
    throw new Error('UNAUTHENTICATED');
  }
}

/**
 * Route protetta gestione profilo (/profile).
 */
export const Route = createFileRoute('/profile')({
  beforeLoad: requireAuth,
  component: ProfilePage,
});

/**
 * Gender options for dropdown.
 */
const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Maschile' },
  { value: 'FEMALE', label: 'Femminile' },
  { value: 'NON_BINARY', label: 'Non binario' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Preferisco non specificare' },
] as const;

/**
 * Componente pagina gestione profilo.
 */
function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: profile, isLoading, error, refetch } = useOwnProfileData();

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<UpdateProfilePayload>({
    defaultValues: {
      nickname: '',
      gender: '',
      birthDate: '',
      avatar: '',
    },
    validators: {
      onChange: updateProfileSchema.shape,
    },
    onSubmit: async ({ value }) => {
      setFormError('');
      setSuccessMsg('');

      // Clean empty strings
      const cleaned: UpdateProfilePayload = {};
      if (value.nickname) cleaned.nickname = value.nickname;
      if (value.gender) cleaned.gender = value.gender;
      if (value.birthDate) cleaned.birthDate = value.birthDate;
      if (value.avatar) cleaned.avatar = value.avatar;

      if (Object.keys(cleaned).length === 0) {
        setFormError('Nessun campo da aggiornare');
        return;
      }

      setSaving(true);
      try {
        const response = await updateOwnProfile(cleaned);
        if ('error' in response) {
          setFormError(response.error);
        } else {
          setSuccessMsg('Profilo aggiornato con successo!');
          await queryClient.invalidateQueries({ queryKey: ['profile', 'own'] });
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento');
      } finally {
        setSaving(false);
      }
    },
  });

  // Load profile data into form
  if (profile) {
    const nick = profile.nickname || '';
    if (form.getFieldValue('nickname') === '') {
      form.setFieldValue('nickname', nick);
      form.setFieldValue('gender', profile.gender || '');
      form.setFieldValue('birthDate', profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '');
      form.setFieldValue('avatar', profile.avatar || '');
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size (e.g. 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFormError('L\'immagine deve essere inferiore a 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      form.setFieldValue('avatar', base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    setFormError('');
    try {
      const response = await deleteOwnAccount();
      if ('error' in response) {
        setFormError(response.error);
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/';
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      {/* Back link */}
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={14} />
        Torna alla dashboard
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Gestione Profilo
          </span>
        </h1>
        <p className="text-muted-foreground text-lg">Modifica i tuoi dati pubblici e gestisci il tuo account</p>
      </div>

      <div className="space-y-8">
        {/* Profile Form Card */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Edit2 className="text-indigo-600" size={20} />
              </div>
              <div>
                <CardTitle>Informazioni Profilo</CardTitle>
                <CardDescription>Campi visibili pubblicamente sul tuo profilo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {formError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {successMsg && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">{successMsg}</AlertDescription>
                </Alert>
              )}

              {/* Nickname */}
              <form.Field
                name="nickname"
                validators={{
                  onChange: updateProfileSchema.shape.nickname,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Nickname</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="Il tuo nickname pubblico (3-20 caratteri)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="pl-10"
                    />
                    <p className="text-xs text-muted-foreground">Usato per il profilo pubblico: /{field.state.value || 'nickname'}</p>
                    {field.state.meta.errors?.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Gender */}
              <form.Field
                name="gender"
                validators={{
                  onChange: updateProfileSchema.shape.gender,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Genere</Label>
                    <select
                      id={field.name}
                      name={field.name}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    >
                      <option value="">Non specificato</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {field.state.meta.errors?.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Birth Date */}
              <form.Field
                name="birthDate"
                validators={{
                  onChange: updateProfileSchema.shape.birthDate,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Data di nascita</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors?.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-border/50">
                    {form.getFieldValue('avatar') ? (
                      <img src={form.getFieldValue('avatar')} alt="Preview avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xl font-bold">
                        {profile?.nickname?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-indigo-600 hover:text-indigo-700">
                      <Camera size={16} />
                      Carica immagine
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">PNG, JPG o GIF — max 2MB</p>
                    {form.getFieldValue('avatar') && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => form.setFieldValue('avatar', '')}
                      >
                        Rimuovi
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvataggio...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save size={16} />
                    Salva modifiche
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Account Info */}
        <Card className="border-border/50 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="text-blue-600" size={20} />
              </div>
              <div>
                <CardTitle>Dati Account</CardTitle>
                <CardDescription>Informazioni che non possono essere modificate</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="text-muted-foreground flex-shrink-0" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="text-muted-foreground flex-shrink-0" size={16} />
                  <div>
                    <p className="text-xs text-muted-foreground">Nickname Pubblico</p>
                    <p className="font-medium">
                      @{profile.nickname || 'Non impostato'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="text-muted-foreground flex-shrink-0" size={16} />
                  <div>
                    <p className="text-xs text-muted-foreground">ID Utente</p>
                    <code className="text-xs font-mono bg-background px-2 py-0.5 rounded border">#{profile.id}</code>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20 shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div>
                <CardTitle className="text-destructive">Zona Pericolosa</CardTitle>
                <CardDescription>Eliminazione account — azione irreversibile</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Eliminare il tuo account rimuoverà permanentemente tutti i tuoi dati, incluso il profilo pubblico.
              Questa azione non può essere annullata.
            </p>

            {deleteConfirm ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1"
                  >
                    {deleting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Eliminazione...
                      </span>
                    ) : (
                      'Conferma eliminazione'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Annulla
                  </Button>
                </div>
                {formError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setDeleteConfirm(true)}
                disabled={deleting}
                className="w-full"
              >
                <Trash2 size={16} className="mr-2" />
                Elimina il mio account
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Note:** This task requires importing `queryClient` from `main.tsx`. Since `main.tsx` already exports it as a const, we need to re-export it. Add to `main.tsx`:

```typescript
export { queryClient };
```

---

## Task 9: Header with Profile Link

**Objective:** Aggiungere link al profilo nel Header quando l'utente è autenticato.

**Files:**
- Modify: `apps/frontend/src/components/layout/Header.tsx`

**Step 1: Aggiungere link profilo nel navigation**

Nelle sezioni sia desktop che mobile, dopo il link Dashboard, aggiungere:

Desktop (dopo `Dashboard` link):
```tsx
<Link
  to="/profile"
  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
>
  Profilo
</Link>
```

Mobile (dopo `Dashboard` link):
```tsx
<Link
  to="/profile"
  className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
  onClick={() => setMobileOpen(false)}
>
  Profilo
</Link>
```

---

## Verification Steps

1. **Typecheck:**
   ```bash
   cd apps/backend && tsc --noEmit && cd ../frontend && tsc --noEmit
   ```

2. **Runtime check:**
   - Backend runs on port 3001
   - Swagger shows new `/profile` endpoints
   - Frontend builds without errors
   - Visit `/someNickname` → public profile page (404 if not found)
   - Login → `/profile` → manage profile page
   - Update nickname → visible at `/newNickname`
   - Delete account → redirect to home

---

## File Summary

### Backend (5 changes)
1. `apps/backend/prisma/schema.prisma` — add ProfileGender enum + nickname/gender/birthDate/avatar fields
2. `apps/backend/src/routes/profile.ts` — **NEW**: public + protected profile routes
3. `apps/backend/src/index.ts` — import + mount profileRoutes, protectedProfileRoutes

### Shared (2 changes)
4. `packages/shared/src/schemas.ts` — add profile Zod schemas
5. `packages/shared/src/types.ts` — add Profile types

### Frontend (8 changes)
6. `apps/frontend/src/apis/profile.ts` — **NEW**: API functions for profile CRUD
7. `apps/frontend/src/libs/query-keys.ts` — add publicProfile + ownProfile keys
8. `apps/frontend/src/types/api.ts` — add PublicProfile + OwnProfile interfaces
9. `apps/frontend/src/hooks/useProfileData.ts` — **NEW**: own profile hooks
10. `apps/frontend/src/hooks/usePublicProfileData.ts` — **NEW**: public profile hooks
11. `apps/frontend/src/routes/profile._nickname.tsx` — **NEW**: public profile route
12. `apps/frontend/src/routes/profile.tsx` — **NEW**: private profile management route
13. `apps/frontend/src/components/layout/Header.tsx` — add profile link
14. `apps/frontend/src/main.tsx` — re-export queryClient

**Total: 14 file changes (3 new backend, 4 new frontend, 7 existing modified)**
