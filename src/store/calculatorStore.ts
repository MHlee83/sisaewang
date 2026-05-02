/**
 * 계산기 상태 영속 스토어 (세션 내 캐시 — 화면 이탈 후 복원)
 */
import { create } from 'zustand';

// ── 장바구니 계산기 ──────────────────────────────────────
export interface BasketItem {
  itemCode: string;
  itemName: string;
  qty: number;
  price: number;
  prevPrice: number;
  category: string;
}

interface BasketState {
  basket: BasketItem[];
  setBasket: (basket: BasketItem[]) => void;
  clearBasket: () => void;
}

export const useBasketStore = create<BasketState>((set) => ({
  basket: [],
  setBasket: (basket) => set({ basket }),
  clearBasket: () => set({ basket: [] }),
}));

// ── 도매 손익 계산기 ─────────────────────────────────────
interface ProfitState {
  selectedItemCode: string;
  buyPriceStr:      string;
  boxCountStr:      string;
  boxKgIdx:         number;
  customBoxKgStr:   string;
  transportStr:     string;
  handlingStr:      string;
  otherCostStr:     string;
  feeRateIdx:       number;
  customFeeStr:     string;
  sellPriceStr:     string;
  setProfitField: <K extends keyof Omit<ProfitState, 'setProfitField' | 'resetProfit'>>(
    key: K, value: ProfitState[K]
  ) => void;
  resetProfit: () => void;
}

const PROFIT_DEFAULT = {
  selectedItemCode: '10001',
  buyPriceStr: '', boxCountStr: '', boxKgIdx: 1, customBoxKgStr: '',
  transportStr: '', handlingStr: '', otherCostStr: '',
  feeRateIdx: 0, customFeeStr: '', sellPriceStr: '',
};

export const useProfitStore = create<ProfitState>((set) => ({
  ...PROFIT_DEFAULT,
  setProfitField: (key, value) => set({ [key]: value } as any),
  resetProfit: () => set(PROFIT_DEFAULT),
}));
