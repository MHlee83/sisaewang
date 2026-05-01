import { create } from 'zustand';
import type { User, UserType } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  updateUserType: (userType: UserType) => void;
  completeOnboarding: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  updateUserType: (userType) =>
    set((state) => ({
      user: state.user ? { ...state.user, userType } : null,
    })),

  // 온보딩 완료 → userType 설정해서 RootNavigator가 Main으로 전환되도록
  completeOnboarding: () =>
    set((state) => ({
      user: state.user
        ? { ...state.user, userType: state.user.userType ?? 'CONSUMER' }
        : {
            id: 0,
            uid: 'guest',
            email: null,
            nickname: '사용자',
            userType: 'CONSUMER' as const,
            fcmToken: null,
            isPremium: false,
            plan: 'FREE' as const,
            createdAt: new Date().toISOString(),
          },
      isAuthenticated: true,
      isLoading: false,
    })),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
