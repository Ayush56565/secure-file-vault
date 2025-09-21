import { downloadFileWithName, downloadPublicFile } from '../downloadUtils';
import { fileAPI } from '../../services/api';

// Mock the fileAPI
jest.mock('../../services/api', () => ({
  fileAPI: {
    downloadFile: jest.fn(),
    downloadPublicFile: jest.fn(),
  },
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('downloadUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadFileWithName', () => {
    test('should download file successfully', async () => {
      const mockResponse = {
        data: new Blob(['test content'], { type: 'text/plain' }),
        headers: {
          'content-disposition': 'attachment; filename="test.txt"',
        },
      };

      (fileAPI.downloadFile as jest.Mock).mockResolvedValue(mockResponse);

      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      await downloadFileWithName(1, {
        onSuccess: jest.fn(),
        onError: jest.fn(),
      });

      expect(fileAPI.downloadFile).toHaveBeenCalledWith(1);
    });

    test('should handle download error', async () => {
      const mockError = new Error('Download failed');
      (fileAPI.downloadFile as jest.Mock).mockRejectedValue(mockError);

      const onError = jest.fn();

      await downloadFileWithName(1, {
        onSuccess: jest.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('downloadPublicFile', () => {
    test('should download public file successfully', async () => {
      const mockResponse = {
        data: new Blob(['test content'], { type: 'text/plain' }),
        headers: {
          'content-disposition': 'attachment; filename="public.txt"',
        },
      };

      (fileAPI.downloadPublicFile as jest.Mock).mockResolvedValue(mockResponse);

      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      await downloadPublicFile(1, {
        onSuccess: jest.fn(),
        onError: jest.fn(),
      });

      expect(fileAPI.downloadPublicFile).toHaveBeenCalledWith(1);
    });

    test('should handle public file download error', async () => {
      const mockError = new Error('Public file not found');
      (fileAPI.downloadPublicFile as jest.Mock).mockRejectedValue(mockError);

      const onError = jest.fn();

      await downloadPublicFile(1, undefined, {
        onSuccess: jest.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });
});
