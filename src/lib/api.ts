import { demoDashboard } from './demo';
import type { CreateMonitorInput, DashboardData, ManualSearchInput, ManualSearchResult } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(payload.message ?? payload.error ?? `Falha na API (${response.status})`);
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

export async function manualSearch(input: ManualSearchInput): Promise<ManualSearchResult> {
  return request<ManualSearchResult>('/api/search/manual', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function runMonitor(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/monitors/${id}/run`, { method: 'POST' });
}
