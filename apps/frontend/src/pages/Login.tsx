import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/auth';
import { loginSchema } from '@mono/shared';
import { api } from '@/lib/api';
import { Mail, Lock, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      const parseResult = loginSchema.safeParse(value);
      if (!parseResult.success) {
        setError(parseResult.error.errors.map(e => e.message).join(', '));
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.post('/auth/login', {
          email: value.email,
          password: value.password,
        });

        if (response.success) {
          setAuth({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            user: response.data.user,
          });
          router.navigate({ to: '/dashboard' });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante il login');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={14} />
          Torna alla home
        </Link>

        <Card className="border-border/50 shadow-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Lock className="text-white" size={20} />
            </div>
            <CardTitle className="text-2xl">Bentornato</CardTitle>
            <CardDescription>Accedi al tuo account per continuare</CardDescription>
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
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form.Field
                name="email"
                validators={{
                  onChange: loginSchema.shape.email,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        className="pl-10"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="nome@esempio.it"
                      />
                    </div>
                    {field.state.meta.errors?.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(e =>
                          typeof e === 'string' ? e : e.message
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onChange: loginSchema.shape.password,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="current-password"
                        className="pl-10"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="••••••••"
                      />
                    </div>
                    {field.state.meta.errors?.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(e =>
                          typeof e === 'string' ? e : e.message
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md shadow-indigo-500/20" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Accesso in corso...
                  </span>
                ) : (
                  'Accedi'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/40 text-center">
              <p className="text-sm text-muted-foreground">
                Non hai un account?{' '}
                <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                  Registrati
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
