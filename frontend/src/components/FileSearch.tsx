import React, { useState } from 'react';
import { Search, Filter, X, Calendar, User, Tag, HardDrive, FileType } from 'lucide-react';
import { FileSearchRequest } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface FileSearchProps {
  onSearch: (searchRequest: FileSearchRequest) => void;
  isLoading: boolean;
}

const FileSearch: React.FC<FileSearchProps> = ({ onSearch, isLoading }) => {
  const [searchRequest, setSearchRequest] = useState<FileSearchRequest>({
    search: '',
    mime_type: '',
    min_size: undefined,
    max_size: undefined,
    uploader: '',
    tags: [],
    page: 1,
    limit: 20,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleSearch = () => {
    onSearch(searchRequest);
  };

  const handleReset = () => {
    const resetRequest = {
      search: '',
      mime_type: '',
      min_size: undefined,
      max_size: undefined,
      uploader: '',
      tags: [],
      page: 1,
      limit: 20,
    };
    setSearchRequest(resetRequest);
    onSearch(resetRequest);
  };

  const addTag = () => {
    if (newTag.trim() && !searchRequest.tags?.includes(newTag.trim()) && (searchRequest.tags?.length || 0) < 10) {
      setSearchRequest({
        ...searchRequest,
        tags: [...(searchRequest.tags || []), newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSearchRequest({
      ...searchRequest,
      tags: searchRequest.tags?.filter(tag => tag !== tagToRemove) || [],
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.target === document.getElementById('search-query')) {
        handleSearch();
      } else {
        addTag();
      }
    }
  };

  const mimeTypeOptions = [
    { value: '', label: 'All file types' },
    { value: 'image/', label: 'Images' },
    { value: 'application/pdf', label: 'PDF Documents' },
    { value: 'text/', label: 'Text Files' },
    { value: 'application/zip', label: 'ZIP Archives' },
    { value: 'application/json', label: 'JSON Files' },
    { value: 'video/', label: 'Videos' },
    { value: 'audio/', label: 'Audio Files' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search size={20} />
          Search & Filter Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              id="search-query"
              type="text"
              value={searchRequest.search || ''}
              onChange={(e) => setSearchRequest({ ...searchRequest, search: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder="Search files by name, content, or tags..."
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Filters
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </>
            ) : (
              <>
                <Search size={16} />
                Search
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="icon"
            title="Clear all filters"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="space-y-6 border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileType size={16} />
                  File Type
                </Label>
                <Select
                  value={searchRequest.mime_type || ''}
                  onValueChange={(value) => setSearchRequest({ ...searchRequest, mime_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All file types" />
                  </SelectTrigger>
                  <SelectContent>
                    {mimeTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <HardDrive size={16} />
                  Min Size (MB)
                </Label>
                <Input
                  type="number"
                  value={searchRequest.min_size ? Math.round(parseInt(searchRequest.min_size) / (1024 * 1024)) : ''}
                  onChange={(e) => setSearchRequest({ 
                    ...searchRequest, 
                    min_size: e.target.value ? (parseInt(e.target.value) * 1024 * 1024).toString() : undefined 
                  })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <HardDrive size={16} />
                  Max Size (MB)
                </Label>
                <Input
                  type="number"
                  value={searchRequest.max_size ? Math.round(parseInt(searchRequest.max_size) / (1024 * 1024)) : ''}
                  onChange={(e) => setSearchRequest({ 
                    ...searchRequest, 
                    max_size: e.target.value ? (parseInt(e.target.value) * 1024 * 1024).toString() : undefined 
                  })}
                  placeholder="100"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User size={16} />
                  Uploader
                </Label>
                <Input
                  type="text"
                  value={searchRequest.uploader || ''}
                  onChange={(e) => setSearchRequest({ ...searchRequest, uploader: e.target.value })}
                  placeholder="Filter by uploader..."
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar size={16} />
                  From Date
                </Label>
                <Input
                  type="date"
                  value={searchRequest.start_date || ''}
                  onChange={(e) => setSearchRequest({ ...searchRequest, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar size={16} />
                  To Date
                </Label>
                <Input
                  type="date"
                  value={searchRequest.end_date || ''}
                  onChange={(e) => setSearchRequest({ ...searchRequest, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag size={16} />
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag filter"
                  maxLength={50}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  disabled={!newTag.trim() || (searchRequest.tags?.length || 0) >= 10}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Tag size={16} />
                  Add
                </Button>
              </div>
              {searchRequest.tags && searchRequest.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {searchRequest.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {(searchRequest.tags?.length || 0) >= 10 && (
                <p className="text-sm text-amber-600 mt-1">Maximum 10 tags allowed</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileSearch;
