export const getAuthHeaders = () => {
  const token = localStorage.getItem('eom_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiClient = {
  // Common generic fetcher
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers: { ...getAuthHeaders(), ...options.headers }
    });
    
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      throw new Error(data?.error || `API Error: ${res.status} ${res.statusText}`);
    }
    return data;
  },

  get: <T>(endpoint: string) => apiClient.request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) => apiClient.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any) => apiClient.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => apiClient.request<T>(endpoint, { method: 'DELETE' })
};
