import React, { useState } from 'react';
import { Share2, Users, Globe, Lock, Copy, Check, X } from 'lucide-react';
import { Folder } from '../types';

interface FolderSharingProps {
  folder: Folder;
  onClose: () => void;
  onShare: (folderId: number, isPublic: boolean, sharedUsers: string[]) => void;
}

const FolderSharing: React.FC<FolderSharingProps> = ({ folder, onClose, onShare }) => {
  const [isPublic, setIsPublic] = useState(folder.is_public);
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState('');
  const [copied, setCopied] = useState(false);

  const getPublicUrl = (folderId: number) => {
    return `${window.location.origin}/folders/${folderId}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const addUser = () => {
    if (newUser.trim() && !sharedUsers.includes(newUser.trim())) {
      setSharedUsers([...sharedUsers, newUser.trim()]);
      setNewUser('');
    }
  };

  const removeUser = (user: string) => {
    setSharedUsers(sharedUsers.filter(u => u !== user));
  };

  const handleShare = () => {
    onShare(folder.id, isPublic, sharedUsers);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Share Folder</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Folder Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl">📁</div>
            <div>
              <h4 className="font-medium text-gray-900">{folder.name}</h4>
              <p className="text-sm text-gray-500">
                {folder.file_count || 0} files • {folder.subfolder_count || 0} subfolders
              </p>
            </div>
          </div>

          {/* Public Sharing */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="sharing"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-green-600" />
                <span className="font-medium">Public</span>
              </div>
            </label>
            <p className="text-sm text-gray-600 ml-7">
              Anyone with the link can view and download files in this folder
            </p>
            
            {isPublic && (
              <div className="ml-7 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-green-800">Public Link:</span>
                  <button
                    onClick={() => copyToClipboard(getPublicUrl(folder.id))}
                    className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded break-all">
                  {getPublicUrl(folder.id)}
                </code>
              </div>
            )}
          </div>

          {/* Private Sharing */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="sharing"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-600" />
                <span className="font-medium">Private</span>
              </div>
            </label>
            <p className="text-sm text-gray-600 ml-7">
              Only you and specific users can access this folder
            </p>

            {!isPublic && (
              <div className="ml-7 space-y-3">
                {/* Add Users */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    placeholder="Enter username"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addUser()}
                  />
                  <button
                    onClick={addUser}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Shared Users List */}
                {sharedUsers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Shared with:</p>
                    {sharedUsers.map((user, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-700">{user}</span>
                        </div>
                        <button
                          onClick={() => removeUser(user)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Share2 size={16} />
            Update Sharing
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderSharing;
