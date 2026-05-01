import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'reply' | 'like' | 'comment';
  message: string;
  postId: string;
  postTitle: string;
  fromUser: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationStoreState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((state) => {
      const newNotif: AppNotification = {
        ...n,
        id: Date.now().toString(),
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return {
        notifications: [newNotif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
