/**
 * API Client for Django Backend
 */
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token
// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Don't add token to login/register requests
    const publicUrls = ['/auth/login/', '/auth/register/', '/auth/2fa/login-verify/'];
    const isPublicUrl = publicUrls.some(url => config.url?.includes(url));
    
    if (!isPublicUrl && typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh_token: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => apiClient.post('/auth/register/', data),
  login: (data: any) => apiClient.post('/auth/login/', data),
  logout: () => apiClient.post('/auth/logout/'),
  getCurrentUser: () => apiClient.get('/auth/me/'),
  updateProfile: (data: any) => apiClient.patch('/auth/profile/', data),
  changePassword: (data: any) => apiClient.post('/auth/change-password/', data),
  
  // 2FA
  enable2FA: () => apiClient.post('/auth/2fa/enable/'),
  verify2FA: (token: string) => apiClient.post('/auth/2fa/verify/', { token }),
  disable2FA: (password: string) => apiClient.post('/auth/2fa/disable/', { password }),
  verify2FALogin: (email: string, token: string) => 
    apiClient.post('/auth/2fa/login-verify/', { email, token }),
};

// Scans API
export const scansAPI = {
  upload: (formData: FormData) => 
    apiClient.post('/scans/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll: () => apiClient.get('/scans/'),
  getDetail: (id: number) => apiClient.get(`/scans/${id}/`),
  delete: (id: number) => apiClient.delete(`/scans/${id}/delete/`),
  getStatistics: () => apiClient.get('/scans/statistics/'),
  generateReport: (id: number) => apiClient.post(`/scans/${id}/generate-report/`),
  downloadReport: (id: number) => apiClient.get(`/scans/${id}/download-report/`, {
    responseType: 'blob',
  }),
};

export default apiClient;