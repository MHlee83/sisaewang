/**
 * 실제 백엔드 API 클라이언트
 * EXPO_PUBLIC_API_URL 환경변수가 없으면 mock 데이터로 폴백
 */
import axios from 'axios';
import { auth } from '@/utils/firebase';
import { MOCK_PRICES } from './mockData';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TIMEOUT  = 8000;

const api = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });

// ── Firebase 토큰 자동 첨부 (auth 사용 가능할 때만) ────────────────
api.interceptors.request.use(async (config) => {
  try {
    const user = auth?.currentUser;
    if (user && typeof user.getIdToken === 'function') {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // auth 미초기화 시 무시
  }
  return config;
});

// ── 타입 ───────────────────────────────────────────────────────
export interface PriceItem {
  itemCode:   string;
  itemName:   string;
  category:   string;
  avgPrice:   number;
  prevPrice:  number;
  avgYearPrice: number;
  gradeCode:  string;
  totalQty:   number;
  thumbnail:  string;
}

// ── 실제 API → mock 변환 ───────────────────────────────────────
function apiItemToPrice(item: Record<string, unknown>): PriceItem {
  const mock = MOCK_PRICES.find((p) => p.itemCode === String(item.itemCode));
  return {
    itemCode:     String(item.itemCode),
    itemName:     String(item.itemName ?? ''),
    category:     String(item.categoryCode ?? ''),
    avgPrice:     Number(item.avgPrice ?? 0),
    prevPrice:    Number(item.prevPrice ?? 0),
    avgYearPrice: Number(item.avgYearPrice ?? 0),
    gradeCode:    String(item.gradeCode ?? '상'),
    totalQty:     Number(item.totalQty ?? 0),
    thumbnail:    mock?.thumbnail ?? '',
  };
}

// ── 가격 목록 조회 (조사가격 우선, 경락가격 폴백) ─────────────
export async function fetchPrices(params?: {
  category?: string;
  marketCode?: string;
  date?: string;
}): Promise<PriceItem[]> {
  if (!BASE_URL) return MOCK_PRICES; // mock fallback

  try {
    // 조사가격 전체 목록 우선 사용 (경락가격 승인 전까지)
    const res = await api.get('/prices/survey/list');
    const apiItems: Record<string, unknown>[] = res.data?.items ?? [];

    // 카테고리 필터
    const filtered = params?.category
      ? apiItems.filter((item) => item.categoryCode === params.category)
      : apiItems;

    if (filtered.length === 0) return MOCK_PRICES;

    return filtered.map((item) => {
      const mock = MOCK_PRICES.find((p) => p.itemCode === String(item.itemCode));
      return {
        itemCode:     String(item.itemCode),
        itemName:     String(item.itemName ?? ''),
        category:     String(item.categoryCode ?? ''),
        avgPrice:     Number(item.retail ?? item.wholesale ?? item.avgPrice ?? 0),
        prevPrice:    Number(item.avgPrice ?? 0), // 전일 데이터 없으면 동일값
        avgYearPrice: 0,
        gradeCode:    '상',
        totalQty:     0,
        thumbnail:    mock?.thumbnail ?? '',
      };
    });
  } catch {
    console.warn('[apiService] fetchPrices 실패 → mock 사용');
    return MOCK_PRICES;
  }
}

// ── 품목 가격 히스토리 ─────────────────────────────────────────
export async function fetchPriceHistory(
  itemCode: string,
  days = 30
): Promise<{ date: string; price: number }[]> {
  if (!BASE_URL) {
    const base = MOCK_PRICES.find((p) => p.itemCode === itemCode)?.avgPrice ?? 1000;
    return Array.from({ length: days }, (_, i) => ({
      date:  new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
      price: Math.round(base * (0.85 + Math.random() * 0.3)),
    }));
  }

  try {
    const res = await api.get(`/prices/auction/${itemCode}/history`, { params: { days } });
    return (res.data?.history ?? []).map((h: Record<string, unknown>) => ({
      date:  String(h.date),
      price: Number(h.avgPrice),
    }));
  } catch {
    console.warn('[apiService] fetchPriceHistory 실패 → mock 사용');
    const base = MOCK_PRICES.find((p) => p.itemCode === itemCode)?.avgPrice ?? 1000;
    return Array.from({ length: days }, (_, i) => ({
      date:  new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
      price: Math.round(base * (0.85 + Math.random() * 0.3)),
    }));
  }
}

// ── 조사가격 (소매/도매/산지) ──────────────────────────────────
export async function fetchSurveyPrice(itemCode: string): Promise<{
  origin: number | null;
  wholesale: number | null;
  retail: number | null;
}> {
  if (!BASE_URL) {
    const mock = MOCK_PRICES.find((p) => p.itemCode === itemCode);
    return { origin: null, wholesale: mock?.avgPrice ?? null, retail: null };
  }

  try {
    const res = await api.get('/prices/survey', { params: { itemCode } });
    return res.data;
  } catch {
    const mock = MOCK_PRICES.find((p) => p.itemCode === itemCode);
    return { origin: null, wholesale: mock?.avgPrice ?? null, retail: null };
  }
}

// ── 내 즐겨찾기 품목 ───────────────────────────────────────────
export async function fetchMyItems(): Promise<any[]> {
  if (!BASE_URL || !auth.currentUser) return [];
  try {
    const res = await api.get('/users/me/items');
    return res.data ?? [];
  } catch {
    return [];
  }
}

// ── 즐겨찾기 추가 ─────────────────────────────────────────────
export async function addMyItem(itemCode: string, marketCode?: string): Promise<void> {
  if (!BASE_URL || !auth.currentUser) return;
  await api.post('/users/me/items', { itemCode, marketCode });
}

// ── 즐겨찾기 삭제 ─────────────────────────────────────────────
export async function removeMyItem(id: string): Promise<void> {
  if (!BASE_URL || !auth.currentUser) return;
  await api.delete(`/users/me/items/${id}`);
}

// ── 내 정보 조회 ───────────────────────────────────────────────
export async function fetchMe(): Promise<any | null> {
  if (!BASE_URL || !auth.currentUser) return null;
  try {
    const res = await api.get('/users/me');
    return res.data;
  } catch {
    return null;
  }
}

// ── userType 업데이트 ──────────────────────────────────────────
export async function updateUserType(userType: string): Promise<void> {
  if (!BASE_URL || !auth.currentUser) return;
  await api.patch('/users/me', { userType });
}

// ── 경매가격 조회 ───────────────────────────────────────────────
export interface AuctionItem {
  id:           string;
  marketName:   string;
  marketRegion: string;
  itemCode:     string;
  itemName:     string;
  gradeCode:    string;
  saleDate:     string;
  avgPrice:     number;
  maxPrice:     number;
  minPrice:     number;
  totalQty:     number;
}

export async function fetchAuctionPrices(params?: {
  date?: string;
  limit?: number;
}): Promise<AuctionItem[]> {
  if (!BASE_URL) return [];
  try {
    const today = params?.date ?? new Date().toISOString().slice(0, 10);
    const res = await api.get('/prices/auction', {
      params: { date: today, limit: params?.limit ?? 100 },
    });
    return res.data?.items ?? [];
  } catch {
    console.warn('[apiService] fetchAuctionPrices 실패');
    return [];
  }
}
