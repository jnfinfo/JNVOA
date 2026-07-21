import { demoDashboard } from './demo';
import type { CreateMonitorInput, DashboardData } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Falha na API (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboard(): Promise<DashboardData> {
  try {
    return await request<DashboardData>('/api/dashboard');
  } catch (error) {
    console.warn('API indisponível; usando demonstração local.', error);
    return demoDashboard;
  }
}

export async function createMonitor(input: CreateMonitorInput): Promise<{ id: string }> {
  return request<{ id: string }>('/api/monitors', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function runMonitor(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/monitors/${id}/run`, { method: 'POST' });
}
