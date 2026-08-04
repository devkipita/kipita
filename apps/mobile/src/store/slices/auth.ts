import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  session: { access_token: string; refresh_token: string } | null;
  isLoading: boolean;
  /**
   * True only once the real DB profile has been loaded (not the optimistic
   * seed applied during session hydration). Gates profile-completion prompts so
   * they never fire against the seed, whose `id` is the auth id and whose `city`
   * is always null.
   */
  profileLoaded: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: AuthState['session']) => void;
  setLoading: (loading: boolean) => void;
  setProfileLoaded: (loaded: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  profileLoaded: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setProfileLoaded: (profileLoaded) => set({ profileLoaded }),
  reset: () =>
    set({ user: null, session: null, isLoading: false, profileLoaded: false }),
}));
