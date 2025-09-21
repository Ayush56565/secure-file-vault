import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from 'react-query';
import { fileAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FileUploadRequest } from '../types';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import { toast } from 'sonner';
import { ArrowLeft, Upload as UploadIcon, HardDrive } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch fresh user stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'userStats',
    () => authAPI.getStats().then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      onSuccess: (data) => {
        console.log('Upload page stats received:', data);
      },
    }
  );
    // Fetch storage statistics
    const { data: storageStats } = useQuery(
      'storageStats',
      () => fileAPI.getStorageStats().then(res => res.data),
      {
        refetchInterval: 30000,
      }
    );

  // Upload files mutation
  const uploadMutation = useMutation(
    ({ files, uploadRequest }: { files: FileList; uploadRequest: FileUploadRequest }) =>
      fileAPI.uploadFiles(files, uploadRequest),
    {
      onSuccess: () => {
        toast.success('Files uploaded successfully!');
        queryClient.invalidateQueries('userStats');
        queryClient.invalidateQueries('files');
        queryClient.invalidateQueries('storageStats');
        queryClient.invalidateQueries('deduplicationStats');
        // Navigate back to dashboard after successful upload
        navigate('/dashboard');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Upload failed');
      },
    }
  );

  const handleUpload = (files: FileList, uploadRequest: FileUploadRequest) => {
    uploadMutation.mutate({ files, uploadRequest });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Upload Files
              </h1>
              <p className="text-gray-600 text-lg">
                Upload your files with advanced deduplication and organization
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <FileUpload
              onUpload={handleUpload}
              isUploading={uploadMutation.isLoading}
              onUploadComplete={() => {
                // Files have been successfully uploaded and previews cleared
                console.log('Upload completed successfully');
              }}
            />
          </div>

          {/* Upload Tips - Takes up 1 column */}
          <div className="lg:col-span-1 space-y-6">
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  Upload Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Drag & Drop</h4>
                    <p className="text-sm text-gray-600">Drag multiple files directly onto the upload area</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Choose Folder</h4>
                    <p className="text-sm text-gray-600">Select a folder to organize your files</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Add Tags</h4>
                    <p className="text-sm text-gray-600">Tag your files for easy searching later</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Deduplication</h4>
                    <p className="text-sm text-gray-600">Duplicate files are automatically detected and stored efficiently</p>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            {/* Storage Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Storage Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {statsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="text-sm text-gray-600">Loading storage info...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Storage Used</span>
                      <span className="text-sm font-medium">
                        {storageStats?.total_storage_bytes ? `${Math.round(storageStats.total_storage_bytes / (1024 * 1024) * 100) / 100} MB` : '0 MB'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Storage Quota</span>
                      <span className="text-sm font-medium">
                        {stats?.storage_quota_mb ? `${stats.storage_quota_mb} MB` : '10 MB'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Progress 
                        value={storageStats?.total_storage_bytes && stats?.storage_quota_mb 
                          ? (storageStats.total_storage_bytes / (stats.storage_quota_mb * 1024 * 1024)) * 100 
                          : 0
                        } 
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 text-center">
                        {storageStats?.total_storage_bytes && stats?.storage_quota_mb 
                          ? `${Math.round((storageStats.total_storage_bytes / (stats.storage_quota_mb * 1024 * 1024)) * 100)}% used`
                          : '0% used'
                        }
                      </div>
                    </div>
                    
                    {/* Deduplication Stats */}
                    {storageStats && storageStats.savings_bytes > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Space Saved</span>
                          <span className="text-sm font-medium text-green-600">
                            {Math.round(storageStats.savings_bytes / (1024 * 1024) * 100) / 100} MB
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Deduplication Rate</span>
                          <span className="text-sm font-medium text-blue-600">
                            {Math.round(storageStats.savings_percentage)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
