// ===== 사용자 타입 =====
export type UserType = 'CONSUMER' | 'FARMER' | 'BUYER';
export type PlanType = 'FREE' | 'PREMIUM' | 'BUSINESS' | 'ENTERPRISE';

export interface User {
  id: number;
  uid: string;
  email: string | null;
  nickname: string | null;
  userType: UserType;
  fcmToken: string | null;
  isPremium: boolean;
  plan: PlanType;
  createdAt: string;
}

// ===== 품목 타입 =====
export interface Item {
  id: number;
  categoryCode: string;
  categoryName: string;
  itemCode: string;
  itemName: string;
  kindCode: string | null;
  kindName: string | null;
  unitQty: number | null;
  unitName: string | null;
}

export interface ItemWithPrice extends Item {
  latestPrice: AuctionPrice | null;
  todayChange: number | null; // 전일 대비 등락률 (%)
}

// ===== 도매시장 타입 =====
export interface Market {
  id: number;
  code: string;
  name: string;
  region: string | null;
}

// ===== 경락가격 타입 =====
export interface AuctionPrice {
  id: number;
  marketId: number;
  marketName: string;
  itemId: number;
  itemName: string;
  gradeCode: string;
  saleDate: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  totalQty: number;
}

export interface DailyPrice {
  date: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  totalQty: number;
}

export interface YearlyAverage {
  year: number;
  avgPrice: number;
}

// ===== 조사가격 타입 =====
export type PriceType = 'ORIGIN' | 'WHOLESALE' | 'RETAIL';

export interface SurveyPriceResult {
  origin: number | null;
  wholesale: number | null;
  retail: number | null;
  marginRate: number | null; // 유통마진율 (%)
}

// ===== 알림 타입 =====
export type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'CHANGE_RATE' | 'VS_AVERAGE';

export interface Alert {
  id: number;
  itemId: number;
  itemName: string;
  marketId: number | null;
  alertType: AlertType;
  thresholdValue: number;
  isActive: boolean;
  lastFiredAt: string | null;
  createdAt: string;
}

export interface AlertConfig {
  itemId: number;
  marketId: number | null;
  alertType: AlertType;
  thresholdValue: number;
}

// ===== 관심 품목 타입 =====
export interface UserItem {
  id: number;
  itemId: number;
  itemName: string;
  categoryCode: string;
  marketId: number | null;
  marketName: string | null;
  gradeCode: string | null;
  sortOrder: number;
}

// ===== AI 추천 타입 =====
export type RecommendationType = 'SELL_NOW' | 'SELL_SOON' | 'HOLD';

export interface AIRecommendation {
  itemCode: string;
  targetDate: string;
  recommendation: RecommendationType;
  score: number;
  expectedPrice: number;
  reasoning: string;
}

// ===== 카드 Props 타입 =====
export interface ItemPriceCardProps {
  itemName: string;
  gradeName: string;
  marketName: string;
  avgPrice: number;
  changeRate: number;       // 전일 대비 등락률 (%)
  vsAverageRate: number;    // 평년 대비 등락률 (%)
  updatedAt: string;
}

// ===== 커뮤니티 타입 =====
export interface CommunityPost {
  id:           string;
  title:        string;
  content:      string;
  itemCode:     string | null;
  authorName:   string;
  isAnonymous:  boolean;
  isMyPost:     boolean;
  likeCount:    number;
  viewCount:    number;
  commentCount: number;
  thumbnail:    string | null;
  images:       string[];
  liked?:       boolean;
  createdAt:    string;
  updatedAt:    string;
}

export interface CommunityComment {
  id:          string;
  content:     string;
  authorName:  string;
  isAnonymous: boolean;
  isBlinded:   boolean;
  createdAt:   string;
}

// ===== API 응답 래퍼 =====
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
