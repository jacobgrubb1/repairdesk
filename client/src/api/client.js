import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Add CSRF token to non-GET requests
api.interceptors.request.use((config) => {
  if (config.method !== 'get') {
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
    if (match) {
      config.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
    }
  }
  return config;
});

// On 401, try to refresh then retry (skip for auth endpoints to avoid loops)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = original?.url || '';

    // Don't intercept auth endpoints — let them fail normally
    if (url.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return api(original);
      } catch {
        window.location.href = window.location.pathname.startsWith('/platform') ? '/platform/login' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
