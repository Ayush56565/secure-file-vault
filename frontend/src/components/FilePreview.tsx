import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image, File, Video, Music, Archive, Eye, EyeOff } from 'lucide-react';
import { fileAPI } from '../services/api';
import { downloadFile } from '../utils/downloadUtils';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface FilePreviewProps {
  file: {
    id: number;
    original_name: string;
    mime_type?: string;
    file_size?: number;
    is_public: boolean;
  };
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For images and PDFs, create a preview URL
        if (file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf') {
          const response = await fileAPI.downloadFile(file.id);
          const blob = new Blob([response.data], { type: file.mime_type });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        } else {
          // For other file types, we'll show a placeholder
          setPreviewUrl(null);
        }
      } catch (err: any) {
        setError('Failed to load preview');
        console.error('Preview error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();

    // Cleanup
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file.id, file.mime_type, previewUrl]);

  const getFileIcon = () => {
    if (file.mime_type?.startsWith('image/')) return <Image size={48} className="text-blue-500" />;
    if (file.mime_type === 'application/pdf') return <FileText size={48} className="text-red-500" />;
    if (file.mime_type?.startsWith('video/')) return <Video size={48} className="text-purple-500" />;
    if (file.mime_type?.startsWith('audio/')) return <Music size={48} className="text-green-500" />;
    if (file.mime_type?.includes('zip') || file.mime_type?.includes('archive')) return <Archive size={48} className="text-orange-500" />;
    return <File size={48} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    await downloadFile(file.id, file.original_name);
  };

  const canPreview = file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf';
  const isImage = file.mime_type?.startsWith('image/');
  const isPdf = file.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl max-h-[95vh] w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              {getFileIcon()}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 truncate max-w-md">
                {file.original_name}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {file.mime_type || 'Unknown type'}
                </Badge>
                <span className="text-sm text-gray-500">
                  {file.file_size ? formatFileSize(file.file_size) : 'Unknown size'}
                </span>
                {file.is_public && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Public
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            )}
            <Button
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(95vh-120px)]">
          {/* File Info Sidebar */}
          <div className="w-80 border-r bg-gray-50/30 p-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">File Name</label>
                  <p className="text-sm text-gray-900 break-all">{file.original_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">File Type</label>
                  <p className="text-sm text-gray-900">{file.mime_type || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">File Size</label>
                  <p className="text-sm text-gray-900">
                    {file.file_size ? formatFileSize(file.file_size) : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Visibility</label>
                  <Badge variant={file.is_public ? "default" : "secondary"}>
                    {file.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
                {canPreview && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Preview</label>
                    <p className="text-sm text-gray-900">
                      {isImage ? 'Image preview available' : 'PDF preview available'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Loading preview...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-red-50 rounded-full mb-4">
                  <File size={48} className="text-red-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Preview Error
                </h4>
                <p className="text-gray-600 mb-6 max-w-md">
                  {error}
                </p>
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download size={16} />
                  Download File
                </Button>
              </div>
            )}

            {!isLoading && !error && showPreview && previewUrl && (
              <div className="h-full flex items-center justify-center">
                {isImage ? (
                  <img
                    src={previewUrl}
                    alt={file.original_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    onError={() => setError('Failed to load image')}
                  />
                ) : isPdf ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0 rounded-lg shadow-lg"
                    title={file.original_name}
                    onError={() => setError('Failed to load PDF')}
                  />
                ) : null}
              </div>
            )}

            {!isLoading && !error && (!showPreview || !previewUrl) && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-6 bg-gray-100 rounded-full mb-6">
                  {getFileIcon()}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  {canPreview ? 'Preview Hidden' : 'Preview Not Available'}
                </h4>
                <p className="text-gray-600 mb-6 max-w-md">
                  {canPreview 
                    ? 'Click "Show Preview" to view the file content'
                    : 'This file type cannot be previewed in the browser'
                  }
                </p>
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download size={16} />
                  Download File
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
