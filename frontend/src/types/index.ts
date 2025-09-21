export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  storage_quota_mb: number;
  used_storage_mb?: number;
  created_at: string;
}

export interface File {
  id: number;
  user_id: number;
  hash_id: number;
  original_name: string;
  display_name: string;
  folder_id?: number;
  is_public: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  hash_sha256?: string;
  file_size?: number;
  mime_type?: string;
  username?: string;
  folder_name?: string;
  tags?: string[];
  reference_count?: number;
  is_duplicate?: boolean;
}

export interface Folder {
  id: number;
  user_id: number;
  name: string;
  parent_id?: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  file_count?: number;
  folder_size?: number;
  subfolder_count?: number;
}

export interface FolderCreateRequest {
  name: string;
  parent_id?: number;
  is_public: boolean;
}

export interface FolderUpdateRequest {
  name?: string;
  parent_id?: number;
  is_public?: boolean;
}

export interface FolderStats {
  total_folders: number;
  public_folders: number;
  private_folders: number;
  total_files_in_folders: number;
}

export interface StorageStats {
  total_storage_bytes: number;
  original_storage_bytes: number;
  savings_bytes: number;
  savings_percentage: number;
  file_count: number;
  unique_file_count: number;
  deduplication_ratio: number;
  total_files?: number;
  used_storage_mb?: number;
  storage_quota_mb?: number;
}

export interface FileSearchRequest {
  search?: string;
  mime_type?: string;
  min_size?: string;
  max_size?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  uploader?: string;
  page?: number;
  limit?: number;
  folder_id?: number | null;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FileUploadRequest {
  folder_id?: number;
  is_public: boolean;
  tags: string[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}
