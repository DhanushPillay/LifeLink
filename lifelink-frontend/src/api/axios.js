import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://blood-and-organ-donar-matching-system.onrender.com');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

let csrfToken = null;

export const fetchCsrfToken = async () => {
  try {
    const { data } = await axios.get(`${API_URL}/api/csrf-token`, {
      withCredentials: true,
    });
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

api.interceptors.request.use((config) => {
  const unsafeMethods = ['post', 'put', 'patch', 'delete'];
  if (config.method && unsafeMethods.includes(config.method.toLowerCase()) && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 403 && error.response?.data?.code === 'invalid_csrf_token') {
      await fetchCsrfToken();
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
