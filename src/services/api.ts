import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/constants';

// Firebase Auth 토큰을 가져오는 함수 (firebase/auth에서 import)
let getIdToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  getIdToken = fn;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: JWT 자동 첨부
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (getIdToken) {
    const token = await getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 응답 인터셉터: 에러 핸들링
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 → 로그아웃 처리 (store에서 처리)
      console.warn('[API] 인증 만료');
    }
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      if (errorData?.error === 'PLAN_REQUIRED') {
        console.warn(`[API] 플랜 업그레이드 필요: ${errorData.requiredPlan}`);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
