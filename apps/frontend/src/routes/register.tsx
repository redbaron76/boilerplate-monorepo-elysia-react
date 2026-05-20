import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { registerFullSchema, registerWithConfirmSchema } from '@/libs/auth-schemas';
import { register } from '@/apis/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/FieldError';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * Route di registrazione (/register).
 * Form di registrazione con validazione Zod field-level e cross-field.
 */
export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

/**
 * Componente pagina di registrazione.
 * Gestisce il form di creazione account con validazione completo.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      // Form-level cross-field validation using Zod schema
      const result = registerFullSchema.safeParse(value);
      if (!result.success) {
        const fieldErrors = result.error.issues.map((e) => e.message);
        setError(fieldErrors.join('; '));
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await register({
          email: value.email,
          password: value.password,
        });

        setSuccess(response.message || 'Registrazione completata! Reindirizzamento al login...');
        setTimeout(() => {
          // ✅ TanStack Router navigate — preserva stato in memoria
          navigate({ to: '/login' });
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la registrazione');
      } finally {
        setLoading(false);
      }
    },
  });

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 8) return { label: 'Debole', color: 'text-red-500', bg: 'bg-red-500', width: 'w-1/4' };
    if (pwd.length < 12) return { label: 'Discreta', color: 'text-yellow-500', bg: 'bg-yellow-500', width: 'w-2/4' };
    return { label: 'Forte', color: 'text-green-500', bg: 'bg-green-500', width: 'w-full' };
  };

  const strength = getPasswordStrength(form.getFieldValue('password'));

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={14} />
          Torna alla home
        </Link>

        <Card className="border-border/50 shadow-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <Lock className="text-white" size={20} />
            </div>
            <CardTitle className="text-2xl">Crea Account</CardTitle>
            <CardDescription>Inserisci i tuoi dati per registrarti</CardDescription>
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
              {success && (
                <Alert variant="success" className="text-sm">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form.Field
                name="email"
                validators={{
                  onChange: registerWithConfirmSchema.shape.email,
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
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onChange: registerWithConfirmSchema.shape.password,
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
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="pl-10 pr-10"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Minimo 8 caratteri"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {strength && (
                      <div className="space-y-1">
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${strength.bg} ${strength.width} transition-all duration-300`} />
                        </div>
                        <p className={`text-xs ${strength.color}`}>{strength.label}</p>
                      </div>
                    )}
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onChange: registerWithConfirmSchema.shape.confirmPassword,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Conferma Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="new-password"
                        className="pl-10"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Ripeti la password"
                      />
                    </div>
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-md shadow-purple-500/20"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registrazione in corso...
                  </span>
                ) : (
                  'Crea Account'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/40 text-center">
              <p className="text-sm text-muted-foreground">
                Hai già un account?{' '}
                <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium hover:underline">
                  Accedi
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
