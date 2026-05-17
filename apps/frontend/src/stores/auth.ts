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