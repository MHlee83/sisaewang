/**
 * 실제 백엔드 API 클라이언트
 * EXPO_PUBLIC_API_URL 환경변수가 없으면 mock 데이터로 폴백
 */
import axios from 'axios';
import { MOCK_PRICES } from './mockData';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TIMEOUT  = 8000;

const api = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });

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

// ── 경락가격 목록 조회 ─────────────────────────────────────────
export async function fetchPrices(params?: {
  category?: string;
  marketCode?: string;
  date?: string;
}): Promise<PriceItem[]> {
  if (!BASE_URL) return MOCK_PRICES; // mock fallback

  try {
    const res = await api.get('/api/v1/prices/auction', { params });
    return (res.data?.items ?? []).map(apiItemToPrice);
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
    // mock: 30일치 랜덤 데이터
    const base = MOCK_PRICES.find((p) => p.itemCode === itemCode)?.avgPrice ?? 1000;
    return Array.from({ length: days }, (_, i) => ({
      date:  new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10),
      price: Math.round(base * (0.85 + Math.random() * 0.3)),
    }));
  }

  try {
    const res = await api.get(`/api/v1/prices/auction/${itemCode}/history`, {
      params: { days },
    });
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
    const res = await api.get('/api/v1/prices/survey', { params: { itemCode } });
    return res.data;
  } catch {
    const mock = MOCK_PRICES.find((p) => p.itemCode === itemCode);
    return { origin: null, wholesale: mock?.avgPrice ?? null, retail: null };
  }
}
