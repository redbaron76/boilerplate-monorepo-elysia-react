# AGENTS.md — Frontend (React + TanStack)

> **Stack**: React 19 + Vite + TypeScript + TanStack Router + TanStack Form v1 + TanStack Query v5 + Zustand + shadcn/ui + TailwindCSS v4
> **Per Hermes:** Segui queste regole per ogni modifica al frontend. Committa dopo ogni cambiamento significativo.

## 📐 Struttura del Frontend

```
apps/frontend/
├── package.json
├── vite.config.ts          # Vite + React plugin + TanStack Router plugin + TailwindCSS v4
├── tsconfig.json
├── postcss.config.js
├── tailwind.config.js
└── src/
    ├── main.tsx            # Entry point — QueryClientProvider, RouterProvider, providers
    ├── index.css           # Tailwind directives + CSS variables (se necessarie)
    ├── routeTree.gen.ts    # Auto-generato da @tanstack/router-plugin
    ├── routes/             # File-based routing con TanStack Router
    │   ├── __root.tsx      # Layout root — QueryClientProvider context, Header, Outlet
    │   ├── index.tsx       # Home page (/)
    │   ├── login.tsx       # Login page (/login)
    │   ├── register.tsx    # Register page (/register)
    │   ├── dashboard.tsx   # Dashboard protetta (/dashboard)
    │   ├── settings.tsx    # Settings protetta (/settings)
    │   ├── $slug.tsx       # Profilo pubblico per slug (/:slug, level root)
    │   └── public.tsx      # Pagina pubblica (/public)
    ├── apis/               # Funzioni async per ogni risorsa
    │   ├── auth.ts         # /api/auth/*
    │   └── profile.ts      # /api/profile/*
    ├── hooks/              # Custom hooks: useQueryOptions factories + hooks
    │   ├── useDashboardData.ts
    │   └── useProfileData.ts
    ├── libs/               # Utility, API client, query keys, utils
    │   ├── api.ts          # API client con auto-refresh token
    │   ├── query-keys.ts   # Query key factories centralizzate
    │   └── utils.ts        # cn() per class merge
    ├── stores/             # Zustand stores (auth)
    │   └── auth.ts
    └── components/
        ├── ui/             # shadcn/ui (button, card, input, alert, label)
        ├── layout/         # Header, Footer
        └── FieldError.tsx  # Display errori Zod unificato
```

**Regola: metodi asincroni in `/apis`**
Tutte le chiamate API vanno in `/apis` con nomi coerenti all'endpoint:
- `/auth/login` → `apis/auth.ts` → `login(email, password)`
- `/profile/me` → `apis/profile.ts` → `getOwnProfile()`, `updateOwnProfile()`
- `/profile/:slug` → `apis/profile.ts` → `getPublicProfile(slug)`
- Ogni file esporta solo funzioni async, zero business logic

---

## 🗺️ TanStack Router v1

### File-Based Routing

Il Vite plugin `@tanstack/router-plugin` genera `routeTree.gen.ts` automaticamente.

**Naming conventions:**
| Pattern | Tipo | Esempio |
|---|---|---|
| `__root.tsx` | Root layout | Wrap di tutto l'app |
| `index.tsx` | Index | `/` |
| `$slug.tsx` | Dynamic param | `/:slug` |
| `dashboard.tsx` | Static route | `/dashboard` |
| `settings.tsx` | Static route | `/settings` |
| `_auth.tsx` | Pathless layout | N/A (groups routes) |

**Pathless layouts (prefix `_`):** usati per layout senza segmento URL. Es: `_auth.tsx` con `beforeLoad` per auth guard condiviso.

### Route Factory Pattern

Ogni route file deve usare `createFileRoute`:

```tsx
// routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth';

function requireAuth() {
  // ✅ USE Imperative getState() — beforeLoad runs OUTSIDE React
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    window.location.href = '/login';
    throw new Error('UNAUTHENTICATED');
  }
}

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth,
  component: DashboardPage,
});
```

**⚠️ CRITICO: `beforeLoad` gira FUORI da React.**
- ❌ MAI chiamare React hooks (`useAuthStore()`) in `beforeLoad` → "Invalid hook call"
- ✅ SEMPRE usare la forma imperativa (`useAuthStore.getState()`)
- ✅ Oppure creare un custom hook wrapper separato che chiama l'hook (ma non direttamente in `beforeLoad`)

### Route Loaders & Data Fetching

I route loaders integrano direttamente TanStack Query:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { queryOptions } from '@tanstack/react-query';

const todoQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['todo', id] as const,
    queryFn: () => fetchTodo(id),
  });

export const Route = createFileRoute('/todos/$todoId')({
  loader: ({ context: { queryClient }, params: { todoId } }) =>
    queryClient.ensureQueryData(todoQueryOptions(todoId)),
  component: TodoPage,
});

function TodoPage() {
  const { todoId } = Route.useParams();
  const { data } = useQuery(todoQueryOptions(todoId));
  // data è typing corretto grazie a queryOptions
}
```

### Search Params Validation

```tsx
import { z } from 'zod';

const searchSchema = z.object({
  page: z.coerce.number().default(1),
  filter: z.string().default(''),
});

export const Route = createFileRoute('/posts')({
  validateSearch: searchSchema.parse,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps: { page } }) => {
    return fetchPosts({ page });
  },
});
```

### Public Routes vs Protected Routes

- **Pubbliche** (nessun `beforeLoad`): `index.tsx`, `$slug.tsx`
- **Protette** (`beforeLoad` con auth check): `dashboard.tsx`, `settings.tsx`
- **Root-level per pubblici**: le rotte di profilo pubblico vanno a livello root (`$slug.tsx`) non sotto `/profile/`, altrimenti collidono con l'auth guard di `/profile`

### Navigation

```tsx
import { Link, useNavigate } from '@tanstack/react-router';

// Declarative
<Link to="/dashboard">Dashboard</Link>
<Link to="/posts/$postId" params={{ postId: '123' }}>Post</Link>
<Link to="/posts" search={{ page: 2 }}>Page 2</Link>
<Link to="/posts" preload="intent">Preload on hover</Link>

// Programmatic
const navigate = useNavigate();
navigate({ to: '/dashboard' });
navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) });
```

### Not Found Handling

```tsx
export const Route = createFileRoute('/posts/$slug')({
  loader: async ({ params }) => {
    const profile = await fetchProfile(params.slug);
    if (!profile) throw notFound();
    return { profile };
  },
  notFoundComponent: () => <div>Utente non trovato</div>,
});
```

---

## 📝 TanStack Form v1

### Core Pattern

```tsx
import { useForm } from '@tanstack/react-form';
import { updateProfileSchema } from '@mono/shared';

function SettingsPage() {
  const form = useForm({
    defaultValues: {
      nickname: '',
      gender: '',
      birthDate: '',
      avatar: '',
    },
    onSubmit: async ({ value }) => {
      // Validazione Zod a livello di form (solo al submit)
      const parsed = updateProfileSchema.safeParse({
        nickname: value.nickname || undefined,
        gender: value.gender || undefined,
        birthDate: value.birthDate || undefined,
        avatar: value.avatar || undefined,
      });

      if (!parsed.success) {
        setFormError(parsed.error.issues.map(e => e.message).join(', '));
        return;
      }

      // ... submit API
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="nickname"
        children={(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      />
      {/* Errori: */}
      {field.state.meta.errors.length > 0 && (
        <span>{field.state.meta.errors[0]?.message}</span>
      )}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Form Instance Caching (Anti-Re-Render Bug)

Quando un componente si re-renderizza, `useForm` ricrea il form resettando i valori. **Usa `useRef` per cache:**

```tsx
const formRef = useRef<ReturnType<typeof useForm> | null>(null);

const getForm = useCallback(() => {
  if (!formRef.current) {
    formRef.current = useForm({...});
  }
  return formRef.current;
}, []);
```

### Form Field Pattern con validazione

```tsx
<form.Field
  name="email"
  validators={{
    onChange: (value) => {
      if (!value.includes('@')) return 'Email non valida';
      return '';
    },
  }}
  children={(field) => (
    <input
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
/>
```

### Linked/Dependent Fields

```tsx
const form = useForm({...});

onChange={(e) => {
  field.handleChange(e.target.value);
  // Sync dipendente field
  form.setFieldValue('slug', generateSlug(e.target.value));
}}
```

**⚠️ Pitfall: Zod `.refine()` in `onChange` validators**
- Zod v3+ restituisce `.issues` non `.errors`
- Validazioni complesse con `.refine()` o `.transform()` possono fallire su input parziale
- **Usare validazione solo al submit** oppure validazione field-level semplice

---

## 🔄 TanStack Query v5

### Query Options Pattern (Recommended)

```tsx
// libs/query-keys.ts
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  profile: ['profile'] as const,
  publicProfile: (slug: string) => ['profile', 'public', slug] as const,
  ownProfile: ['profile', 'own'] as const,
};

// hooks/useDashboardData.ts
import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { api } from '@/libs/api';

export function useDashboardQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get('/protected/dashboard'),
    staleTime: 1000 * 60, // 1 minuto
    gcTime: 1000 * 60 * 5,
    retry: 3,
  });
}

// Hook wrapper — scelga tra useQuery e useSuspenseQuery
export function useDashboardData() {
  return useSuspenseQuery(useDashboardQueryOptions());
}
```

### `useQuery` vs `useSuspenseQuery`

| Quando usare | Hook | Perché |
|---|---|---|
| Dati obbligatori + Suspense boundary | `useSuspenseQuery` | Componente più pulito, data è guaranteed |
| Dati opzionali / "not found" messages | `useQuery` | `useSuspenseQuery` crasha senza popolare `error` |
| Liste con pagination | `useQuery` | Serve controllare `isLoading` per loading state |
| Route loader + React Query integration | Entrambi | Loader usa `ensureQueryData`, componente usa hook |

**⚠️ CRITICO: Non usare `useSuspenseQuery` per rotte che possono "not found"**
Se una pagina deve mostrare "Utente non trovato" (profilo pubblico), usa `useQuery`. `useSuspenseQuery` lancia un errore che il Suspense boundary cattura, ma il campo `error` non è accessibile nel componente.

### Mutations con Optimistic Updates

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      api.put('/protected/profile', data),

    onMutate: async (variables) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.ownProfile });

      // 2. Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.ownProfile);

      // 3. Optimistic update
      queryClient.setQueryData(queryKeys.ownProfile, (old) => ({
        ...old,
        ...variables,
      }));

      // 4. Return context for rollback
      return { previous };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
    },

    onError: (_err, _vars, context) => {
      // Rollback
      queryClient.setQueryData(queryKeys.ownProfile, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
    },
  });
}
```

### Best Practices

1. **Usare `queryOptions` helper** per config type-safe e riutilizzabile
2. **Strutturare query keys gerarchicamente** per invalidation granulare
3. **`staleTime`**: 0 = sempre refetch (default), aumenta per dati poco dinamici
4. **`placeholderData`** (non `initialData`) per keep previous data during pagination
5. **`enabled`** per query dipendenti, NON chiamate conditional
6. **Sempre invalidate dopo mutation** — non affidarsi solo a optimistic updates
7. **Cancel queries in `onMutate`** prima di optimistic updates (race conditions)
8. **`ensureQueryData`** in route loaders invece di `prefetchQuery`
9. **Non destrutturare il result** se va passato altrove (rompe reattività)
10. **Usare `select`** per derived data invece di trasformare nel componente

### Query Invalidation

```tsx
queryClient.invalidateQueries({ queryKey: ['profile'] });              // Prefix
queryClient.invalidateQueries({ queryKey: ['profile', 1], exact: true }); // Exact
queryClient.refetchQueries({ queryKey: ['profile'] });                 // + refetch
queryClient.removeQueries({ queryKey: ['profile', 1] });               // Remove
```

---

## 🛠️ Zustand

```tsx
// stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAuth: (data: AuthData) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setAuth: (data) => set({ accessToken: data.token, user: data.user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

**⚠️ In `beforeLoad` di TanStack Router:**
- ❌ `useAuthStore()` (hook) → "Invalid hook call"
- ✅ `useAuthStore.getState()` (imperativo) → funziona fuori da React

---

## ✅ Checklist Modifica Frontend

- [ ] Router: `beforeLoad` usa solo imperative store access (`getState()`), mai hooks
- [ ] Router: rotte pubbliche a livello root se devono evitare auth guard
- [ ] Router: `params` e `validateSearch` tipizzati con Zod
- [ ] Form: istanza form cache con `useRef` per evitare re-render reset
- [ ] Form: validazione Zod al submit, non `onChange` con `.refine()` complessi
- [ ] Form: `field.state.meta.errors` per display (non `.errors`)
- [ ] Query: `useQuery` per rotte "not found", `useSuspenseQuery` per dati obbligatori
- [ ] Query: query options factory con `queryOptions` helper
- [ ] Query: query keys `as const` per tipizzazione stretta
- [ ] Query: `onMutate` cancel + optimistic + `onError` rollback pattern
- [ ] Query: `onSettled` sempre invalidate per sincronizzazione
- [ ] Naming: `PascalCase.tsx` per componenti, `camelCase.ts` per hooks/libs
- [ ] Zero CSS custom — solo Tailwind
- [ ] Zero business logic nei componenti
