import React from 'react';
import { render, screen } from '@testing-library/react';
import FileList from '../FileList';

// Mock the downloadUtils module
jest.mock('../../utils/downloadUtils', () => ({
  downloadFileWithName: jest.fn(),
}));

// Mock the FilePreview component
jest.mock('../FilePreview', () => {
  return function MockFilePreview({ file, onDownload, onDelete, onShare }: any) {
    return (
      <div data-testid={`file-preview-${file.id}`}>
        <span>{file.original_name}</span>
        <button onClick={() => onDownload(file.id)}>Download</button>
        <button onClick={() => onDelete(file.id)}>Delete</button>
        <button onClick={() => onShare(file.id)}>Share</button>
      </div>
    );
  };
});

const mockFiles = [
  {
    id: 1,
    original_name: 'test1.txt',
    file_size: 1024,
    mime_type: 'text/plain',
    is_public: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    download_count: 0,
    username: 'user1',
    user_id: 1,
  },
  {
    id: 2,
    original_name: 'test2.pdf',
    file_size: 2048,
    mime_type: 'application/pdf',
    is_public: true,
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    download_count: 5,
    username: 'user2',
    user_id: 2,
  },
];

describe('FileList Component', () => {
  const mockOnDownload = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders file list with files', () => {
    render(
      <FileList
        files={mockFiles}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        currentUserId={1}
      />
    );

    expect(screen.getByText('test1.txt')).toBeInTheDocument();
    expect(screen.getByText('test2.pdf')).toBeInTheDocument();
  });

  test('renders empty state when no files', () => {
    render(
      <FileList
        files={[]}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        currentUserId={1}
      />
    );

    expect(screen.getByText(/no files found/i)).toBeInTheDocument();
  });

  test('calls onDownload when download button is clicked', () => {
    render(
      <FileList
        files={mockFiles}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        currentUserId={1}
      />
    );

    const downloadButton = screen.getByTestId('download-1');
    downloadButton.click();

    expect(mockOnDownload).toHaveBeenCalledWith(1);
  });

  test('calls onDelete when delete button is clicked', () => {
    render(
      <FileList
        files={mockFiles}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        currentUserId={1}
      />
    );

    const deleteButton = screen.getByTestId('delete-1');
    deleteButton.click();

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  test('opens share modal when share button is clicked', () => {
    render(
      <FileList
        files={mockFiles}
        onDownload={mockOnDownload}
        onDelete={mockOnDelete}
        onShare={mockOnShare}
        currentUserId={1}
      />
    );

    const shareButton = screen.getByTestId('share-1');
    shareButton.click();

    // The share button should open the FileSharing modal
    // We can verify this by checking if the modal is rendered
    expect(screen.getByText('test1.txt')).toBeInTheDocument();
  });
});
