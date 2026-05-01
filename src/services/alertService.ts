import api from './api';
import type { Alert, AlertConfig } from '@/types';

export async function getAlerts(): Promise<Alert[]> {
  const { data } = await api.get('/users/me/alerts');
  return data;
}

export async function createAlert(config: AlertConfig): Promise<Alert> {
  const { data } = await api.post('/users/me/alerts', config);
  return data;
}

export async function updateAlert(id: number, isActive: boolean): Promise<Alert> {
  const { data } = await api.patch(`/users/me/alerts/${id}`, { isActive });
  return data;
}

export async function deleteAlert(id: number): Promise<void> {
  await api.delete(`/users/me/alerts/${id}`);
}
