import { useAuthStore } from '@/stores/auth';

export function useAuthLoader() {
  const { accessToken, user } = useAuthStore.getState();
  if (!accessToken || !user) {
    throw new Error('UNAUTHENTICATED');
  }
  return { accessToken, user };
}