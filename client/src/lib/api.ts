import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API methods
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),
};

export const crawlApi = {
  start: (data: {
    startUrl: string;
    maxDepth?: number;
    delay?: number;
    followExternal?: boolean;
    jsRendering?: boolean;
    maxUrls?: number;
  }) => api.post('/crawl/start', data),
  getStatus: (crawlId: string) => api.get(`/crawl/${crawlId}`),
  stop: (crawlId: string) => api.post(`/crawl/${crawlId}/stop`),
  getPages: (crawlId: string, page = 1, limit = 50) =>
    api.get(`/crawl/${crawlId}/pages`, { params: { page, limit } }),
  getLinks: (crawlId: string, page = 1, limit = 50) =>
    api.get(`/crawl/${crawlId}/links`, { params: { page, limit } }),
  getIssues: (crawlId: string, severity?: string, page = 1, limit = 50) =>
    api.get(`/crawl/${crawlId}/issues`, { params: { severity, page, limit } }),
};

export const userApi = {
  getSettings: () => api.get('/user/settings'),
  updateSettings: (data: any) => api.put('/user/settings', data),
  getCrawls: (page = 1, limit = 20) =>
    api.get('/user/crawls', { params: { page, limit } }),
};

export const exportApi = {
  exportPages: (crawlId: string, format: 'csv' | 'json' | 'xml') =>
    api.get(`/export/${crawlId}/pages/${format}`, { responseType: 'blob' }),
  exportLinks: (crawlId: string) =>
    api.get(`/export/${crawlId}/links/csv`, { responseType: 'blob' }),
  exportIssues: (crawlId: string) =>
    api.get(`/export/${crawlId}/issues/csv`, { responseType: 'blob' }),
};
