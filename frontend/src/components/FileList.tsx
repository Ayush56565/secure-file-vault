import React, { useState } from 'react';
import { Download, Trash2, Eye, Calendar, User, HardDrive, Copy, Users, FileText, Clock, Share2 } from 'lucide-react';
import { File as FileType } from '../types';
import { format } from 'date-fns';
import FilePreview from './FilePreview';
import FileSharing from './FileSharing';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';

interface FileListProps {
  files: FileType[];                                                                                                                                                                                                                          
  onDownload: (fileId: number) => void;
  onDelete: (fileId: number) => void;                                                             
  onPreview?: (file: FileType) => void;
  onShare?: (fileId: number, isPublic: boolean, sharedUsers: string[]) => void;
  currentUserId: number;
}

const FileList: React.FC<FileListProps> = ({ files, onDownload, onDelete, onPreview, onShare, currentUserId }) => {
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);
  const [sharingFile, setSharingFile] = useState<FileType | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('json')) return '📋';
    return '📁';
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'bg-green-100 text-green-800';
    if (mimeType === 'application/pdf') return 'bg-red-100 text-red-800';
    if (mimeType.startsWith('text/')) return 'bg-blue-100 text-blue-800';
    if (mimeType.includes('zip')) return 'bg-purple-100 text-purple-800';
    if (mimeType.includes('json')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Public link copied to clipboard!');
  };

  const getPublicUrl = (fileId: number) => {
    return `${window.location.origin}/files/${fileId}`;
  };

  const canPreview = (mimeType: string) => {
    return mimeType?.startsWith('image/') || mimeType === 'application/pdf';
  };

  return (
    <div className="space-y-4">
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
      
      {files.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-8xl mb-6">📁</div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">Upload some files to get started</p>
            <div className="text-sm text-muted-foreground">
              Drag and drop files or click the upload button above
            </div>
          </CardContent>
        </Card>
      ) : (
        files.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">
                      {getFileIcon(file.mime_type || '')}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold truncate">{file.original_name}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                          </Badge>
                          {file.is_public && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
                              <Eye size={12} className="mr-1" />
                              PUBLIC
                            </Badge>
                          )}
                          {file.is_duplicate && (
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-800">
                              <Users size={12} className="mr-1" />
                              DEDUPED
                            </Badge>
                          )}
                        </div>
                      </div>
              
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <HardDrive size={16} className="text-primary" />
                            <span className="font-medium">{formatFileSize(file.file_size || 0)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar size={16} className="text-green-600" />
                            <span>{format(new Date(file.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User size={16} className="text-purple-600" />
                            <span>{file.username}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {file.download_count > 0 && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <Download size={16} />
                              <span className="font-medium">{file.download_count} downloads</span>
                            </div>
                          )}
                          
                          {file.reference_count && file.reference_count > 1 && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <Users size={16} />
                              <span className="font-medium">{file.reference_count} references</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock size={16} />
                            <span>Updated {format(new Date(file.updated_at), 'MMM dd, HH:mm')}</span>
                          </div>
                        </div>
                      </div>
              
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {file.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {file.folder_name && (
                        <div className="mb-4">
                          <Badge variant="outline" className="text-xs">
                            📁 {file.folder_name}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {canPreview(file.mime_type || '') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreview ? onPreview(file) : setPreviewFile(file)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye size={16} />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(file.id)}
                        className="h-8 w-8 p-0"
                        data-testid={`download-${file.id}`}
                      >
                        <Download size={16} />
                      </Button>
                      
                      {file.is_public && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getPublicUrl(file.id))}
                          className="h-8 w-8 p-0"
                        >
                          <Copy size={16} />
                        </Button>
                      )}
                      
                      {file.user_id === currentUserId && onShare && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSharingFile(file)}
                          className="h-8 w-8 p-0"
                          data-testid={`share-${file.id}`}
                        >
                          <Share2 size={16} />
                        </Button>
                      )}
                      
                      {file.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(file.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          data-testid={`delete-${file.id}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {sharingFile && onShare && (
        <FileSharing
          file={sharingFile}
          onClose={() => setSharingFile(null)}
          onShare={onShare}
        />
      )}
    </div>
  );
};

export default FileList;
