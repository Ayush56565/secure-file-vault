import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { folderAPI } from '../services/api';
import { Folder, FolderCreateRequest, FolderUpdateRequest } from '../types';
import Navbar from '../components/Navbar';
import { ArrowLeft, Folder as FolderIcon, Plus, Edit2, Trash2, Lock, Globe } from 'lucide-react';
import AdvancedFolderSearch from '../components/AdvancedFolderSearch';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';

const Folders: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderPublic, setNewFolderPublic] = useState(false);
  const [parentFolderId, setParentFolderId] = useState<number | null>(null);
  const [searchRequest, setSearchRequest] = useState({
    search: '',
    sort_by: 'created_at' as 'name' | 'created_at' | 'file_count',
    sort_order: 'desc' as 'asc' | 'desc',
    is_public: undefined as boolean | undefined
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch folders
  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders', searchRequest],
    queryFn: () => folderAPI.getFolders(searchRequest),
    onSuccess: (data) => {
      console.log('Folders data received:', data);
      if (data?.data?.folders) {
        data.data.folders.forEach((folder: any) => {
          console.log(`Folder ${folder.name}: file_count=${folder.file_count}, folder_size=${folder.folder_size}`);
        });
      }
    },
  });

  // Create folder mutation
  const createMutation = useMutation(
    (data: FolderCreateRequest) => folderAPI.createFolder(data),
    {
      onSuccess: () => {
        toast.success('Folder created successfully!');
        queryClient.invalidateQueries('folders');
        setIsCreating(false);
        setNewFolderName('');
        setNewFolderPublic(false);
        setParentFolderId(null);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create folder');
      },
    }
  );

  // Update folder mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: FolderUpdateRequest }) =>
      folderAPI.updateFolder(id, data),
    {
      onSuccess: () => {
        toast.success('Folder updated successfully!');
        queryClient.invalidateQueries('folders');
        setEditingFolder(null);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update folder');
      },
    }
  );

  // Delete folder mutation
  const deleteMutation = useMutation(folderAPI.deleteFolder, {
    onSuccess: () => {
      toast.success('Folder deleted successfully!');
      queryClient.invalidateQueries('folders');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete folder');
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    createMutation.mutate({
      name: newFolderName.trim(),
      parent_id: parentFolderId || undefined,
      is_public: newFolderPublic,
    });
  };

  const handleUpdateFolder = () => {
    if (!editingFolder) return;

    updateMutation.mutate({
      id: editingFolder.id,
      data: {
        name: newFolderName.trim(),
        parent_id: parentFolderId || undefined,
        is_public: newFolderPublic,
      },
    });
  };

  const handleDeleteFolder = (folderId: number) => {
    if (window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      deleteMutation.mutate(folderId);
    }
  };

  const handleFolderClick = (folder: Folder) => {
    navigate(`/folders/${folder.id}`);
  };

  const handleSearch = (newSearchRequest: any) => {
    setSearchRequest(newSearchRequest);
  };

  const startEditing = (folder: Folder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderPublic(folder.is_public);
    setParentFolderId(folder.parent_id || null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Folders
              </h1>
              <p className="text-muted-foreground text-lg">
                Organize and manage your files in folders
              </p>
            </div>
          </div>
        </div>

        {/* Create Folder Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus size={20} />
              Create New Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCreating ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folderName">Folder Name</Label>
                  <Input
                    id="folderName"
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentFolder">Parent Folder (optional)</Label>
                  <Select
                    value={parentFolderId?.toString() || ''}
                    onValueChange={(value) => setParentFolderId(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No parent (root level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No parent (root level)</SelectItem>
                      {foldersData?.data?.folders?.map((folder: Folder) => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={newFolderPublic}
                    onCheckedChange={(checked) => setNewFolderPublic(checked as boolean)}
                  />
                  <Label htmlFor="isPublic">Make this folder public</Label>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateFolder}
                    disabled={createMutation.isLoading}
                  >
                    {createMutation.isLoading ? 'Creating...' : 'Create Folder'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setNewFolderName('');
                      setNewFolderPublic(false);
                      setParentFolderId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2"
              >
                <Plus size={18} />
                Create New Folder
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <AdvancedFolderSearch
              onSearch={handleSearch}
              isLoading={foldersLoading}
            />
          </CardContent>
        </Card>

        {/* Folders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderIcon size={20} />
              All Folders
            </CardTitle>
            <CardDescription>
              {foldersData?.data?.total || 0} folders found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {foldersLoading ? (
              <div className="text-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading folders...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {foldersData?.data?.folders?.map((folder: Folder) => (
                  <Card key={folder.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div 
                        onClick={() => handleFolderClick(folder)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FolderIcon size={20} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">
                              {folder.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {folder.file_count || 0} files 
                              <span className="mx-2"> 
                                   • 
                                </span>
                              {folder.folder_size && folder.folder_size>0 && (
                                <span className=""> 
                                    {formatFileSize(folder.folder_size)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            {folder.is_public ? (
                              <>
                                <Globe size={14} />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock size={14} />
                                Private
                              </>
                            )}
                          </span>
                          <span>
                            {new Date(folder.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(folder)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {(!foldersData?.data?.folders || foldersData.data.folders.length === 0) && (
                  <div className="col-span-full text-center py-12">
                    <div className="text-6xl mb-4">📁</div>
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">No folders found</h3>
                    <p className="text-muted-foreground">Create your first folder to get started</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Folders;
