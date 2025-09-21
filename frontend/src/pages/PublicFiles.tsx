import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { fileAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import FileList from '../components/FileList';
import AdvancedFileSearch from '../components/AdvancedFileSearch';
import { FileSearchRequest } from '../types';
import { Eye, Download, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { downloadPublicFile } from '../utils/downloadUtils';

const PublicFiles: React.FC = () => {
  const { user } = useAuth();
  const [searchRequest, setSearchRequest] = useState<FileSearchRequest>({
    page: 1,
    limit: 20,
  });

  // Fetch public files
  const { data: filesData, isLoading: filesLoading, refetch } = useQuery(
    ['publicFiles', searchRequest],
    () => fileAPI.getPublicFiles(searchRequest).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  // Download file using centralized utility
  const handleDownload = async (fileId: number) => {
    await downloadPublicFile(fileId, undefined, {
      onSuccess: () => refetch(), // Refresh to update download count
    });
  };

  const handleDelete = (fileId: number) => {
    // Public files can't be deleted by non-owners
    console.log('Cannot delete public files');
  };

  const handleSearch = (newSearchRequest: FileSearchRequest) => {
    setSearchRequest(newSearchRequest);
  };

  const totalDownloads = filesData?.files?.reduce((sum, file) => sum + file.download_count, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">
              Public Files
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover and download files shared by the community
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Public Files</p>
                  <p className="text-2xl font-bold text-primary">
                    {filesData?.total || 0}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
                  <p className="text-2xl font-bold text-green-600">
                    {totalDownloads}
                  </p>
                </div>
                <Download className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Currently Viewing</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {filesData?.files?.length || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Browse Public Files</CardTitle>
            <CardDescription>
              All files are publicly shared and available for download
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdvancedFileSearch
              onSearch={handleSearch}
              isLoading={filesLoading}
              showFolderFilter={false}
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

export default PublicFiles;
