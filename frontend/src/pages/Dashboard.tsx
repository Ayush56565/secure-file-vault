import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { fileAPI, folderAPI, authAPI, adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import Navbar from '../components/Navbar';
import AdvancedFileSearch from '../components/AdvancedFileSearch';
import FileList from '../components/FileList';
import { FileSearchRequest } from '../types';
import { toast } from 'sonner';
import { HardDrive, File, BarChart3, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { downloadFileWithName } from '../utils/downloadUtils';

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { isConnected } = useRealTime();
  const queryClient = useQueryClient();
  const [searchRequest, setSearchRequest] = useState<FileSearchRequest>({
    page: 1,
    limit: 20,
  });

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'userStats',
    () => authAPI.getStats().then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch storage statistics
  const { data: storageStats, isLoading: storageStatsLoading } = useQuery(
    'storageStats',
    () => fileAPI.getStorageStats().then(res => res.data),
    {
      refetchInterval: 30000,
      retry: 3,
      retryDelay: 1000,
    }
  );

  // Fetch deduplication statistics

  // Fetch files (use admin API if user is admin)
  const { data: filesData, isLoading: filesLoading, refetch } = useQuery(
    ['files', searchRequest, isAdmin],
    () => {
      if (isAdmin) {
        return adminAPI.getAllFiles(searchRequest).then(res => res.data);
      } else {
        return fileAPI.getFiles(searchRequest).then(res => res.data);
      }
    },
    {
      keepPreviousData: true,
    }
  );

  // Fetch folders
  const { data: foldersData } = useQuery(
    'folders',
    () => folderAPI.getFolders(),
    {
      refetchInterval: 30000,
    }
  );

  // Delete file mutation (use admin API if user is admin)
  const deleteMutation = useMutation(
    (fileId: number) => {
      if (isAdmin) {
        return adminAPI.deleteFile(fileId);
      } else {
        return fileAPI.deleteFile(fileId);
      }
    },
    {
      onSuccess: () => {
        toast.success('File deleted successfully!');
        queryClient.invalidateQueries('userStats');
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Delete failed');
      },
    }
  );

  // Download file using centralized utility
  const handleDownload = async (fileId: number) => {
    await downloadFileWithName(fileId, {
      onSuccess: () => refetch(), // Refresh to update download count
    });
  };


  const handleDelete = (fileId: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(fileId);
    }
  };

  const handleShareFile = async (fileId: number, isPublic: boolean, sharedUsers: string[]) => {
    try {
      await fileAPI.shareFile(fileId, isPublic, sharedUsers);
      toast.success('File sharing updated successfully!');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Share update failed');
    }
  };

  const handleSearch = (newSearchRequest: FileSearchRequest) => {
    setSearchRequest(newSearchRequest);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return value.toFixed(1) + '%';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.username}! 👋
                {isAdmin && <Badge variant="destructive" className="ml-3">ADMIN</Badge>}
              </h1>
              <p className="text-muted-foreground text-lg">
                {isAdmin 
                  ? 'Administrative dashboard - View and manage all files across the system'
                  : 'Manage your files and storage with advanced deduplication'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                  <p className="text-2xl font-bold text-primary">
                    {statsLoading ? '...' : stats?.total_files || 0}
                  </p>
                </div>
                <File className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statsLoading || storageStatsLoading ? '...' : formatBytes((storageStats?.total_storage_bytes || 0))}
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage Quota</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {statsLoading ? '...' : formatBytes((stats?.storage_quota_mb || 0) * 1024 * 1024)}
                  </p>
                </div>
                <Database className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Files Found</p>
                  <p className="text-2xl font-bold text-primary">
                    {filesData?.total || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Storage Analytics */}
        {storageStats && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Storage Analytics</CardTitle>
              <CardDescription>Deduplication and storage efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {storageStatsLoading ? '...' : formatBytes(storageStats?.total_storage_bytes || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Actual Storage Used</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {storageStatsLoading ? '...' : formatBytes(storageStats?.original_storage_bytes || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Without Deduplication</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {storageStatsLoading ? '...' : formatBytes(storageStats?.savings_bytes || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Space Saved</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {storageStatsLoading ? '...' : formatPercentage(storageStats?.savings_percentage || 0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Efficiency</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {storageStatsLoading ? '...' : formatPercentage((storageStats?.deduplication_ratio || 0) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Deduplication Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Files Section */}
        <Card>
          <CardHeader>
            <CardTitle>Your Files</CardTitle>
            <CardDescription>
              {filesData?.total || 0} files found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdvancedFileSearch
              onSearch={handleSearch}
              isLoading={filesLoading}
              showFolderFilter={true}
              folders={foldersData?.data?.folders || []}
            />
            
            <div className="mt-4">
              {filesLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading files...</p>
                </div>
              ) : (
                <FileList
                  files={filesData?.files || []}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onShare={handleShareFile}
                  currentUserId={user?.id || 0}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;