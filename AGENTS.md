# AGENTS.md — Regole del Monorepo

> **Per Hermes:** Segui queste regole in tutto il progetto. Ogni modifica deve essere commitata immediatamente.

## 📐 Struttura del Progetto

```
bun-monorepo/
├── package.json          # Root workspace
├── bunfig.toml           # Configurazione Bun
├── apps/
│   ├── backend/          # ElysiaJS API
│   └── frontend/         # React SPA
└── packages/
    └── shared/           # Schemi Zod, tipi, costanti condivise
```

**Regola:** Ogni feature/deve vivere nella sua cartella. Mai files "orfani" nella root della cartella.

---

## 🧑‍💻 Naming Conventions

- **Variabili e funzioni**: `camelCase`
- **Classi, componenti React, interfacce**: `PascalCase`
- **Costanti**: `UPPER_SNAKE_CASE`
- **File**: `camelCase.ts` o `PascalCase.tsx` (componenti)
- **Cartelle**: `kebab-case` (`auth-routes`, `form-helpers`, `db-migrations`)

---

## 📝 Commits — Conventional Commits

Formato: `type: descrizione chiara`

| Type     | Quando usarlo |
|----------|---------------|
| `feat`   | Nuova funzionalità |
| `fix`    | Fix di un bug |
| `refactor` | Riscrittura senza cambiare comportamento |
| `style`  | Formattazione, spazi, lint (niente logica) |
| `docs`   | Documentazione |
| `test`   | Aggiunta/modifica test |
| `chore`  | Build, config, tooling |

**Esempi:**
```
feat: add user registration with Zod validation
fix: resolve TypeScript error in api.ts headers type
refactor: move auth logic from Dashboard to dedicated hook
test: add unit tests for password hashing utility
```

**Obbligatorio:** Ogni commit deve avere un messaggio descrittivo. Niente `update`, `fix`, `changes`.

---

## ✅ Regole Generali di Codice

1. **Codice pulito, organizzato, commentato** — sempre.
2. **Mai business logic nei componenti** — separare in hooks (`hooks/`) o utilities (`libs/`).
3. **Metodi e funzioni sempre commentati** con:
   - Descrizione dello scopo
   - Chi lo usa
   - Dove lo usa
   - Breve esempio di utilizzo
4. **Zero CSS vanilla** — usare sempre TailwindCSS. Eccezioni solo per casi strettamente necessari.
5. **Condividere il più possibile** — qualsiasi cosa usata da backend e frontend va nel package `shared`.
6. **Test sempre presenti** per la logica business.

---

## 🔧 Tooling

- **Runtime**: Bun v1.3+
- **Package manager**: `bun install` (workspace monorepo)
- **Linting**: ESLint con config condivisa
- **Test**: `bun test` (built-in, zero config)
- **TypeScript**: strict mode sempre attivo

---

## 🔄 Migrazione Dati

- **Sviluppo/MVP**: SQLite (prisma/schema.prisma)
- **Produzione**: PostgreSQL con migration plan documentato
- **Nota**: Il package `shared` deve contenere i tipi dei modelli per separare il DB dall'API

---

## 📦 Package Shared `@mono/shared`

Contenuto **obbligatorio**:
- ✅ Schemi Zod per validazione input/output
- ✅ Interfacce TypeScript usate da entrambi i lati
- ✅ Costanti di configurazione (JWT_EXPIRY, error messages, ecc.)
- ✅ Utility functions usate sia da frontend che backend

Contenuto **vietato**:
- ❌ Logica di business specifica
- ❌ Dipendenze di framework (React, Elysia, ecc.)
- ❌ Query/Logica DB
