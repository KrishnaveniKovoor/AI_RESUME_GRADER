import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('resume_grader_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || '';
    const lowerMessage = message.toLowerCase();

    if (error.response?.status === 401) {
      localStorage.removeItem('resume_grader_user');
      localStorage.removeItem('resume_grader_token');
    }

    if (
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('quota') ||
      lowerMessage.includes('groq') ||
      lowerMessage.includes('json')
    ) {
      error.response = error.response || {};
      error.response.data = {
        ...(error.response.data || {}),
        message: 'AI service is temporarily unavailable. Please try again later.',
      };
    }

    return Promise.reject(error);
  }
);

export default api;
