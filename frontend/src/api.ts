import { AnalyzeRequest, AnalyzeResponse, DashboardStats } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function analyzeContent(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(error.detail || 'Analysis failed');
  }

  return response.json();
}

export async function getStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE}/stats`);

  if (!response.ok) {
    return {
      checksToday: 0,
      highRiskPercentage: 0,
      estimatedFinesAvoided: 0,
    };
  }

  return response.json();
}
