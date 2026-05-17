import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import {
  User,
  Mail,
  Shield,
  Clock,
  LogOut,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface DashboardResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface TokenExpiry {
  expiresAt: Date;
  remaining: string;
  percent: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/protected/dashboard'),
    staleTime: 1000 * 60,
    retry: 1,
  });

  // Calculate mock token expiry for display
  const [tokenExpiry, setTokenExpiry] = useState<TokenExpiry>({
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    remaining: '15:00',
    percent: 100,
  });

  useEffect(() => {
    // Update timer every second
    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, (tokenExpiry.expiresAt.getTime() - now.getTime()) / 1000);
      const minutes = Math.floor(remaining / 60);
      const seconds = Math.floor(remaining % 60);
      setTokenExpiry(prev => ({
        ...prev,
        remaining: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        percent: (remaining / (15 * 60)) * 100,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sessione scaduta o non valida.
              <div className="mt-3">
                <Button variant="outline" onClick={() => { logout(); navigate({ to: '/login' }); }}>
                  Effettua il login
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Benvenuto
          </span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Gestisci il tuo account e la tua sessione
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <User className="text-indigo-600" size={20} />
              </div>
              <div>
                <CardTitle>Il tuo profilo</CardTitle>
                <CardDescription>Informazioni dell'account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="text-muted-foreground flex-shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{data?.user.email || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="text-muted-foreground flex-shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{data?.user.name || user?.name || 'Non impostato'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="text-muted-foreground flex-shrink-0" size={16} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">ID Utente</p>
                <code className="text-xs font-mono bg-background px-2 py-0.5 rounded border">{data?.user.id || user?.id}</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Card */}
        <Card className="border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Shield className="text-green-600" size={20} />
              </div>
              <div>
                <CardTitle>Sessione attiva</CardTitle>
                <CardDescription>Stato autenticazione</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="text-green-600 flex-shrink-0" size={16} />
              <span className="text-sm font-medium text-green-700">Autenticato</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo Token</span>
                <span className="font-medium">Bearer (JWT)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Durata</span>
                <span className="font-medium">15 minuti</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Scadenza</span>
                  <span className="font-medium font-mono">{tokenExpiry.remaining}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      tokenExpiry.percent > 50 ? 'bg-green-500' : tokenExpiry.percent > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${tokenExpiry.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              onClick={() => { logout(); navigate({ to: '/' }); }}
            >
              <LogOut size={16} />
              Disconnetti
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Info */}
      {data?.message && (
        <Card className="mt-6 border-border/50 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ℹ️ Informazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{data.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
