import { create } from 'zustand';

interface FilterState {
  selectedMarketCode: string;
  selectedCategoryCode: string;
  favoriteItemCodes: string[];

  setMarket: (code: string) => void;
  setCategory: (code: string) => void;
  setFavoriteItems: (codes: string[]) => void;
  toggleFavorite: (code: string) => void;
  isFavorite: (code: string) => boolean;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  selectedMarketCode: '000000',
  selectedCategoryCode: '',
  favoriteItemCodes: [],

  setMarket: (selectedMarketCode) => set({ selectedMarketCode }),
  setCategory: (selectedCategoryCode) => set({ selectedCategoryCode }),
  setFavoriteItems: (favoriteItemCodes) => set({ favoriteItemCodes }),

  toggleFavorite: (code) =>
    set((state) => {
      const exists = state.favoriteItemCodes.includes(code);
      return {
        favoriteItemCodes: exists
          ? state.favoriteItemCodes.filter((c) => c !== code)
          : [...state.favoriteItemCodes, code],
      };
    }),

  isFavorite: (code) => get().favoriteItemCodes.includes(code),
}));
