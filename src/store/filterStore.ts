import { create } from 'zustand';

interface FilterState {
  selectedMarketCode: string;    // '000000' = 전체
  selectedCategoryCode: string;  // '' = 전체
  favoriteItemCodes: string[];   // 온보딩에서 선택한 관심 품목 코드

  setMarket: (code: string) => void;
  setCategory: (code: string) => void;
  setFavoriteItems: (codes: string[]) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedMarketCode: '000000',
  selectedCategoryCode: '',
  favoriteItemCodes: [],

  setMarket: (selectedMarketCode) => set({ selectedMarketCode }),
  setCategory: (selectedCategoryCode) => set({ selectedCategoryCode }),
  setFavoriteItems: (favoriteItemCodes) => set({ favoriteItemCodes }),
}));
