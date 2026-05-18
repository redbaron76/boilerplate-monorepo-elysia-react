import { createFileRoute } from '@tanstack/react-router';
import {
  Database,
  Server,
  LayoutTemplate,
  Lock,
  Zap,
  Layers,
  Code2,
  GitBranch,
} from 'lucide-react';

const techStack = [
  { icon: <Zap size={20} />, name: 'Bun', color: 'from-yellow-400 to-orange-500', desc: 'Runtime ultra-rapido' },
  { icon: <Server size={20} />, name: 'ElysiaJS', color: 'from-indigo-500 to-blue-600', desc: 'Backend framework moderno' },
  { icon: <Database size={20} />, name: 'Prisma', color: 'from-cyan-500 to-blue-500', desc: 'ORM type-safe' },
  { icon: <LayoutTemplate size={20} />, name: 'Vite', color: 'from-purple-500 to-pink-500', desc: 'Build tool ultra-veloce' },
  { icon: <Code2 size={20} />, name: 'React 19', color: 'from-cyan-400 to-blue-500', desc: 'UI library moderna' },
  { icon: <Lock size={20} />, name: 'JWT + Zod', color: 'from-green-500 to-emerald-600', desc: 'Auth + validazione' },
];

const apiEndpoints = [
  { method: 'GET', path: '/api/public/info', desc: 'Rotta pubblica — info generale', public: true },
  { method: 'POST', path: '/api/auth/register', desc: 'Registrazione utente', public: true },
  { method: 'POST', path: '/api/auth/login', desc: 'Login con email/password', public: true },
  { method: 'POST', path: '/api/auth/refresh', desc: 'Rinnovo token di accesso', public: false },
  { method: 'GET', path: '/api/protected/dashboard', desc: 'Dashboard privata', public: false },
];

/**
 * Route della pagina pubblica (/public).
 * Mostra l'architettura del monorepo e gli endpoint API.
 */
export const Route = createFileRoute('/public')({
  component: PublicPage,
});

/**
 * Componente pagina pubblica — architettura e info del progetto.
 */
export function PublicPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Architettura
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Scopri come è strutturato il monorepo e quali tecnologie vengono utilizzate
        </p>
      </div>

      {/* Tech Stack */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-8 text-center">Stack Tecnologico</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="card-hoverable bg-card border border-border/50 rounded-xl p-5 shadow-card group"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tech.color} flex items-center justify-center mb-3 text-white group-hover:scale-110 transition-transform`}>
                {tech.icon}
              </div>
              <h3 className="font-semibold mb-1">{tech.name}</h3>
              <p className="text-sm text-muted-foreground">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Endpoints */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-8 text-center">API Endpoints</h2>
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left px-6 py-4 font-medium text-muted-foreground">Metodo</th>
                    <th className="text-left px-6 py-4 font-medium text-muted-foreground">Path</th>
                    <th className="text-left px-6 py-4 font-medium text-muted-foreground hidden sm:table-cell">Descrizione</th>
                    <th className="text-center px-6 py-4 font-medium text-muted-foreground">Accesso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {apiEndpoints.map((ep) => (
                    <tr key={ep.path} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          ep.method === 'GET'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{ep.path}</td>
                      <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">{ep.desc}</td>
                      <td className="px-6 py-4 text-center">
                        {ep.public ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <GitBranch size={12} /> Pubblica
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Lock size={12} /> Protetta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-2xl font-bold mb-8 text-center">Come funziona</h2>
        <div className="max-w-3xl mx-auto grid gap-6">
          {[
            { num: '01', title: 'Registrazione', desc: 'Crea un account con email e password. La password viene hashata con PBKDF2.' },
            { num: '02', title: 'Login', desc: 'Accedi con le tue credenziali e ricevi un access token JWT (15 min) + refresh token.' },
            { num: '03', title: 'Navigazione', desc: 'Accedi alle pagine protette con il Bearer token. Il sistema rinnova automaticamente il token.' },
            { num: '04', title: 'Condivisione', desc: 'Schemi Zod condivisi tra frontend e backend per validazione type-safe.' },
          ].map((step) => (
            <div key={step.num} className="flex gap-4 items-start p-4 rounded-xl bg-card border border-border/50 shadow-card">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex-shrink-0 w-8">
                {step.num}
              </span>
              <div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
