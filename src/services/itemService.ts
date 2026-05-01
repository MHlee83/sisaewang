import api from './api';
import type { Item, ItemWithPrice, UserItem, PaginatedResponse } from '@/types';

// ===== 품목 목록 =====

export async function getItems(params: {
  categoryCode?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Item>> {
  const { data } = await api.get('/items', { params });
  return data;
}

export async function getItemDetail(itemCode: string): Promise<{
  item: Item;
  latestPrices: Record<string, number>;
  todayChange: number;
}> {
  const { data } = await api.get(`/items/${itemCode}`);
  return data;
}

// ===== 관심 품목 =====

export async function getUserItems(): Promise<UserItem[]> {
  const { data } = await api.get('/users/me/items');
  return data;
}

export async function addUserItem(params: {
  itemCode: string;
  marketCode?: string;
  gradeCode?: string;
}): Promise<UserItem> {
  const { data } = await api.post('/users/me/items', params);
  return data;
}

export async function removeUserItem(id: number): Promise<void> {
  await api.delete(`/users/me/items/${id}`);
}

export async function reorderUserItems(
  orders: Array<{ id: number; sortOrder: number }>
): Promise<void> {
  await api.patch('/users/me/items/reorder', { orders });
}
