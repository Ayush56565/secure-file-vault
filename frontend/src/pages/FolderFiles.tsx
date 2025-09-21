import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { fileAPI, folderAPI } from '../services/api';
import { FileSearchRequest } from '../types';
import Navbar from '../components/Navbar';
import FileList from '../components/FileList';
import FileSearch from '../components/FileSearch';
import FilePreview from '../components/FilePreview';
import { ArrowLeft, Folder as FolderIcon, FileText, Calendar, HardDrive } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { downloadFileWithName } from '../utils/downloadUtils';

const FolderFiles: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchRequest, setSearchRequest] = useState<FileSearchRequest>({
    page: 1,
    limit: 20,
  });
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Fetch folder details
  const { data: folderData, isLoading: folderLoading } = useQuery(
    ['folder', folderId],
    () => folderAPI.getFolder(parseInt(folderId!)),
    {
      enabled: !!folderId,
    }
  );

  // Fetch files in folder
  const { data: filesData, isLoading: filesLoading } = useQuery(
    ['folder-files', folderId, searchRequest],
    () => {
      const folderIdNum = parseInt(folderId!);
      const searchParams = { 
        ...searchRequest, 
        folder_id: folderIdNum 
      };
      console.log('FolderFiles: folderId from URL:', folderId, 'parsed:', folderIdNum);
      console.log('FolderFiles: Search parameters being sent:', searchParams);
      return fileAPI.getFiles(searchParams).then(res => {
        console.log('FolderFiles: API response:', res.data);
        return res.data;
      });
    },
    {
      enabled: !!folderId && !isNaN(parseInt(folderId!)),
      keepPreviousData: true,
    }
  );

  // Delete file mutation
  const deleteMutation = useMutation(fileAPI.deleteFile, {
    onSuccess: () => {
      toast.success('File deleted successfully!');
      queryClient.invalidateQueries('folder-files');
      queryClient.invalidateQueries('userStats');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Delete failed');
    },
  });

  // Download file using centralized utility
  const handleDownload = async (fileId: number) => {
    await downloadFileWithName(fileId);
  };

  const handleDelete = (fileId: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(fileId);
    }
  };

  const handleSearch = (newSearchRequest: FileSearchRequest) => {
    console.log('FolderFiles: Search request received:', newSearchRequest);
    setSearchRequest(newSearchRequest);
  };

  const handlePreview = (file: any) => {
    setPreviewFile(file);
  };

  if (folderLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading folder...</h3>
            <p className="text-gray-600">Please wait while we fetch the folder details</p>
          </div>
        </div>
      </div>
    );
  }

  if (!folderData?.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FolderIcon size={48} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Folder not found</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              The folder you're looking for doesn't exist or you don't have permission to access it.
            </p>
            <Button onClick={() => navigate('/folders')} className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to Folders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const folder = folderData.data;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/folders')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back to Folders
            </Button>
          </div>
          
          {/* Folder Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FolderIcon size={32} className="text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                    {folder.name}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FileText size={16} />
                      <span>{filesData?.total || 0} files</span>
                    </div>
                    {folder.folder_size && folder.folder_size > 0 && (
                      <div className="flex items-center gap-1">
                        <HardDrive size={16} />
                        <span>{formatFileSize(folder.folder_size)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>Created {new Date(folder.created_at).toLocaleDateString()}</span>
                    </div>
                    <Badge variant={folder.is_public ? "default" : "secondary"}>
                      {folder.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Files Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Files in {folder.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {filesData?.total || 0} files found
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <FileSearch
              onSearch={handleSearch}
              isLoading={filesLoading}
            />
            
            <div className="mt-6">
              {filesLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading files...</h3>
                  <p className="text-gray-600">Please wait while we fetch the files</p>
                </div>
              ) : (
                <FileList
                  files={filesData?.files || []}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                  currentUserId={1} // You might want to get this from auth context
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default FolderFiles;
