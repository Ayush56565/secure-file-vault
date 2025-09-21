import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, FileText, User, HardDrive, Tag } from 'lucide-react';
import { FileSearchRequest } from '../types';

interface AdvancedFileSearchProps {
  onSearch: (searchRequest: FileSearchRequest) => void;
  isLoading?: boolean;
  showFolderFilter?: boolean;
  folders?: Array<{ id: number; name: string }>;
}

const AdvancedFileSearch: React.FC<AdvancedFileSearchProps> = ({
  onSearch,
  isLoading = false,
  showFolderFilter = false,
  folders = []
}) => {
  const [searchRequest, setSearchRequest] = useState<FileSearchRequest>({
    page: 1,
    limit: 20,
    search: '',
    mime_type: '',
    min_size: '',
    max_size: '',
    start_date: '',
    end_date: '',
    tags: [],
    uploader: '',
    folder_id: undefined,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    onSearch(searchRequest);
  };

  const handleReset = () => {
    const resetRequest: FileSearchRequest = {
      page: 1,
      limit: 20,
      search: '',
      mime_type: '',
      min_size: '',
      max_size: '',
      start_date: '',
      end_date: '',
      tags: [],
      uploader: '',
      folder_id: undefined,
      sort_by: 'created_at',
      sort_order: 'desc'
    };
    setSearchRequest(resetRequest);
    onSearch(resetRequest);
  };

  const handleInputChange = (field: keyof FileSearchRequest, value: string | number | undefined) => {
    setSearchRequest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const mimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'video/mp4',
    'audio/mpeg',
    'application/json',
    'text/csv'
  ];

  const sizeOptions = [
    { label: 'Any size', value: '' },
    { label: 'Under 1MB', value: '0-1048576' },
    { label: '1MB - 10MB', value: '1048576-10485760' },
    { label: '10MB - 100MB', value: '10485760-104857600' },
    { label: 'Over 100MB', value: '104857600-999999999999' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'Upload Date' },
    { value: 'file_size', label: 'File Size' },
    { value: 'download_count', label: 'Downloads' },
    { value: 'original_name', label: 'Name' }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchRequest.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
            showFilters 
              ? 'bg-blue-50 border-blue-300 text-blue-700' 
              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Filter size={18} />
          Filters
        </button>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* MIME Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <FileText size={14} />
                File Type
              </label>
              <select
                value={searchRequest.mime_type || ''}
                onChange={(e) => handleInputChange('mime_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All types</option>
                {mimeTypes.map(type => (
                  <option key={type} value={type}>
                    {type.split('/')[1].toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <HardDrive size={14} />
                File Size
              </label>
              <select
                value={`${searchRequest.min_size || ''}-${searchRequest.max_size || ''}`}
                onChange={(e) => {
                  const [min, max] = e.target.value.split('-');
                  handleInputChange('min_size', min || '');
                  handleInputChange('max_size', max || '');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sizeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Uploader Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <User size={14} />
                Uploader
              </label>
              <input
                type="text"
                placeholder="Username..."
                value={searchRequest.uploader || ''}
                onChange={(e) => handleInputChange('uploader', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={14} />
                Start Date
              </label>
              <input
                type="date"
                value={searchRequest.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={14} />
                End Date
              </label>
              <input
                type="date"
                value={searchRequest.end_date || ''}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Tag size={14} />
                Tags
              </label>
              <input
                type="text"
                placeholder="Comma-separated tags..."
                value={searchRequest.tags || ''}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Folder Filter (if applicable) */}
            {showFolderFilter && folders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder
                </label>
                <select
                  value={searchRequest.folder_id || ''}
                  onChange={(e) => handleInputChange('folder_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All folders</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={searchRequest.sort_by || 'created_at'}
                onChange={(e) => handleInputChange('sort_by', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={searchRequest.sort_order || 'desc'}
                onChange={(e) => handleInputChange('sort_order', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1"
            >
              <X size={16} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFileSearch;
