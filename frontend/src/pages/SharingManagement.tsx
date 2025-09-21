import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { fileAPI, folderAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Share2, Users, Globe, Lock, Copy, Check, X, FileText, Folder, Download, Trash2 } from 'lucide-react';
import { File, Folder as FolderType } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const SharingManagement: React.FC = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch user's files
  const { data: filesData, refetch: refetchFiles } = useQuery(
    'userFiles',
    () => fileAPI.getFiles({ page: 1, limit: 1000 }).then(res => res.data),
  );

  // Fetch user's folders
  const { data: foldersData, refetch: refetchFolders } = useQuery(
    'userFolders',
    () => folderAPI.getFolders().then(res => res.data),
  );

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy link');
    }
  };

  const getPublicUrl = (id: number, type: 'file' | 'folder') => {
    return `${window.location.origin}/${type}s/${id}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.startsWith('text/')) return '📝';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    if (mimeType?.includes('json')) return '📋';
    return '📁';
  };

  const files = filesData?.files || [];
  const folders = foldersData?.folders || [];

  const publicFiles = files.filter(file => file.is_public);
  const privateFiles = files.filter(file => !file.is_public);
  const publicFolders = folders.filter(folder => folder.is_public);
  const privateFolders = folders.filter(folder => !folder.is_public);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Sharing Management</h1>
          <p className="text-muted-foreground">Manage your shared files and folders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Public Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe className="text-green-600" size={24} />
                <CardTitle>Public Files</CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {publicFiles.length}
                </Badge>
              </div>
              <CardDescription>Files accessible to anyone with the link</CardDescription>
            </CardHeader>
            
            <CardContent>
              {publicFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p>No public files</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publicFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(file.mime_type || '')}</span>
                        <div>
                          <h3 className="font-medium">{file.original_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.file_size || 0)} • {file.download_count} downloads
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(getPublicUrl(file.id, 'file'), `file-${file.id}`)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {copied === `file-${file.id}` ? <Check size={16} /> : <Copy size={16} />}
                        {copied === `file-${file.id}` ? 'Copied!' : 'Copy Link'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Public Folders */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Globe className="text-green-600" size={24} />
                <CardTitle>Public Folders</CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {publicFolders.length}
                </Badge>
              </div>
              <CardDescription>Folders accessible to anyone with the link</CardDescription>
            </CardHeader>
            
            <CardContent>
              {publicFolders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p>No public folders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publicFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📁</span>
                        <div>
                          <h3 className="font-medium">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {folder.file_count || 0} files • {folder.subfolder_count || 0} subfolders
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(getPublicUrl(folder.id, 'folder'), `folder-${folder.id}`)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {copied === `folder-${folder.id}` ? <Check size={16} /> : <Copy size={16} />}
                        {copied === `folder-${folder.id}` ? 'Copied!' : 'Copy Link'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Private Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="text-muted-foreground" size={24} />
                <CardTitle>Private Files</CardTitle>
                <Badge variant="secondary">
                  {privateFiles.length}
                </Badge>
              </div>
              <CardDescription>Files only accessible to you</CardDescription>
            </CardHeader>
            
            <CardContent>
              {privateFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p>No private files</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {privateFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(file.mime_type || '')}</span>
                        <div>
                          <h3 className="font-medium">{file.original_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.file_size || 0)} • Created {format(new Date(file.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => copyToClipboard(getPublicUrl(file.id, 'file'), `file-${file.id}`)}
                          size="sm"
                        >
                          <Share2 size={16} />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Private Folders */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Lock className="text-muted-foreground" size={24} />
                <CardTitle>Private Folders</CardTitle>
                <Badge variant="secondary">
                  {privateFolders.length}
                </Badge>
              </div>
              <CardDescription>Folders only accessible to you</CardDescription>
            </CardHeader>
            
            <CardContent>
              {privateFolders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p>No private folders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {privateFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📁</span>
                        <div>
                          <h3 className="font-medium">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {folder.file_count || 0} files • {folder.subfolder_count || 0} subfolders
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => copyToClipboard(getPublicUrl(folder.id, 'folder'), `folder-${folder.id}`)}
                          size="sm"
                        >
                          <Share2 size={16} />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        {/* <Card className="mt-8">
          <CardHeader>
            <CardTitle>Sharing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{publicFiles.length}</div>
                <div className="text-sm text-muted-foreground">Public Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{publicFolders.length}</div>
                <div className="text-sm text-muted-foreground">Public Folders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{privateFiles.length}</div>
                <div className="text-sm text-muted-foreground">Private Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{privateFolders.length}</div>
                <div className="text-sm text-muted-foreground">Private Folders</div>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
};

export default SharingManagement;
