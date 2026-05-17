import { execSync } from 'child_process';

const BASE = '/opt/data/bun-monorepo/apps/frontend';

// Generate auth-loader
const authLoaderCode = `
import { useAuthStore } from '@/stores/auth';

export const useAuthLoader = () => {
  const { accessToken } = useAuthStore();
  if (!accessToken) {
    throw new Error('UNAUTHENTICATED');
  }
  return useAuthStore.getState();
};
`;

// Generate store
const storeCode = `
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; name: string | null } | null;
  setAuth: (data: { accessToken: string; refreshToken: string; user: { id: string; email: string; name: string | null } }) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (data) => set({ ...data, isAuthenticated: true }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
      isAuthenticated: false,
    }),
    { name: 'auth-storage' }
  )
);
`;

// Write auth-loader
console.log('Creating frontend files...');

const fs = require('fs');
const path = require('path');

function write(filePath, content) {
  const fullPath = path.join(BASE, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
  console.log('  ✓', filePath);
}

// ===== SHARED TYPES =====
write('/src/types/api.ts', `
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface AuthSuccessResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}
`);

// ===== API CLIENT =====
write('/src/lib/api.ts', `
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { useAuthStore } = await import('@/stores/auth');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    headers['Authorization'] = \`Bearer \${accessToken}\`;
  }

  const response = await fetch(\`\${API_BASE}\${url}\`, {
    ...options,
    headers,
    body: options?.body,
  });

  // Handle 401 - try token refresh
  if (response.status === 401) {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(\`\${API_BASE}/auth/refresh\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json() as { success: true; data: { accessToken: string; refreshToken: string } };
          useAuthStore.getState().setAuth({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: useAuthStore.getState().user!,
          });

          // Retry original request with new token
          headers['Authorization'] = \`Bearer \${data.data.accessToken}\`;
          const retryResponse = await fetch(\`\${API_BASE}\${url}\`, { ...options, headers });
          return retryResponse.json() as Promise<T>;
        }
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(error.error || 'Errore sconosciuto');
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
`);

// ===== AUTH UTILS =====
write('/src/utils/auth-loader.ts', `
import { useAuthStore } from '@/stores/auth';

export function useAuthLoader() {
  const { accessToken, user } = useAuthStore.getState();
  if (!accessToken || !user) {
    throw new Error('UNAUTHENTICATED');
  }
  return { accessToken, user };
}
`);

// ===== STORES =====
write('/src/stores/auth.ts', `
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; name: string | null } | null;
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string | null };
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (data) => set(data),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
`);

// ===== UI COMPONENTS =====
write('/src/components/ui/button.tsx', `
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
`);

write('/src/components/ui/input.tsx', `
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
`);

write('/src/components/ui/label.tsx', `
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
`);

write('/src/components/ui/card.tsx', `
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
`);

write('/src/components/ui/alert.tsx', `
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-success/50 text-success [&>svg]:text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  )
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
`);

// ===== LAYOUT COMPONENTS =====
write('/src/components/layout/Header.tsx', `
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

export function Header() {
  const { user, logout, isAuthenticated } = useAuthStore();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
          🚀 Bun Monorepo
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/public" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pubblica
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <span className="text-sm text-muted-foreground">Ciao, {user?.name || user?.email}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Esci
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Accedi</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Registrati</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
`);

write('/src/components/layout/Footer.tsx', `
export function Footer() {
  return (
    <footer className="border-t bg-muted/50 py-6">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        <p>Bun Monorepo &copy; {new Date().getFullYear()} — Built with ElysiaJS, Prisma, Vite, React</p>
      </div>
    </footer>
  );
}
`);

// ===== PAGES =====
write('/src/pages/Home.tsx', `
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';

export function Home() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Bun Monorepo
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Prototipo con ElysiaJS, Prisma, SQLite, React, TanStack Router & Query
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🔧 Backend</CardTitle>
            <CardDescription>Tecnologie</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• ElysiaJS</li>
              <li>• Prisma ORM</li>
              <li>• SQLite</li>
              <li>• TypeScript</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🎨 Frontend</CardTitle>
            <CardDescription>Tecnologie</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Vite + React</li>
              <li>• TanStack Router</li>
              <li>• TanStack Query</li>
              <li>• Tailwind CSS v4</li>
              <li>• shadcn/ui</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">🔐 Auth</CardTitle>
            <CardDescription>Sicurezza</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• JWT (15 min)</li>
              <li>• Refresh Token</li>
              <li>• Password hashing</li>
              <li>• Bearer Token</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {isAuthenticated ? (
          <Link to="/dashboard">
            <Button size="lg" className="text-lg px-8">
              Vai alla Dashboard →
            </Button>
          </Link>
        ) : (
          <>
            <Link to="/register">
              <Button size="lg" className="text-lg px-8">
                Registrati Gratis
              </Button>
            </Link>
            <Link to="/public">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Scopri di più
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
`);

write('/src/pages/PublicPage.tsx', `
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PublicPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Pagina Pubblica</h1>
      <p className="text-lg text-muted-foreground mb-10">
        Questa pagina è accessibile a tutti, senza bisogno di autenticazione.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>📊 Architettura</CardTitle>
            <CardDescription>Stack tecnologico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runtime</span>
              <span className="font-medium">Bun</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backend</span>
              <span className="font-medium">ElysiaJS + TypeScript</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium">SQLite + Prisma</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frontend</span>
              <span className="font-medium">Vite + React</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Routing</span>
              <span className="font-medium">TanStack Router</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stato</span>
              <span className="font-medium">Zustand</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Fetching</span>
              <span className="font-medium">TanStack Query</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validazione</span>
              <span className="font-medium">Zod (shared)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">UI</span>
              <span className="font-medium">shadcn/ui + Tailwind v4</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔗 API Endpoints</CardTitle>
            <CardDescription>Rotte disponibili</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">GET</span>
                <code className="text-xs font-mono">/api/public/info</code>
                <span className="text-muted-foreground">— Pubblica</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">POST</span>
                <code className="text-xs font-mono">/api/auth/register</code>
                <span className="text-muted-foreground">— Registrazione</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">POST</span>
                <code className="text-xs font-mono">/api/auth/login</code>
                <span className="text-muted-foreground">— Accesso</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">POST</span>
                <code className="text-xs font-mono">/api/auth/refresh</code>
                <span className="text-muted-foreground">— Refresh token</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">GET</span>
                <code className="text-xs font-mono">/api/protected/dashboard</code>
                <span className="text-muted-foreground">— 🧱 Protetto</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`);

write('/src/pages/Login.tsx', `
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
        const response = await api.post<AuthSuccessResponse>('/auth/login', {
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
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Accedi</CardTitle>
          <CardDescription>Inserisci le tue credenziali per accedere</CardDescription>
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
              <Alert variant="destructive">
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
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="nome@esempio.it"
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
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
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="••••••••"
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
                  )}
                </div>
              )}
            </form.Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Non hai un account?</span>{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Registrati
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

write('/src/pages/Register.tsx', `
import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { registerSchema } from '@mono/shared';
import { api } from '@/lib/api';

export function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const combinedSchema = registerSchema.merge(z.object({
        confirmPassword: registerSchema.shape.password,
      }));
      const parseResult = combinedSchema.safeParse(value);
      if (!parseResult.success) {
        setError(parseResult.error.errors.map(e => e.message).join(', '));
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await api.post<{ success: true; message: string }>('/auth/register', {
          email: value.email,
          password: value.password,
        });

        setSuccess(response.message || 'Registrazione completata! Reindirizzamento al login...');
        setTimeout(() => router.navigate({ to: '/login' }), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la registrazione');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert variant="success">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form.Field
              name="email"
              validators={{
                onChange: registerSchema.shape.email,
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="nome@esempio.it"
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: registerSchema.shape.password,
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Minimo 8 caratteri"
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onChange: (val: string) => {
                  if (val.length < 8) return 'Conferma la password (min 8 caratteri)';
                  return val !== form.getFieldValue('password') ? 'Le password non corrispondono' : undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Conferma Password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Ripeti la password"
                  />
                  {field.state.meta.errors && (
                    <p className="text-sm text-destructive">{field.state.meta.errors.join(', ')}</p>
                  )}
                </div>
              )}
            </form.Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registrazione in corso...' : 'Registrati'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Hai già un account?</span>{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Accedi
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`);

write('/src/pages/Dashboard.tsx', `
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

interface DashboardResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export function DashboardPage() {
  const { user, logout } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/protected/dashboard'),
    staleTime: 1000 * 60,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
          <div className="h-40 w-80 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Alert variant="destructive">
          <AlertDescription>Sesiione scaduta. {' '}
            <Button variant="link" onClick={() => { logout(); window.location.href = '/login' }}>
              Effettua il login
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Benvenuto nella tua area riservata</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>👤 Profilo</CardTitle>
            <CardDescription>Informazioni del tuo account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{data?.user.email || user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{data?.user.name || user?.name || 'Non impostato'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID Utente</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{data?.user.id || user?.id}</code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔐 Sessione</CardTitle>
            <CardDescription>Stato autenticazione</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium">Autenticato</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Token Type</p>
              <p className="text-sm">Bearer (JWT)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scadenza Token</p>
              <p className="text-sm">15 minuti</p>
            </div>
            <Button variant="destructive" onClick={() => { logout(); window.location.href = '/'; }}>
              Disconnetti
            </Button>
          </CardContent>
        </Card>
      </div>

      {data?.message && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>ℹ️ Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{data.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
`);

// ===== ROUTES =====
write('/src/routes/index.tsx', `
import { createFileRoute } from '@tanstack/react-router';
import { Home } from '@/pages/Home';

export const Route = createFileRoute('/')({
  component: Home,
});
`);

write('/src/routes/public.tsx', `
import { createFileRoute } from '@tanstack/react-router';
import { PublicPage } from '@/pages/PublicPage';

export const Route = createFileRoute('/public')({
  component: PublicPage,
});
`);

write('/src/routes/login.tsx', `
import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/pages/Login';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});
`);

write('/src/routes/register.tsx', `
import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/pages/Register';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});
`);

write('/src/routes/dashboard.tsx', `
import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/pages/Dashboard';
import { useAuthLoader } from '@/utils/auth-loader';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    useAuthLoader();
  },
  component: DashboardPage,
});
`);

// ===== MAIN ENTRY =====
write('/src/main.tsx', `
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { routerInstance } from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={routerInstance} />
  </StrictMode>
);
`);

// ===== ROUTER =====
write('/src/router.ts', `
import { createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Root } from './routes/__root';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

const router = createRouter({
  routeTree: Root,
  defaultPreload: 'intent',
  context: { queryClient },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const routerInstance = router;
`);

// ===== LIB =====
write('/src/lib/utils.ts', `
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`);

console.log('✅ All frontend files created!');
