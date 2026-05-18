import { createFileRoute } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Database, Code2, ArrowRight, Layers, KeyRound, Cpu } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * Route della home page (/).
 * Mostra hero section, features e stats del monorepo.
 */
export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-[120px] rounded-full" />

        <div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/80 text-indigo-700 text-sm font-medium mb-6 border border-indigo-200/50">
              <Zap size={14} />
              Monorepo moderno con Bun
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                Stack Completo
              </span>
              <br />
              <span className="text-foreground">Full-Stack</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Un monorepo moderno con <strong className="text-foreground">ElysiaJS</strong>,{' '}
              <strong className="text-foreground">Prisma ORM</strong>,{' '}
              <strong className="text-foreground">Vite</strong>,{' '}
              <strong className="text-foreground">React</strong> e{' '}
              <strong className="text-foreground">TanStack</strong>.
              Autenticazione JWT integrata con rotte protette.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/25">
                    Vai alla Dashboard
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/25">
                      Inizia Gratis
                      <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link to="/public">
                    <Button size="lg" variant="outline" className="gap-2">
                      Scopri di più
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-muted/20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Cos'è incluso
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tutto lo stack necessario per costruire applicazioni moderne
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Backend Card */}
            <div className="card-hoverable bg-card border border-border/50 rounded-xl p-6 shadow-card group">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Code2 className="text-indigo-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Backend Robusto</h3>
              <p className="text-sm text-muted-foreground mb-4">
                ElysiaJS con TypeScript, Prisma ORM e SQLite per un backend veloce e type-safe.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  ElysiaJS + TypeScript
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Prisma ORM + SQLite
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  PBKDF2 Password Hashing
                </li>
              </ul>
            </div>

            {/* Frontend Card */}
            <div className="card-hoverable bg-card border border-border/50 rounded-xl p-6 shadow-card group">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="text-cyan-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Frontend Moderno</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vite + React con TanStack Router, Query, Form e Tailwind CSS.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  Vite + React 19
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  TanStack Router + Query + Form
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  Tailwind CSS v4 + shadcn/ui
                </li>
              </ul>
            </div>

            {/* Auth Card */}
            <div className="card-hoverable bg-card border border-border/50 rounded-xl p-6 shadow-card group sm:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <KeyRound className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auth Completa</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sistema di autenticazione JWT con refresh token e rotte protette.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  JWT Access Token (15 min)
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Refresh Token rotation
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  Rotte protette + middleware
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-100/50">
              <div className="text-3xl font-bold text-indigo-600 mb-1">2</div>
              <div className="text-sm text-muted-foreground">Apps nel monorepo</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-100/50">
              <div className="text-3xl font-bold text-cyan-600 mb-1">5</div>
              <div className="text-sm text-muted-foreground">Pagine</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-100/50">
              <div className="text-3xl font-bold text-purple-600 mb-1">15m</div>
              <div className="text-sm text-muted-foreground">Scadenza JWT</div>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-100/50">
              <div className="text-3xl font-bold text-green-600 mb-1">∞</div>
              <div className="text-sm text-muted-foreground">Open Source</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
