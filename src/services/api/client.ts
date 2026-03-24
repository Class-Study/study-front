import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && token.trim() !== '') {
    config.headers['X-Access-Token'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginEndpoint) {
      // Preserva preferências (tema) ao limpar a sessão por token expirado
      const theme = localStorage.getItem('eduspace-theme');
      localStorage.clear();
      if (theme) localStorage.setItem('eduspace-theme', theme);
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
