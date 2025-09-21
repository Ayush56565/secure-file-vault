import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { folderAPI } from '../services/api';
import { Folder, FolderCreateRequest, FolderUpdateRequest } from '../types';
import { Plus, Edit2, Trash2, Folder as FolderIcon, Lock, Globe } from 'lucide-react';

interface FolderManagerProps {
  onFolderSelect?: (folderId: number | null) => void;
  selectedFolderId?: number | null;
  onFolderClick?: (folder: Folder) => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({ onFolderSelect, selectedFolderId, onFolderClick }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderPublic, setNewFolderPublic] = useState(false);
  const [parentFolderId, setParentFolderId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: foldersData, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => folderAPI.getFolders(),
  });

  const createFolderMutation = useMutation({
    mutationFn: (folderData: FolderCreateRequest) => folderAPI.createFolder(folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setIsCreating(false);
      setNewFolderName('');
      setNewFolderPublic(false);
      setParentFolderId(null);
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ folderId, folderData }: { folderId: number; folderData: FolderUpdateRequest }) =>
      folderAPI.updateFolder(folderId, folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setEditingFolder(null);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: number) => folderAPI.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate({
        name: newFolderName.trim(),
        parent_id: parentFolderId || undefined,
        is_public: newFolderPublic,
      });
    }
  };

  const handleUpdateFolder = (folderId: number, updates: FolderUpdateRequest) => {
    updateFolderMutation.mutate({ folderId, folderData: updates });
  };

  const handleDeleteFolder = (folderId: number) => {
    if (window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      deleteFolderMutation.mutate(folderId);
    }
  };

  const folders = foldersData?.data.folders || [];

  if (isLoading) {
    return (
      <div className="folder-manager">
        <div className="loading">Loading folders...</div>
      </div>
    );
  }

  return (
    <div className="folder-manager">
      <div className="folder-header">
        <h3>Folders</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setIsCreating(true)}
          disabled={createFolderMutation.isLoading}
        >
          <Plus size={16} />
          New Folder
        </button>
      </div>

      {isCreating && (
        <div className="folder-form">
          <input
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="form-input"
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newFolderPublic}
              onChange={(e) => setNewFolderPublic(e.target.checked)}
            />
            <span>Public folder</span>
          </label>
          <div className="form-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isLoading || !newFolderName.trim()}
            >
              Create
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setIsCreating(false);
                setNewFolderName('');
                setNewFolderPublic(false);
                setParentFolderId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="folder-list">
        <div
          className={`folder-item ${selectedFolderId === null ? 'selected' : ''}`}
          onClick={() => onFolderSelect?.(null)}
        >
          <FolderIcon size={16} />
          <span>All Files</span>
        </div>
        {folders.map((folder: Folder) => (
          <div key={folder.id} className="folder-item">
            <div
              className={`folder-content ${selectedFolderId === folder.id ? 'selected' : ''}`}
              onClick={() => {
                onFolderSelect?.(folder.id);
                onFolderClick?.(folder);
              }}
            >
              {folder.is_public ? <Globe size={16} /> : <Lock size={16} />}
              <span>{folder.name}</span>
              {folder.file_count !== undefined && (
                <span className="file-count">({folder.file_count})</span>
              )}
            </div>
            <div className="folder-actions">
              <button
                className="btn btn-icon btn-sm"
                onClick={() => setEditingFolder(folder)}
                title="Edit folder"
              >
                <Edit2 size={14} />
              </button>
              <button
                className="btn btn-icon btn-sm btn-danger"
                onClick={() => handleDeleteFolder(folder.id)}
                title="Delete folder"
                disabled={deleteFolderMutation.isLoading}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingFolder && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Folder</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editingFolder.name}
                onChange={(e) =>
                  setEditingFolder({ ...editingFolder, name: e.target.value })
                }
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingFolder.is_public}
                  onChange={(e) =>
                    setEditingFolder({ ...editingFolder, is_public: e.target.checked })
                  }
                />
                <span>Public folder</span>
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={() =>
                  handleUpdateFolder(editingFolder.id, {
                    name: editingFolder.name,
                    is_public: editingFolder.is_public,
                  })
                }
                disabled={updateFolderMutation.isLoading}
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setEditingFolder(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderManager;
