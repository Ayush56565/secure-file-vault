import React, { useState } from 'react';
import { Search, Filter, X, Calendar, Folder, HardDrive } from 'lucide-react';

interface FolderSearchRequest {
  search?: string;
  sort_by?: 'name' | 'created_at' | 'file_count';
  sort_order?: 'asc' | 'desc';
  is_public?: boolean;
}

interface AdvancedFolderSearchProps {
  onSearch: (searchRequest: FolderSearchRequest) => void;
  isLoading?: boolean;
}

const AdvancedFolderSearch: React.FC<AdvancedFolderSearchProps> = ({
  onSearch,
  isLoading = false
}) => {
  const [searchRequest, setSearchRequest] = useState<FolderSearchRequest>({
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    is_public: undefined
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    onSearch(searchRequest);
  };

  const handleReset = () => {
    const resetRequest: FolderSearchRequest = {
      search: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      is_public: undefined
    };
    setSearchRequest(resetRequest);
    onSearch(resetRequest);
  };

  const handleInputChange = (field: keyof FolderSearchRequest, value: string | boolean | undefined) => {
    setSearchRequest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Creation Date' },
    { value: 'file_count', label: 'File Count' }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search folders by name..."
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
            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Folder size={14} />
                Sort By
              </label>
              <select
                value={searchRequest.sort_by || 'created_at'}
                onChange={(e) => handleInputChange('sort_by', e.target.value as 'name' | 'created_at' | 'file_count')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={searchRequest.sort_order || 'desc'}
                onChange={(e) => handleInputChange('sort_order', e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Public/Private Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                value={searchRequest.is_public === undefined ? '' : searchRequest.is_public ? 'true' : 'false'}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange('is_public', value === '' ? undefined : value === 'true');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All folders</option>
                <option value="true">Public only</option>
                <option value="false">Private only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
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

export default AdvancedFolderSearch;
