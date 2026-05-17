# AGENTS.md — Frontend (React + TanStack)

> **Stack**: React 19 + Vite + TypeScript + TanStack Router + TanStack Form + TanStack Query + Zustand + shadcn/ui + TailwindCSS v4
> **Per Hermes**: Segui queste regole per ogni modifica al frontend. Committa dopo ogni cambiamento significativo.

## 📐 Struttura del Frontend

```
apps/frontend/
├── package.json
├── vite.config.ts          # Vite + React plugin + TailwindCSS v4 plugin
├── tsconfig.json
├── postcss.config.js
├── tailwind.config.js
└── src/
    ├── main.tsx            # Entry point — istanzia router, QueryClient, providers
    ├── index.css           # Tailwind directives + CSS variables (se necessarie)
    ├── routes/             # File-based routing con TanStack Router
    │   ├── __root.tsx      # Layout root — Header, Footer, Outlet
    │   ├── index.tsx       # Home page (/)
    │   ├── login.tsx       # Login page (/login)
    │   ├── register.tsx    # Register page (/register)
    │   ├── dashboard.tsx   # Dashboard protetta (/dashboard)
    │   └── public.tsx      # Pagina pubblica (/public)
    ├── components/
    │   ├── ui/             # shadcn/ui components (button, card, input, alert, label)
    │   └── layout/         # Componenti layout (Header.tsx, Footer.tsx)
    ├── hooks/              # Custom hooks (autenticazione, query, form, utility)
    ├── libs/               # Utility e librerie (api.ts, utils.ts, validators.ts)
    └── stores/             # Zustand stores (auth.ts)
```

**Regole fondamentali:**
1. **Mai business logic nei componenti** — separare sempre in `hooks/` o `libs/`
2. **Mai usare TanStack Query direttamente nel componente** — creare sempre un hook dedicato (`useDashboardData`, `useUserData`)
3. **Preferire `useSuspenseQuery` a `useQuery`** — usare il Suspense di React ove possibile
4. **Non usare CSS vanilla** — solo TailwindCSS

---

## 🧑‍💻 Naming e Stile

- **Variabili e funzioni**: `camelCase`
- **Componenti React**: `PascalCase` (es. `LoginPage`, `DashboardCard`)
- **Custom hooks**: `use` + `PascalCase` (es. `useAuth`, `useDashboardData`)
- **Constants**: `UPPER_SNAKE_CASE`
- **File componenti**: `PascalCase.tsx`
- **File hooks/lib**: `camelCase.ts`
- **Cartelle**: `kebab-case` (`auth-routes`, `form-helpers`, `db-migrations`)

---

## 🗺️ File-Based Routing (TanStack Router v1)

**Configurazione:** Router Vite plugin installato (`@tanstack/router-plugin`)

**Struttura file → route:**
```
src/routes/
  __root.tsx    → Root layout con <Outlet />
  index.tsx     → /
  login.tsx     → /login
  register.tsx  → /register
  dashboard.tsx → /dashboard (protetta)
  public.tsx    → /public
  _error.tsx    → (opzionale) Error boundary
  _offline.tsx  → (opzionale) Offline page
```

**`__root.tsx` — Layout globale:**
```typescript
// Root layout con QueryClientProvider + Outlet
const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <div className="layout">
      <Header />
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}
```

**Route protette con `beforeLoad`:**
```typescript
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    requireAuth(); // Controlla token, reindirizza a /login se non autenticato
  },
  component: DashboardPage,
});
```

---

## 📝 Form con TanStack Form

**Pattern consigliato:** `useAppForm` con composizione di form (form-composition pattern).

**Validazione:** Usare schemi Zod dal shared package a livello di form.

```typescript
// Esempio: form di login
import { useForm } from '@tanstack/react-form';
import { loginSchema } from '@mono/shared';

const form = useForm({
  defaultValues: { email: '', password: '' },
  onSubmit: async ({ value }) => {
    // Validazione Zod a livello di form
    const result = loginSchema.safeParse(value);
    if (!result.success) {
      setError(result.error.errors.map(e => e.message).join(', '));
      return;
    }
    // ... invio API
  },
});
```

**Regole:**
- Validazione field-level con `validators.onChange: schema.shape.fieldName`
- Validazione cross-field con `.refine()` su uno schema combinato
- Usare `form.Field` per ogni campo con `field.state.value`, `field.handleChange`, `field.handleBlur`
- Errori: `field.state.meta.errors` — gestire sia stringa che oggetto {message}

---

## 🔄 Query con TanStack Query

**Regola: MAI usare Query direttamente nel componente.**

```typescript
// ❌ NO — query dentro il componente
function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/protected/dashboard') });
  // ...
}

// ✅ SÌ — hook dedicato
// hooks/useDashboardData.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from '@/libs/api';

export function useDashboardData() {
  return useSuspenseQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/protected/dashboard'),
    staleTime: 1000 * 60, // 1 minuto
  });
}

// Dashboard.tsx
import { useDashboardData } from '@/hooks/useDashboardData';

function Dashboard() {
  const { data } = useDashboardData(); // data è tipata e non undefined (suspense)
  // ...
}
```

**Regole:**
- Usare `useSuspenseQuery` quando i dati sono obbligatori per il componente
- Usare `useQuery` quando i dati sono opzionali
- Ogni endpoint API deve avere il proprio hook
- Hook devono essere in `hooks/`
- `staleTime` default: 1 minuto per dati di profilo, 5 minuti per dati statici

---

## 🛠️ State Management con Zustand

```typescript
// stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (data: AuthData) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... state e actions
    }),
    { name: 'auth-storage' }
  )
);
```

**Regole:**
- Solo auth e stato UI globale in Zustand
- Per stato locale del componente: `useState`
- Per stato sincronizzato con server: TanStack Query
- Persistenza: solo per dati che devono sopravvivere al refresh (auth)

---

## 🎨 UI con shadcn/ui + TailwindCSS v4

**Componenti disponibili:**
- `Button` — varianti: default, destructive, outline, secondary, ghost, link
- `Card` — Card + CardHeader + CardContent + CardTitle + CardDescription
- `Input` — con icone absolute positioning per campi iconizzati
- `Label` — per etichette form
- `Alert` — varianti: default, destructive, success

**TailwindCSS v4:**
- Usare `@tailwindcss/vite` come plugin
- Nessuna configurazione `tailwind.config.js` necessaria (v4 usa CSS-first)
- Variabili CSS per tema: `--background`, `--foreground`, `--primary`, ecc.
- Token tailwind: `bg-primary`, `text-muted-foreground`, `border-border`

**Regole CSS:**
- **MAI scrivere CSS custom** — solo classi Tailwind
- Usare `cn()` da `@/libs/utils` per class merge con `clsx` + `tailwind-merge`
- Layout: Flexbox e Grid — evitare margini negativi e hack
- Responsive: sm/md/lg breakpoints

---

## 📡 API Client

```typescript
// libs/api.ts
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Merge headers sicuro (mai spread di options.headers)
  // ...
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  
  // Auto token refresh su 401
  if (response.status === 401) {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      // ... tentare refresh
    }
  }
  // ...
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
};
```

**Regole:**
- Header: merge manuale, MAI spread di `options.headers` (causa type error)
- Auto-refresh token su 401
- Errori: eravamo sempre `{ success: false, error: string }` dal backend
- Type safety: `api.get<Type>()` — MAI usare senza generic

---

## 🧪 Test con Bun

```typescript
// apps/backend/src/routes/__tests__/auth.test.ts
import { describe, it, expect } from 'bun:test';
import { hashPassword, verifyPassword } from '../auth';

describe('Password Hashing', () => {
  it('hashes a password correctly', async () => {
    const hash = await hashPassword('password123');
    expect(hash).toContain(':');
    expect(hash.split(':')).toHaveLength(2);
  });
  
  it('verifies correct password', async () => {
    const hash = await hashPassword('password123');
    const valid = await verifyPassword('password123', hash);
    expect(valid).toBe(true);
  });
  
  it('rejects wrong password', async () => {
    const hash = await hashPassword('password123');
    const valid = await verifyPassword('wrongpassword', hash);
    expect(valid).toBe(false);
  });
});
```

**Regole:**
- `bun test` — zero config, nativo
- Test per ogni funzione di business logic
- Test per validazione schemi Zod
- Test per hash/verify password
- Coprire casi di successo e errore
- Nomi test descrittivi: `describe('X', () => it('does Y when Z', ...))`

---

## ✅ Checklist Modifica Frontend

- [ ] La logica è separata dal componente (hook o utility)?
- [ ] I dati sono fetchati da un hook dedicato (non direttamente nel componente)?
- [ ] Si usa `useSuspenseQuery` dove appropriato?
- [ ] La validazione usa schemi Zod dal shared package?
- [ ] Sono presenti commenti su tutte le funzioni pubbliche?
- [ ] Il nome del file segue `PascalCase.tsx` (componente) o `camelCase.ts` (hook/lib)?
- [ ] Il commit è descrittivo (Conventional Commits)?
- [ ] È presente un test per la logica business?
- [ ] Sono usati solo componenti shadcn/ui e classi Tailwind (zero CSS custom)?

---

## 📚 Risorse

- TanStack Router: https://tanstack.com/router/latest/docs/framework/react/overview
- TanStack Form: https://tanstack.com/form/latest/docs/framework/react/overview
- TanStack Query: https://tanstack.com/query/latest/docs/react/overview
- Zustand: https://zustand.docs.pmnd.rs/
- shadcn/ui: https://ui.shadcn.com/
- TailwindCSS v4: https://tailwindcss.com/docs/v4-beta
