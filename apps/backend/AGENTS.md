# AGENTS.md — Backend (ElysiaJS)

> **Stack**: ElysiaJS + TypeScript + Prisma + SQLite → PostgreSQL
> **Per Hermes**: Segui queste regole per ogni modifica al backend. Committa dopo ogni cambiamento significativo.

## 📐 Struttura del Backend

```
apps/backend/
├── package.json
├── prisma/
│   ├── schema.prisma       # Modelli DB (SQLite in dev, PostgreSQL in prod)
│   └── seed.ts             # Dati di seed iniziali
└── src/
    ├── index.ts            # Entry point — istanzia Elysia, monta middleware e rotte
    ├── db/
    │   └── prisma.ts       # Singola istanza Prisma (singleton pattern)
    └── routes/
        ├── auth.ts         # Rotte autenticazione (/api/auth/*)
        ├── public.ts       # Rotte pubbliche (/api/*)
        └── protected.ts    # Rotte protette (/api/protected/*)
```

**Regola:** Ogni nuovo endpoint deve avere una cartella dedicata in `routes/`. Mai più di 50 linee per file di rotte — se cresce, separare in sottofile.

---

## 🧑‍💻 Naming e Stile

- **Funzioni/variabili**: `camelCase`
- **Middleware**: `camelCase` + suffisso `Middleware` se è un hook Elysia (`authMiddleware`, `rateLimitMiddleware`)
- **Rotte**: nomi descrittivi, operazioni HTTP come prefix nelle commenti (`getUsers`, `createUser`, `updateUserProfile`)

---

## 🔐 Autenticazione

**Pattern JWT ElysiaJS**:
```typescript
import { jwt } from '@elysiajs/jwt';

const authPlugin = jwt({
  name: 'jwt',
  secret: process.env.JWT_SECRET || 'CHANGE_ME',
  exp: JWT_EXPIRY, // 15m — definito in @mono/shared
});

// Montare sulle rotte
const app = new Elysia()
  .use(authPlugin)
  .use(protectedRoutes);
```

**Regole:**
- Access token: 15 minuti (JWT_EXPIRY in shared)
- Refresh token: 7 giorni (REFRESH_TOKEN_EXPIRY in shared)
- Token sempre `type: 'access' | 'refresh'` nel payload
- Password sempre hashate con PBKDF2 (non mai in chiaro)
- Refresh token rotation: ogni refresh genera un nuovo token

---

## 📡 API Responses

**Formato standard** (sempre questi due):

```typescript
// Successo
{ success: true, data: { ... } }

// Errore
{ success: false, error: 'Descrizione errore' }
```

**Codici HTTP:**
| Codice | Uso |
|--------|-----|
| 200 | OK — successo |
| 201 | Created — risorsa creata |
| 400 | Bad Request — validazione fallita |
| 401 | Unauthorized — autenticazione mancata o token scaduto |
| 404 | Not Found — risorsa non esistente |
| 409 | Conflict — risorsa già esistente (es. email duplicata) |
| 500 | Internal Server Error |

**Middleware globale errori** (`index.ts`):
```typescript
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
})
```

---

## 🧪 Validazione

**Regola:** Validazione **sempre** con Zod, definita nel package `@mono/shared`.

```typescript
// In routes/auth.ts
import { registerSchema, loginSchema } from '@mono/shared';

.post('/register', async ({ body }) => {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return error(400, parsed.error.errors.map(e => e.message).join(', '));
  }
  // ...
}, {
  body: t.Object({
    email: t.String(),
    password: t.String(),
  }),
})
```

**Non scrivere schemi Zod nel backend** — usa sempre quelli del shared package.

---

## 🗄️ Database (Prisma)

**Regole:**
- Singola istanza `prisma` — singleton pattern in `db/prisma.ts`
- Mai fare `new PrismaClient()` in ogni file
- Ambient development: SQLite (`file:./dev.db`)
- Ambient production: PostgreSQL (con migration plan)
- Migration: `prisma migrate dev --name <descrizione>`
- Seed: `prisma db seed` (file seed.ts separato)

**Naming modelli:** PascalCase (`User`, `Product`, `Order`)
**Naming campi:** camelCase (`createdAt`, `updatedAt`, `firstName`)
**Timestamps:** sempre `@default(now())` e `@updatedAt`

---

## 🛡️ Middleware e Protezione

**Dove usare middleware:**
- Rotte `protected/*` — sempre JWT validation
- Rate limiting su `/api/auth/login` (max 5 tentativi/min)
- CORS — configurato in `index.ts` per il frontend

**Pattern auth guard:**
```typescript
.get('/dashboard', async ({ jwt: jwtHelper, error }) => {
  const user = await jwtHelper.verify(token);
  if (!user) return error(401, 'Token non valido');
  // ...
})
```

---

## 📝 Commenti Obbligatori

Ogni funzione/metodo pubblico deve avere:
```typescript
/**
 * Hash della password dell'utente con PBKDF2.
 * Usato da: authRoutes.register, authRoutes.login
 * Dove: apps/backend/src/routes/auth.ts
 * Esempio: const hash = await hashPassword('user-password');
 */
async function hashPassword(password: string): Promise<string> { ... }
```

---

## ✅ Checklist Modifica Backend

- [ ] La validazione usa schemi Zod dal shared package?
- [ ] Le risposte seguono il formato `{ success, data/error }`?
- [ ] I commenti sono presenti su tutte le funzioni pubbliche?
- [ ] Il nome del file segue `camelCase.ts` o `PascalCase.tsx`?
- [ ] Il commit è descrittivo (Conventional Commits)?
- [ ] È presente un test per la logica business?
