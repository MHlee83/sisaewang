import { create } from 'zustand';

export interface SavingsRecord {
  id: string;
  itemName: string;
  savedAmount: number; // 지난주 대비 절약액 (양수 = 저렴)
  date: string;        // YYYY-MM-DD
}

interface SavingsState {
  records: SavingsRecord[];
  addRecord: (itemName: string, savedAmount: number) => void;
  removeRecord: (id: string) => void;
  clearAll: () => void;
  totalSavings: () => number;
  thisMonthSavings: () => number;
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  records: [],

  addRecord: (itemName, savedAmount) =>
    set((state) => ({
      records: [
        {
          id: Date.now().toString(),
          itemName,
          savedAmount,
          date: new Date().toISOString().slice(0, 10),
        },
        ...state.records,
      ],
    })),

  removeRecord: (id) =>
    set((state) => ({ records: state.records.filter((r) => r.id !== id) })),

  clearAll: () => set({ records: [] }),

  totalSavings: () =>
    get().records.reduce((sum, r) => sum + r.savedAmount, 0),

  thisMonthSavings: () => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    return get()
      .records.filter((r) => r.date.startsWith(month))
      .reduce((sum, r) => sum + r.savedAmount, 0);
  },
}));
