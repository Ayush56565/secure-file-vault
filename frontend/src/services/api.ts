import axios, { AxiosResponse } from 'axios';
import { User, File, StorageStats, FileSearchRequest, FileUploadRequest, AuthResponse, Folder, FolderCreateRequest, FolderUpdateRequest, FolderStats } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const api = axios.create({
  baseURL: API_BASE_URL,
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

// Handle auth errors - only redirect on actual auth failures, not network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if it's a 401 and not a network error
    if (error.response?.status === 401 && error.code !== 'NETWORK_ERROR') {
      // Clear storage but don't redirect immediately - let the component handle it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username: string, email: string, password: string): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/api/auth/register', { username, email, password }),

  login: (username: string, password: string): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/api/auth/login', { username, password }),

  getProfile: (): Promise<AxiosResponse<User>> =>
    api.get('/api/auth/profile'),

  getStats: (): Promise<AxiosResponse<StorageStats>> =>
    api.get('/api/auth/stats'),

  validateSession: (): Promise<AxiosResponse<{ valid: boolean; user: User }>> =>
    api.get('/api/auth/validate'),

  getAllUsers: (): Promise<AxiosResponse<User[]>> =>
    api.get('/api/admin/users'),

  updateQuota: (userId: number, quotaMB: number): Promise<AxiosResponse<{ message: string }>> =>
    api.put('/api/admin/users/quota', { user_id: userId, quota_mb: quotaMB }),
};

export const fileAPI = {
  uploadFiles: (files: FileList, uploadRequest: FileUploadRequest): Promise<AxiosResponse<{ message: string; files: File[] }>> => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    formData.append('is_public', uploadRequest.is_public.toString());
    formData.append('folder_id', uploadRequest.folder_id?.toString() || '');
    uploadRequest.tags.forEach((tag) => {
      formData.append('tags', tag);
    });

    return api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getFiles: (searchRequest: FileSearchRequest = {}): Promise<AxiosResponse<{ files: File[]; total: number; page: number; limit: number }>> => {
    const params = new URLSearchParams();
    Object.entries(searchRequest).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, item.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    console.log('API getFiles called with searchRequest:', searchRequest);
    console.log('API getFiles called with params:', params.toString());
    return api.get(`/api/files?${params.toString()}`);
  },

  getFile: (fileId: number): Promise<AxiosResponse<File>> =>
    api.get(`/api/files/${fileId}`),

  deleteFile: (fileId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/api/files/${fileId}`),

  downloadFile: (fileId: number): Promise<AxiosResponse<Blob>> =>
    api.get(`/api/files/${fileId}/download`, { responseType: 'blob' }),

  getFileStats: (): Promise<AxiosResponse<{ total_files: number; total_downloads: number; total_size_bytes: number; files: File[] }>> =>
    api.get('/api/admin/files/stats'),

  getStorageStats: (): Promise<AxiosResponse<any>> =>
    api.get('/api/files/storage/stats'),

  getDeduplicationStats: (): Promise<AxiosResponse<any>> =>
    api.get('/api/files/storage/deduplication'),

  shareFile: (fileId: number, isPublic: boolean, sharedUsers: string[]): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/api/files/${fileId}/share`, { is_public: isPublic, shared_users: sharedUsers }),
  
  getPublicFiles: (searchRequest: FileSearchRequest): Promise<AxiosResponse<{ files: File[]; total: number }>> =>
    api.get('/api/files/public', { params: searchRequest }),
  
  downloadPublicFile: (fileId: number): Promise<AxiosResponse<Blob>> =>
    api.get(`/api/files/public/${fileId}/download`, { responseType: 'blob' }),
};

export const folderAPI = {
  getFolders: (searchRequest?: any): Promise<AxiosResponse<{ folders: Folder[]; total: number }>> =>
    api.get('/api/folders', { params: searchRequest }),

  getFolder: (folderId: number): Promise<AxiosResponse<Folder>> =>
    api.get(`/api/folders/${folderId}`),

  createFolder: (folderData: FolderCreateRequest): Promise<AxiosResponse<{ message: string; folder: Folder }>> =>
    api.post('/api/folders', folderData),

  updateFolder: (folderId: number, folderData: FolderUpdateRequest): Promise<AxiosResponse<{ message: string; folder: Folder }>> =>
    api.put(`/api/folders/${folderId}`, folderData),

  deleteFolder: (folderId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/api/folders/${folderId}`),

  getFolderStats: (): Promise<AxiosResponse<FolderStats>> =>
    api.get('/api/folders/stats'),

  shareFolder: (folderId: number, username: string, permission: string, isPublic: boolean): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/api/folders/${folderId}/share`, { username, permission, is_public: isPublic }),
};

export const adminAPI = {
  getAllFiles: (params: any): Promise<AxiosResponse<{ files: File[]; total: number; page: number; limit: number }>> =>
    api.get('/api/admin/files', { params }),

  getFileDetails: (fileId: number): Promise<AxiosResponse<{ file: File }>> =>
    api.get(`/api/admin/files/${fileId}`),

  deleteFile: (fileId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/api/admin/files/${fileId}`),

  shareFileWithUser: (fileId: number, username: string, permission: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/api/admin/files/${fileId}/share`, { username, permission }),

  getFileShares: (fileId: number): Promise<AxiosResponse<{ shares: any[] }>> =>
    api.get(`/api/admin/files/${fileId}/shares`),

  getSystemStats: (): Promise<AxiosResponse<{ stats: any }>> =>
    api.get('/api/admin/stats'),

  getUserStats: (): Promise<AxiosResponse<{ users: any[] }>> =>
    api.get('/api/admin/users/stats'),

  getTopFiles: (params: any): Promise<AxiosResponse<{ files: File[] }>> =>
    api.get('/api/admin/files/top', { params }),

  getRecentActivity: (params: any): Promise<AxiosResponse<{ activity: any[] }>> =>
    api.get('/api/admin/activity', { params }),
};

export default api;