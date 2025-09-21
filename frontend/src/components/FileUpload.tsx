import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery } from 'react-query';
import { X, Tag, Folder as FolderIcon, Eye, EyeOff, AlertCircle, CheckCircle, Upload, FileText, Image, Archive } from 'lucide-react';
import { FileUploadRequest, Folder } from '../types';
import { folderAPI } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

interface FileUploadProps {
  onUpload: (files: FileList, uploadRequest: FileUploadRequest) => void;
  isUploading: boolean;
  selectedFolderId?: number | null;
  onUploadComplete?: () => void;
}

interface FilePreview {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isUploading, selectedFolderId, onUploadComplete }) => {
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [folderId, setFolderId] = useState<number | undefined>(selectedFolderId || undefined);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Fetch folders for dropdown
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folderAPI.getFolders(),
    retry: 1,
    onError: (error) => {
      console.error('Failed to fetch folders:', error);
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Create file previews
    const previews: FilePreview[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }));
    
    setFilePreviews(previews);
    setPendingFiles(acceptedFiles);
    // Don't show confirmation dialog immediately
  }, []);

  const handleConfirmUpload = () => {
    const fileList = new DataTransfer();
    pendingFiles.forEach(file => fileList.items.add(file));
    
    const uploadRequest: FileUploadRequest = {
      is_public: isPublic,
      tags: tags,
      folder_id: folderId,
    };
    
    // Update file previews to show uploading status
    setFilePreviews(prev => prev.map(preview => ({
      ...preview,
      status: 'uploading' as const,
      progress: 0,
    })));
    
    onUpload(fileList.files, uploadRequest);
    setShowConfirmation(false);
    setPendingFiles([]);
  };

  const handleCancelUpload = () => {
    setFilePreviews([]);
    setPendingFiles([]);
    setShowConfirmation(false);
  };

  const handleUploadClick = () => {
    if (pendingFiles.length === 0) {
      return;
    }
    setShowConfirmation(true);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    maxFiles: 10,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.csv'],
      'application/json': ['.json'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (file.type === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    if (file.type.startsWith('text/')) return <FileText className="w-5 h-5 text-green-500" />;
    if (file.type.includes('zip')) return <Archive className="w-5 h-5 text-orange-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const clearPreviews = () => {
    setFilePreviews([]);
    setPendingFiles([]);
  };

  // Handle upload completion
  useEffect(() => {
    if (!isUploading && filePreviews.length > 0 && filePreviews.every(preview => preview.status === 'uploading')) {
      // Upload completed successfully
      setFilePreviews(prev => prev.map(preview => ({
        ...preview,
        status: 'success' as const,
        progress: 100,
      })));
      
      // Clear previews after a short delay
      setTimeout(() => {
        setFilePreviews([]);
        setPendingFiles([]);
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 2000);
    }
  }, [isUploading, filePreviews, onUploadComplete]);

  return (
    <Card className="fade-in">
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>
          Max 10 files, 100MB each
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl font-semibold mb-2 text-gray-700">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-gray-500 mb-4">
            or click to select files
          </p>
          <div className="text-sm text-gray-400">
            Supports: Images, PDFs, Text files, JSON, ZIP
          </div>
        </div>

        {/* File Previews */}
        {filePreviews.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-700">Selected Files</h4>
              <Button
                onClick={clearPreviews}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2">
              {filePreviews.map((preview) => (
                <div key={preview.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    {getFileIcon(preview.file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{preview.file.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(preview.file.size)} • {preview.file.type || 'Unknown type'}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {preview.status === 'pending' && (
                      <Badge variant="secondary">Ready</Badge>
                    )}
                    {preview.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-600">Uploading...</span>
                      </div>
                    )}
                    {preview.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {preview.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="public"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
              {isPublic ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              <span className="text-sm font-medium">Make files public</span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag"
                maxLength={50}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addTag}
                variant="outline"
                disabled={!newTag.trim() || tags.length >= 10}
              >
                <Tag className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {tags.length >= 10 && (
              <p className="text-sm text-amber-600 mt-1">Maximum 10 tags allowed</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder">Select Folder (optional)</Label>
            <Select
              value={folderId?.toString() || 'none'}
              onValueChange={(value) => setFolderId(value === 'none' ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <FolderIcon className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="No folder (root)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No folder (root)</SelectItem>
                {foldersData?.data?.folders?.map((folder: Folder) => (
                  <SelectItem key={folder.id} value={folder.id.toString()}>
                    {folder.name}
                  </SelectItem>
                )) || []}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Button */}
          {pendingFiles.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>

        {isUploading && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="font-medium text-gray-700">Uploading files...</span>
            </div>
            <Progress value={100} className="mb-2" />
            <p className="text-sm text-gray-600">
              Please don't close this page while uploading
            </p>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle>Confirm Upload</DialogTitle>
                  <DialogDescription>
                    Ready to upload {pendingFiles.length} file(s)
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <strong>Folder:</strong> {folderId ? (foldersData?.data?.folders || []).find((f: Folder) => f.id === folderId)?.name || 'Unknown' : 'Root folder'}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Visibility:</strong> {isPublic ? 'Public' : 'Private'}
              </div>
              {tags.length > 0 && (
                <div className="text-sm text-gray-600">
                  <strong>Tags:</strong> {tags.join(', ')}
                </div>
              )}
              <div className="text-sm text-gray-600">
                <strong>Total Size:</strong> {pendingFiles.reduce((total, file) => total + file.size, 0) > 0 
                  ? formatFileSize(pendingFiles.reduce((total, file) => total + file.size, 0))
                  : '0 Bytes'
                }
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-2">Files to upload:</div>
              {pendingFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-3 text-sm p-2 bg-white rounded border">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-3">
              <Button
                onClick={handleCancelUpload}
                variant="outline"
                disabled={isUploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
