import api from './axiosConfig';

export const uploadResumeFile = (formData) => api.post('/analysis/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const submitAnalysis = (payload) => api.post('/analysis/analyze', payload);
export const rewriteResume = (payload) => api.post('/analysis/rewrite-resume', payload);
export const generateInterviewQuestions = (payload) => api.post('/analysis/interview-questions', payload);
export const fetchHistory = () => api.get('/analysis/history');
export const removeAnalysis = (id) => api.delete(`/analysis/${id}`);
