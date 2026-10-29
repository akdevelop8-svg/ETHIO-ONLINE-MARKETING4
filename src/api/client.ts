// ETHIO ONLINE MARKET is deployed as a same-origin Vercel frontend + serverless API.
// Always use the relative API path so stale VITE_API_BASE_URL settings cannot send
// sign-in, sign-up, or AI requests to an old / unavailable backend host.
const apiRoot = '/api';

export const buildApiUrl = (endpoint: string): string => {
  const withoutApiPrefix = endpoint.replace(/^\/?api(?=\/|$)/i, '');
  const path = withoutApiPrefix.startsWith('/')
    ? withoutApiPrefix
    : `/${withoutApiPrefix}`;
  return `${apiRoot}${path}`;
};

export const getAuthHeaders = () => {
  const token = typeof window !== 'undefined'
    ? window.localStorage?.getItem('eom_token')
    : null;

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiClient = {
  // Common JSON fetcher used by authentication, the marketplace, and Admin.
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(getAuthHeaders());
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    const res = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers
    });

    const contentType = res.headers.get('content-type') || '';
    const responseText = await res.text();
    let data: any = null;

    if (responseText && contentType.toLowerCase().includes('json')) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      const backendMessage = typeof data?.error === 'string'
        ? data.error
        : typeof data?.message === 'string'
          ? data.message
          : '';

      // Never expose deployment providers, filesystem paths, SQL details, or
      // server initialization diagnostics in customer-facing messages.
      const containsInternalDetails = /vercel|supabase|database_url|api endpoint|api initialization|failed to start|cannot find module|\\/var\\/task|runtime logs|environment variables|sql schema|internal server/i.test(backendMessage);
      const message = res.status >= 500 || containsInternalDetails
        ? 'Something went wrong. Please try again.'
        : backendMessage || (res.status === 404
          ? 'This service is currently unavailable. Please try again.'
          : 'Something went wrong. Please try again.');

      throw new Error(message);
    }

    if (!responseText) return undefined as T;
    if (data !== null) return data as T;

    // Preserve plain-text success responses instead of throwing a JSON parse error.
    try {
      return JSON.parse(responseText) as T;
    } catch {
      return responseText as unknown as T;
    }
  },

  get: <T>(endpoint: string) => apiClient.request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) => apiClient.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) => apiClient.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => apiClient.request<T>(endpoint, { method: 'DELETE' })
};
