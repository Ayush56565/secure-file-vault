import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { adminAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { 
  BarChart3, 
  Users, 
  HardDrive, 
  Download, 
  FileText, 
  TrendingUp,
  Activity,
  Shield,
  Eye,
  Trash2,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const AdminDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch system stats
  const { data: systemStats, isLoading: statsLoading } = useQuery(
    'adminSystemStats',
    () => adminAPI.getSystemStats().then(res => res.data.stats),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch all files
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery(
    ['adminFiles', selectedTab],
    () => adminAPI.getAllFiles({ page: 1, limit: 50 }).then(res => res.data),
    { enabled: selectedTab === 'files' }
  );

  // Fetch user stats
  const { data: userStats, isLoading: usersLoading } = useQuery(
    'adminUserStats',
    () => adminAPI.getUserStats().then(res => res.data.users),
    { enabled: selectedTab === 'users' }
  );

  // Fetch top files
  const { data: topFiles, isLoading: topFilesLoading } = useQuery(
    'adminTopFiles',
    () => adminAPI.getTopFiles({ limit: 10 }).then(res => res.data.files),
    { enabled: selectedTab === 'analytics' }
  );

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery(
    'adminRecentActivity',
    () => adminAPI.getRecentActivity({ limit: 20 }).then(res => res.data.activity),
    { enabled: selectedTab === 'activity' }
  );

  const handleDeleteFile = async (fileId: number) => {
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        await adminAPI.deleteFile(fileId);
        toast.success('File deleted successfully');
        refetchFiles();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete file');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'files', label: 'All Files', icon: FileText },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-destructive" />
            <h1 className="text-4xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground text-lg">Manage files, users, and monitor system activity</p>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon size={16} />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading system statistics...</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                          <p className="text-2xl font-bold">{systemStats?.total_files || 0}</p>
                        </div>
                        <FileText className="h-8 w-8 text-primary/20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                          <p className="text-2xl font-bold">{systemStats?.total_users || 0}</p>
                        </div>
                        <Users className="h-8 w-8 text-green-600/20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                          <p className="text-2xl font-bold">
                            {formatFileSize(systemStats?.total_storage_bytes || 0)}
                          </p>
                        </div>
                        <HardDrive className="h-8 w-8 text-purple-600/20" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
                          <p className="text-2xl font-bold">{systemStats?.total_downloads || 0}</p>
                        </div>
                        <Download className="h-8 w-8 text-orange-600/20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Deduplication Stats
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Optimization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{systemStats?.unique_files || 0}</p>
                        <p className="text-sm text-muted-foreground">Unique Files</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {formatFileSize(systemStats?.savings_bytes || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Space Saved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">
                          {systemStats?.savings_percentage?.toFixed(1) || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Deduplication Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card> */}
              </>
            )}
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>All Files</CardTitle>
                <CardDescription>Manage all files in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading files...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            File
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Uploader
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Downloads
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-background divide-y divide-border">
                        {filesData?.files?.map((file: any) => (
                          <tr key={file.id} className="hover:bg-muted/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium truncate max-w-xs">
                                    {file.original_name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">{file.username}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {formatFileSize(file.file_size || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {file.download_count || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {formatDate(file.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`/api/files/${file.id}/download`, '_blank')}
                                  className="h-8 w-8 p-0"
                                >
                                  <Download size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
                <CardDescription>Storage usage and activity by user</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading user statistics...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Files
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Storage Used
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Downloads
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-background divide-y divide-border">
                        {userStats?.map((user: any) => (
                          <tr key={user.id} className="hover:bg-muted/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium">{user.username}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {user.file_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {formatFileSize(user.used_storage_bytes)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {user.total_downloads}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {formatDate(user.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Top Downloaded Files</CardTitle>
              </CardHeader>
              <CardContent>
                {topFilesLoading ? (
                  <div className="text-center py-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading top files...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topFiles?.map((file: any, index: number) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">#{index + 1}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{file.original_name}</div>
                            <div className="text-sm text-muted-foreground">by {file.username}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{file.download_count} downloads</div>
                          <div className="text-sm text-muted-foreground">{formatFileSize(file.file_size)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest uploads and downloads</CardDescription>
              </CardHeader>
              <CardContent>
                {activityLoading ? (
                  <div className="text-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading recent activity...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentActivity?.map((activity: any, index: number) => (
                      <div key={index} className="px-6 py-4 flex items-center space-x-4">
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          activity.type === 'upload' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {activity.type === 'upload' ? (
                            <FileText className="h-4 w-4 text-green-600" />
                          ) : (
                            <Download className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.type === 'upload' ? 'Uploaded' : 'Downloaded'} {activity.file_name}
                          </p>
                          <p className="text-sm text-muted-foreground">by {activity.username}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(activity.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
