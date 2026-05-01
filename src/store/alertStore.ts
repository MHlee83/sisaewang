import { create } from 'zustand';
import type { AlertType } from '@/types';

export interface MockAlert {
  id: string;
  itemCode: string;
  itemName: string;
  alertType: AlertType;
  thresholdValue: number;
  isActive: boolean;
  createdAt: string;
}

interface AlertStoreState {
  alerts: MockAlert[];
  addAlert: (alert: MockAlert) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  toggleAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, isActive: !a.isActive } : a,
      ),
    })),
}));
