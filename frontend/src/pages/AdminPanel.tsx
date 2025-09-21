import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authAPI, fileAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import FileSearch from '../components/FileSearch';
import { FileSearchRequest, FileUploadRequest, User } from '../types';
import toast from 'react-hot-toast';
import { downloadFileWithName } from '../utils/downloadUtils';
import { 
  Shield, 
  Users, 
  BarChart3,
  Edit,
  Save,
  X,
  Database,
  HardDrive,
  Download,
  File,
  Activity,
  Globe,
  CheckCircle
} from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'files' | 'users' | 'stats'>('files');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newQuota, setNewQuota] = useState<number>(0);
  const [searchRequest, setSearchRequest] = useState<FileSearchRequest>({
    page: 1,
    limit: 20,
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery(
    'allUsers',
    () => authAPI.getAllUsers().then(res => res.data)
  );

  // Fetch file stats
  const { data: fileStats, isLoading: statsLoading } = useQuery(
    'fileStats',
    () => fileAPI.getFileStats().then(res => res.data)
  );

  // Fetch storage statistics
  const { data: storageStats } = useQuery(
    'adminStorageStats',
    () => fileAPI.getStorageStats().then(res => res.data),
    {
      refetchInterval: 30000,
    }
  );

  // Fetch all files
  const { data: filesData, isLoading: filesLoading, refetch } = useQuery(
    ['adminFiles', searchRequest],
    () => fileAPI.getFiles(searchRequest).then(res => res.data),
    {
      keepPreviousData: true,
    }
  );

  // Upload files mutation
  const uploadMutation = useMutation(
    ({ files, uploadRequest }: { files: FileList; uploadRequest: FileUploadRequest }) =>
      fileAPI.uploadFiles(files, uploadRequest),
    {
      onSuccess: () => {
        toast.success('Files uploaded successfully!');
        refetch();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Upload failed');
      },
    }
  );

  // Delete file mutation
  const deleteMutation = useMutation(fileAPI.deleteFile, {
    onSuccess: () => {
      toast.success('File deleted successfully!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Delete failed');
    },
  });

  // Update quota mutation
  const updateQuotaMutation = useMutation(
    ({ userId, quotaMB }: { userId: number; quotaMB: number }) =>
      authAPI.updateQuota(userId, quotaMB),
    {
      onSuccess: () => {
        toast.success('User quota updated successfully!');
        queryClient.invalidateQueries('allUsers');
        setEditingUser(null);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update quota');
      },
    }
  );

  const handleUpload = (files: FileList, uploadRequest: FileUploadRequest) => {
    uploadMutation.mutate({ files, uploadRequest });
  };

  const handleDelete = (fileId: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(fileId);
    }
  };

  // Download file using centralized utility
  const handleDownload = async (fileId: number) => {
    await downloadFileWithName(fileId, {
      onSuccess: () => refetch(),
    });
  };

  const handleSearch = (newSearchRequest: FileSearchRequest) => {
    setSearchRequest(newSearchRequest);
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewQuota(user.storage_quota_mb);
  };

  const saveQuota = () => {
    if (editingUser && newQuota > 0) {
      updateQuotaMutation.mutate({
        userId: editingUser.id,
        quotaMB: newQuota,
      });
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewQuota(0);
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <Navbar />
      
      <div className="container">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Admin Panel
              </h1>
              <p className="text-gray-600 text-lg">
                Manage users, files, and system analytics
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white p-1 rounded-lg shadow-sm border w-fit">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'files'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <File size={16} />
            Files
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users size={16} />
            Users
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BarChart3 size={16} />
            Analytics
          </button>
        </div>

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="space-y-6">
            <FileUpload
              onUpload={handleUpload}
              isUploading={uploadMutation.isLoading}
            />
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">All Files</h3>
                <p className="text-sm text-gray-600">
                  {filesData?.total || 0} files in the system
                </p>
              </div>
              
              <FileSearch
                onSearch={handleSearch}
                isLoading={filesLoading}
              />
              
              <div className="mt-4">
                {filesLoading ? (
                  <div className="text-center py-8">
                    <div className="loading mx-auto mb-4" />
                    <p className="text-gray-500">Loading files...</p>
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
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">User Management</h3>
              <p className="text-sm text-gray-600">
                Manage user quotas and permissions
              </p>
            </div>
            
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="loading mx-auto mb-4" />
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {users?.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{user.username}</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">
                              Quota: {user.storage_quota_mb} MB
                            </span>
                            {user.is_admin && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {editingUser?.id === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newQuota}
                            onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                            className="form-input w-20"
                            min="1"
                          />
                          <span className="text-sm text-gray-500">MB</span>
                          <button
                            onClick={saveQuota}
                            disabled={updateQuotaMutation.isLoading}
                            className="btn btn-success btn-sm"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn btn-secondary btn-sm"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditUser(user)}
                          className="btn btn-outline btn-sm"
                        >
                          <Edit size={16} />
                          Edit Quota
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {statsLoading ? (
              <div className="text-center py-8">
                <div className="loading mx-auto mb-4" />
                <p className="text-gray-500">Loading statistics...</p>
              </div>
            ) : (
              <>
                {/* Main Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value text-primary">
                      {fileStats?.total_files || 0}
                    </div>
                    <div className="stat-label">Total Files</div>
                    <File size={24} className="mx-auto mt-2 text-primary/20" />
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-value text-success">
                      {fileStats?.total_downloads || 0}
                    </div>
                    <div className="stat-label">Total Downloads</div>
                    <Download size={24} className="mx-auto mt-2 text-success/20" />
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-value text-warning">
                      {formatBytes(fileStats?.total_size_bytes || 0)}
                    </div>
                    <div className="stat-label">Total Storage</div>
                    <HardDrive size={24} className="mx-auto mt-2 text-warning/20" />
                  </div>

                  <div className="stat-card">
                    <div className="stat-value text-primary">
                      {users?.length || 0}
                    </div>
                    <div className="stat-label">Total Users</div>
                    <Users size={24} className="mx-auto mt-2 text-primary/20" />
                  </div>

                  <div className="stat-card">
                    <div className="stat-value text-error">
                      {users?.filter(u => u.is_admin).length || 0}
                    </div>
                    <div className="stat-label">Admin Users</div>
                    <Shield size={24} className="mx-auto mt-2 text-error/20" />
                  </div>

                  <div className="stat-card">
                    <div className="stat-value text-success">
                      {users?.length ? 
                        Math.round(users.reduce((sum, u) => sum + u.storage_quota_mb, 0) / users.length) : 0
                      } MB
                    </div>
                    <div className="stat-label">Avg Quota</div>
                    <Database size={24} className="mx-auto mt-2 text-success/20" />
                  </div>
                </div>

                {/* Storage Analytics */}
                {storageStats && (
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">Storage Analytics</h3>
                      <p className="text-sm text-gray-500">Deduplication and efficiency metrics</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {formatBytes(storageStats.total_storage_bytes || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Actual Storage Used</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-warning">
                          {formatBytes(storageStats.original_storage_bytes || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Without Deduplication</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-success">
                          {formatBytes(storageStats.savings_bytes || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Space Saved</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {formatPercentage(storageStats.savings_percentage || 0)}%
                        </div>
                        <div className="text-sm text-gray-600">Efficiency</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Health */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">System Health</h3>
                      <Activity size={20} className="text-success" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Database Status</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-success" />
                          <span className="text-success font-medium">Healthy</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Storage Status</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-success" />
                          <span className="text-success font-medium">Normal</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">API Status</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-success" />
                          <span className="text-success font-medium">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">User Distribution</h3>
                      <Globe size={20} className="text-primary" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Regular Users</span>
                        <span className="font-semibold">
                          {users?.filter(u => !u.is_admin).length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Admin Users</span>
                        <span className="font-semibold">
                          {users?.filter(u => u.is_admin).length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Storage Quota</span>
                        <span className="font-semibold">
                          {formatBytes((users?.reduce((sum, u) => sum + u.storage_quota_mb, 0) || 0) * 1024 * 1024)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
