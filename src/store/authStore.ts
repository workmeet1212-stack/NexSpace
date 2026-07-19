import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types/auth.types';
import { authService } from '../services/auth.service';
import socketService from '../services/socket.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false, // ✅ CHANGED: false by default

      setUser: (user) => set({ user }),
      setAccessToken: (token) => set({ accessToken: token }),

      login: (user, token) => {
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
        socketService.connect(token);
      },

      logout: () => {
        socketService.disconnect();
        authService.logout().catch(() => {});
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      fetchUser: async () => {
        const token = get().accessToken;
        if (!token) {
          set({ isLoading: false, isAuthenticated: false, user: null });
          return;
        }

        try {
          set({ isLoading: true });
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
          const currentToken = get().accessToken;
          if (currentToken) socketService.connect(currentToken);
        } catch {
          // The api interceptor already attempted a token refresh and,
          // if that failed, cleared storage + redirected to /login.
          // Here we just reset local state to match.
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'nexspace-auth',
      storage: createJSONStorage(() => localStorage),
      // ✅ Persist accessToken too!
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);