import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createRouter,
  RouterProvider,
  Outlet,
  createRootRouteWithContext,
  createRoute,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { Home } from '@/pages/Home';
import { PublicPage } from '@/pages/PublicPage';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { DashboardPage } from '@/pages/Dashboard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <h1 className="text-5xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-lg text-muted-foreground mb-6">Pagina non trovata</p>
      <a href="/" className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
        Torna alla home
      </a>
    </div>
  );
}

// Auth guard for protected routes
function requireAuth() {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) {
    window.location.href = '/login';
    throw new Error('UNAUTHENTICATED');
  }
}

// Create route tree
const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/public',
  component: PublicPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    requireAuth();
  },
  component: DashboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  publicRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
]);

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
