class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.set(k, v));
      url += `?${sp.toString()}`;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error?.code || 'UNKNOWN', body.error?.message || res.statusText);
    }
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new ApiError(res.status, errorBody.error?.code || 'UNKNOWN', errorBody.error?.message || res.statusText);
    }
    return res.json();
  }
}

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient('/api');
