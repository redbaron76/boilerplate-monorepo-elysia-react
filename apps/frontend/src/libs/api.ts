const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { useAuthStore } = await import('@/stores/auth');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge additional headers safely
  if (options?.headers) {
    if (typeof options.headers === 'object' && !Array.isArray(options.headers)) {
      for (const [key, value] of Object.entries(options.headers)) {
        if (typeof value === 'string') headers[key] = value;
      }
    }
  }

  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    body: options?.body,
  });

  // Handle 401 - try token refresh (skip for auth endpoints)
  if (response.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
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
          headers['Authorization'] = `Bearer ${data.data.accessToken}`;
          const retryResponse = await fetch(`${API_BASE}${url}`, { ...options, headers });
          return retryResponse.json() as Promise<T>;
        }
      } catch {
        // Refresh failed - force logout
        useAuthStore.getState().logout();
      }
    }
    // Force navigate to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
    throw new Error(errorData.error || 'Errore sconosciuto');
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
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
