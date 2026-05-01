import api from './api';
import type { AIRecommendation } from '@/types';

export async function getRecommendation(
  itemCode: string,
  targetDate?: string
): Promise<AIRecommendation> {
  const { data } = await api.get(`/recommendations/${itemCode}`, {
    params: targetDate ? { targetDate } : undefined,
  });
  return data;
}
