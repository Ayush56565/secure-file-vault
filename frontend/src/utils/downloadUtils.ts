import { fileAPI } from '../services/api';
import { toast } from 'sonner';

export interface DownloadOptions {
  isPublic?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * Centralized file download utility
 * Handles both public and private file downloads with consistent error handling
 */
export const downloadFile = async (
  fileId: number, 
  filename?: string, 
  options: DownloadOptions = {}
): Promise<void> => {
  try {
    const { isPublic = false, onSuccess, onError } = options;
    
    // Use appropriate API endpoint based on file type
    const response = isPublic 
      ? await fileAPI.downloadPublicFile(fileId)
      : await fileAPI.downloadFile(fileId);
    
    // Create blob from response
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from response headers or use provided/default
    let downloadFilename = filename || 'download';
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        downloadFilename = filenameMatch[1];
      }
    }
    
    link.download = downloadFilename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    
    // Success callback
    toast.success('File downloaded successfully!');
    onSuccess?.();
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Download failed';
    toast.error(errorMessage);
    console.error('Download error:', error);
    options.onError?.(error);
  }
};

/**
 * Download file with automatic filename detection
 */
export const downloadFileWithName = async (
  fileId: number,
  options: DownloadOptions = {}
): Promise<void> => {
  return downloadFile(fileId, undefined, options);
};

/**
 * Download public file
 */
export const downloadPublicFile = async (
  fileId: number,
  filename?: string,
  options: Omit<DownloadOptions, 'isPublic'> = {}
): Promise<void> => {
  return downloadFile(fileId, filename, { ...options, isPublic: true });
};
