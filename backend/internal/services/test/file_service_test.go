package test

import (
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"filevault/internal/models"
	"filevault/internal/services"
)

func TestFileService_GetFiles(t *testing.T) {
	tests := []struct {
		name          string
		userID        int
		searchRequest models.FileSearchRequest
		mockSetup     func(sqlmock.Sqlmock)
		expectedError bool
		expectedCount int
	}{
		{
			name:   "successful file retrieval",
			userID: 1,
			searchRequest: models.FileSearchRequest{
				Page:  1,
				Limit: 10,
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock count query
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

				// Mock files query
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}).
						AddRow(1, "test1.txt", 1024, "text/plain", false, "2023-01-01T00:00:00Z", 0, "user1").
						AddRow(2, "test2.txt", 2048, "text/plain", true, "2023-01-02T00:00:00Z", 5, "user1"))
			},
			expectedError: false,
			expectedCount: 2,
		},
		{
			name:   "empty file list",
			userID: 1,
			searchRequest: models.FileSearchRequest{
				Page:  1,
				Limit: 10,
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock count query
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

				// Mock files query
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}))
			},
			expectedError: false,
			expectedCount: 0,
		},
		{
			name:   "search with filters",
			userID: 1,
			searchRequest: models.FileSearchRequest{
				Page:     1,
				Limit:    10,
				Query:    "test",
				MimeType: "text/plain",
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock count query with filters
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

				// Mock files query with filters
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}).
						AddRow(1, "test.txt", 1024, "text/plain", true, "2023-01-01T00:00:00Z", 0, "user1"))
			},
			expectedError: false,
			expectedCount: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			fileService := services.NewFileService(db, "/tmp")
			result, err := fileService.GetFiles(tt.userID, tt.searchRequest)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedCount, len(result))
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestFileService_GetDeduplicationStats(t *testing.T) {
	tests := []struct {
		name          string
		userID        int
		mockSetup     func(sqlmock.Sqlmock)
		expectedError bool
	}{
		{
			name:   "successful deduplication stats",
			userID: 1,
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.original_name, fh\\.file_size, fh\\.mime_type, f\\.created_at, \\(SELECT COUNT\\(\\*\\) FROM files f2 WHERE f2\\.hash_id = f\\.hash_id\\) as reference_count").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"original_name", "file_size", "mime_type", "created_at", "reference_count"}).
						AddRow("test1.txt", 1024, "text/plain", "2023-01-01T00:00:00Z", 1).
						AddRow("test2.txt", 2048, "text/plain", "2023-01-02T00:00:00Z", 2))
			},
			expectedError: false,
		},
		{
			name:   "empty deduplication stats",
			userID: 1,
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.original_name, fh\\.file_size, fh\\.mime_type, f\\.created_at, \\(SELECT COUNT\\(\\*\\) FROM files f2 WHERE f2\\.hash_id = f\\.hash_id\\) as reference_count").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"original_name", "file_size", "mime_type", "created_at", "reference_count"}))
			},
			expectedError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			fileService := services.NewFileService(db, "/tmp")
			result, err := fileService.GetDeduplicationStats(tt.userID)

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Contains(t, result, "files")
				assert.Contains(t, result, "total_files")
				assert.Contains(t, result, "unique_files")
				assert.Contains(t, result, "duplicated_files")
				assert.Contains(t, result, "deduplication_rate")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestFileService_GetPublicFiles(t *testing.T) {
	tests := []struct {
		name          string
		mockSetup     func(sqlmock.Sqlmock)
		expectedError bool
		expectedCount int
	}{
		{
			name: "successful public files retrieval",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}).
						AddRow(1, "public1.txt", 1024, "text/plain", true, "2023-01-01T00:00:00Z", 0, "user1").
						AddRow(2, "public2.txt", 2048, "text/plain", true, "2023-01-02T00:00:00Z", 5, "user2"))
			},
			expectedError: false,
			expectedCount: 2,
		},
		{
			name: "empty public files",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}))
			},
			expectedError: false,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			fileService := services.NewFileService(db, "/tmp")
			result, err := fileService.GetPublicFiles()

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tt.expectedCount, len(result))
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
