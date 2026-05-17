import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { Menu, X } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🚀</span>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              Bun Monorepo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              Home
            </Link>
            <Link
              to="/public"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              Scopri di più
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                >
                  Dashboard
                </Link>
                <span className="px-3 py-2 text-sm text-muted-foreground hidden lg:inline">
                  Ciao, {user?.name || user?.email.split('@')[0]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  Esci
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent">
                    Accedi
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md shadow-indigo-500/20">
                    Registrati
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-border/40 pt-4 space-y-1">
            <Link
              to="/"
              className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/public"
              className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              onClick={() => setMobileOpen(false)}
            >
              Scopri di più
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <span className="block px-4 py-2 text-sm text-muted-foreground">
                  Ciao, {user?.name || user?.email.split('@')[0]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  Esci
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2 px-4 pt-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setMobileOpen(false)}>
                      Accedi
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0">
                      Registrati
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
