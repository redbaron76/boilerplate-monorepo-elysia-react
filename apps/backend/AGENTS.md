# AGENTS.md — Backend (ElysiaJS + TypeScript)

> **Stack**: ElysiaJS 1.x + TypeScript + Prisma + Bun + Zustand (shared)
> **Per Hermes:** Segui queste regole per ogni modifica al backend. Committa dopo ogni cambiamento significativo.

---

## 📐 Struttura del Codice — Feature-Based

Elysia è **unopinionated** sulla struttura, ma per chiarezza usiamo **feature-based architecture**:

```
apps/backend/src/
├── index.ts              # Entry point — istanzia Elysia, monta moduli, avvia server
├── db/
│   └── index.ts          # Singola istanza Prisma (singleton pattern)
└── modules/
    ├── auth/
    │   ├── index.ts      # Controller Elysia (rotte /api/auth/*)
    │   ├── service.ts    # Logica business (abstract class, static methods)
    │   └── model.ts      # Schemi validazione Elysia.t per auth
    ├── user/
    │   ├── index.ts
    │   ├── service.ts
    │   └── model.ts
    └── profile/
        ├── index.ts
        ├── service.ts
        └── model.ts
```

**Perché feature-based:** Ogni feature ha controller, service e model raggruppati. Facilita refactoring e test.

**Regola:** File di rotte >50 linee → separare in sottofile. Mai più di un handler per file quando possibile.

---

## 🧑‍💻 Best Practices ElysiaJS — DAL DOCUMENTO UFFICIALE

### ✅ 1. Elysia Instance Come Controller (non classi separate)

**FARE** — Trattare un'istanza Elysia come controller stesso:

```typescript
// ✅ Do: Elysia instance = controller
import { Elysia } from 'elysia';
import { AuthService } from './service';

export const authController = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body }) => {
    const result = await AuthService.login(body);
    return result;
  }, {
    body: AuthModel.loginBody,
    response: {
      200: AuthModel.loginResponse,
      400: AuthModel.loginInvalid,
    },
  });
```

**NON FARE** — Classi che prendono Context Elysia:

```typescript
// ❌ Don't: Pass entire Context to a controller
abstract class AuthController {
  static login(context: Context) {  // ❌ Hard to type, loss of integrity
    return AuthService.login(context.body);
  }
}
```

**Perché:** I tipi Elysia sono complessi e dipendenti da plugins. Passare `Context` completo causa loss di type integrity e vendor lock-in.

---

### ✅ 2. Service Pattern

#### Service non-dependente dalla request → abstract class + static methods

```typescript
// ✅ Do: Service senza istanza (evita allocazione)
export abstract class AuthService {
  static async login({ email, password }: { email: string; password: string }) {
    // ... logica business
    return { token: 'xxx', user: { id: 1, email } };
  }

  static async validateToken(token: string) {
    // ... logica business
    return { id: 1, email: 'user@example.com' };
  }
}
```

#### Service dipendente dalla request → Elysia instance con macro

```typescript
// ✅ Do: Request-dependent service come Elysia instance
const authGuard = new Elysia({ name: 'AuthGuard' })
  .macro({
    isAuthenticated: {
      resolve({ cookie: { session }, status }) {
        if (!session.value)
          return status(401, 'Unauthorized') satisfies { success: false; error: string };
        return { userId: Number(session.value) };
      },
    },
  });
```

**Perché:** Plugin deduplicati automaticamente se hanno `name` (singleton). Elysia inferisce i tipi dal contesto.

---

### ✅ 3. Model — Usare Elysia.t (NON classi/interfacce separate)

Elysia.t è il **single source of truth** per tipi e validazione runtime:

```typescript
// ✅ Do: Elysia.t validation schemas
import { t, type UnwrapSchema } from 'elysia';

export const AuthModel = {
  loginBody: t.Object({
    email: t.String({ minLength: 1 }),
    password: t.String({ minLength: 6 }),
  }),
  loginResponse: t.Object({
    success: t.Literal(true),
    data: t.Object({
      accessToken: t.String(),
      refreshToken: t.String(),
      user: t.Object({
        id: t.Number(),
        email: t.String(),
      }),
    }),
  }),
  loginInvalid: t.Object({
    success: t.Literal(false),
    error: t.String(),
  }),
} as const;

// Opzionale: inferire i tipi dal model
export type AuthModel = {
  [k in keyof typeof AuthModel]: UnwrapSchema<typeof AuthModel[k]>;
};
```

**NON FARE** — Dichiarare interfacce separate:

```typescript
// ❌ Don't: Interface separate
interface ILoginRequest {
  email: string;
  password: string;
}
// ❌ Non collegata alla validazione runtime
```

---

### ✅ 4. Guard per Enforce Type su Subroutes

Usare `.guard()` per validare response type su gruppi di rotte:

```typescript
// ✅ Do: Enforce response type su rotte protette
const protectedRoutes = new Elysia({ prefix: '/protected' })
  .guard(
    { response: t.Object({ success: t.Boolean() }) },
    (app) =>
      app
        .get('/dashboard', async ({ jwt: jwtHelper }) => {
          const user = await jwtHelper.verify(token);
          return { success: true, user };
        })
        .get('/profile', async () => {
          return { success: true, data: { nickname: 'test' } };
        })
  );
```

---

### ✅ 5. Decorators Solo per Proprietà Dipendenti dalla Request

```typescript
// ✅ Do: Decorators solo per request-dependent data
const app = new Elysia()
  .decorate('requestIP', ({ request }) => request.headers.get('x-forwarded-for') || request.ip)
  .decorate('requestTime', () => Date.now())
  .decorate('session', ({ cookie }) => cookie.session.value)
  .get('/', ({ requestIP, requestTime, session }) => {
    return { requestIP, requestTime, session };
  });
```

---

### ✅ 6. Pattern JWT ElysiaJS (Aggiornato)

```typescript
import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../../db';
import { getJwtConfig, AuthModel } from '@mono/shared';

const { secret: JWT_SECRET, expiry: JWT_EXPIRY } = getJwtConfig();

// Plugin JWT — nome univoco per deduplicazione
const authJwtPlugin = jwt({
  name: 'jwt',
  secret: JWT_SECRET,
  exp: JWT_EXPIRY, // 15m
});

// Controller — Elysia instance
export const authController = new Elysia({ prefix: '/auth' })
  .use(authJwtPlugin)

  .post('/register', async ({ body, set }) => {
    const parsed = AuthModel.registerBody.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return parsed.error.issues.map((e) => e.message).join(', ');
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      set.status = 409;
      return { success: false, error: 'Email già registrata' };
    }

    const passwordHash = await AuthService.hashPassword(parsed.data.password);
    await db.user.create({
      data: { email: parsed.data.email, passwordHash },
    });

    return { success: true, message: 'Registrazione completata' };
  }, {
    body: AuthModel.registerBody,
    response: {
      200: AuthModel.registerSuccess,
      400: AuthModel.registerInvalid,
      409: AuthModel.registerConflict,
    },
  })

  .post('/login', async ({ body, set, jwt: jwtSign }) => {
    const parsed = AuthModel.loginBody.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return { success: false, error: 'Campi obbligatori mancanti' };
    }

    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Credenziali non valide' };
    }

    const valid = await AuthService.verifyPassword(parsed.data.password, user.passwordHash);
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

    await db.user.update({
      where: { id: user.id },
      data: { refreshToken, updatedAt: new Date() },
    });

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name },
      },
    };
  }, {
    body: AuthModel.loginBody,
    response: {
      200: AuthModel.loginResponse,
      400: AuthModel.loginInvalid,
      401: AuthModel.loginInvalid,
    },
  });
```

**Regole JWT:**
- `name` univoco per ogni plugin JWT (`jwt`, `profile-jwt`)
- Secret e expiry da `getJwtConfig()` — centralizzato in shared
- Token sempre `type: 'access' | 'refresh'` nel payload
- Refresh token rotation: ogni login/refresh genera nuovo token
- Store refresh token in DB per validazione

---

### ✅ 7. API Response Format

**Formato standard** (sempre questi due):

```typescript
// Successo
{ success: true, data: { ... } }

// Errore
{ success: false, error: 'Descrizione errore' }
```

**Codici HTTP:**
- `200` OK — successo
- `201` Created — risorsa creata
- `400` Bad Request — validazione fallita
- `401` Unauthorized — auth mancata o token scaduto
- `403` Forbidden — permesso negato
- `404` Not Found — risorsa non esistente
- `409` Conflict — risorsa già esistente
- `500` Internal Server Error

**Middleware globale errori (`index.ts`):**

```typescript
const app = new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { success: false, error: error.message };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { success: false, error: 'Rotta non trovata' };
    }
    set.status = 500;
    return { success: false, error: 'Errore interno del server' };
  });
```

---

### ✅ 8. Schema & Validazione

Elysia supporta **Standard Schema** — usa la libreria preferita:
- Elysia.t (built-in, preferita)
- Zod (`z.object(...)`)
- Valibot, ArkType, Effect Schema, Yup, Joi

```typescript
// ✅ Do: Elysia.t (single source of truth)
import { t } from 'elysia';

.body(t.Object({
  email: t.String(),
  password: t.String({ minLength: 6 }),
}))

// ✅ Alternative: Zod (se preferito dal team)
import { z } from 'zod';

.body(z.object({
  email: z.string(),
  password: z.string().min(6),
}))
```

**Perché:** Elysia inferisce i tipi automaticamente da qualsiasi Standard Schema compliant.

---

### ✅ 9. OpenAPI / Swagger

```typescript
import { swagger } from '@elysiajs/swagger';

const app = new Elysia()
  .use(swagger({
    path: '/swagger',
    exclude: ['/api/auth/login', '/api/auth/register'],
  }))
  // ... rotte
  .listen(3001);

console.log(`📘 Swagger UI: http://localhost:3001/swagger`);
```

**Configurazione:**
- Path: `/swagger`
- Escludere auth public endpoints (login/register)
- Documentare ogni rotta con `@swagger` JSDoc
- Usare `@swagger` tags per raggruppare endpoint

---

### ✅ 10. Testing

Testare i controller con `.handle()`:

```typescript
import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/hello', () => 'world');

describe('Controller', () => {
  it('should return hello', async () => {
    const response = await app
      .handle(new Request('http://localhost/hello'))
      .then((x) => x.text());

    expect(response).toBe('world');
  });
});
```

---

## 🧑‍💻 Naming e Stile

- **Funzioni/variabili**: `camelCase`
- **Middleware**: `camelCase` + suffisso (es. `authMiddleware`, `rateLimitMiddleware`)
- **Rotte**: nomi descrittivi (`getUsers`, `createUser`, `updateUserProfile`)
- **Constants**: `UPPER_SNAKE_CASE` per config (es. `JWT_SECRET`, `JWT_EXPIRY`)
- **File**: `camelCase.ts` per moduli, `PascalCase.tsx` per componenti

---

## 📦 Pacchetti NPM

**Regola:** Quando installi un pacchetto, usa SEMPRE l'ultima versione.
`bunpm view elysia version` → usa `^<version>` in `package.json`.

**Versioni attuali (aggiornare periodicamente):**
- `elysia`: ^1.4.28
- `@elysiajs/jwt`: latest
- `@elysiajs/swagger`: latest
- `prisma`: latest
- `@prisma/client`: latest

---

## 🔐 Autenticazione — Riepilogo

**Pattern JWT:**
```typescript
const { secret, expiry } = getJwtConfig(); // ← da @mono/shared

const authPlugin = jwt({
  name: 'jwt',           // ← nome univoco per il contesto
  secret: secret,        // ← mai hardcoded
  exp: expiry,           // ← 15m per access, 7d per refresh
});
```

**Regole di sicurezza:**
- Access token: 15 minuti (`JWT_EXPIRY` in shared)
- Refresh token: 7 giorni (`REFRESH_TOKEN_EXPIRY` in shared)
- Token payload: `type: 'access' | 'refresh'`
- Password: PBKDF2 (100k iterazioni, SHA-256)
- Refresh token rotation: generare nuovo token a ogni refresh
- JWT_SECRET: variabile d'ambiente, fallback da shared

---

## 🗄️ Database (Prisma)

**Regole:**
- Singola istanza `prisma` — singleton in `db/index.ts`
- Mai `new PrismaClient()` in ogni file
- Dev: SQLite (`file:./dev.db`)
- Prod: PostgreSQL (con migration plan)
- Migration: `prisma migrate dev --name <descrizione>`
- Seed: `prisma db seed` (file seed.ts separato)

**Naming:**
- Modelli: PascalCase (`User`, `Product`, `Order`)
- Campi: camelCase (`createdAt`, `updatedAt`, `firstName`)
- Timestamps: `@default(now())` e `@updatedAt`

---

## 📝 Checklist Modifica Backend

- [ ] Struttura feature-based (index.ts + service.ts + model.ts)?
- [ ] Controller è Elysia instance (non classe con Context)?
- [ ] Model usa Elysia.t (non interfacce/classi separate)?
- [ ] Service usa abstract class + static methods?
- [ ] API response formato `{ success, data/error }`?
- [ ] JWT plugin ha `name` univoco?
- [ ] JWT secret da `getJwtConfig()` (non hardcoded)?
- [ ] Risposta type enforced con `.guard()` o `.response`?
- [ ] JSDoc commenti su funzioni pubbliche?
- [ ] Test per logica business?
- [ ] Commit descrittivo (Conventional Commits)?
