package test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"filevault/internal/handlers"
	"filevault/internal/services"
)

func TestAdminHandler_GetSystemStats(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "successful stats retrieval",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock user count
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM users").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(10))

				// Mock file count
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(50))

				// Mock deduplication stats
				mock.ExpectQuery("WITH file_refs AS").
					WillReturnRows(sqlmock.NewRows([]string{"unique_files", "total_files", "unique_storage", "total_storage"}).
						AddRow(25, 50, 10485760, 20971520)) // 10MB unique, 20MB total
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name: "empty system stats",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock user count
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM users").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

				// Mock file count
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

				// Mock deduplication stats
				mock.ExpectQuery("WITH file_refs AS").
					WillReturnRows(sqlmock.NewRows([]string{"unique_files", "total_files", "unique_storage", "total_storage"}).
						AddRow(0, 0, 0, 0))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			adminService := services.NewAdminService(db)
			fileService := services.NewFileService(db, "/tmp")
			userService := services.NewUserService(db)
			folderService := services.NewFolderService(db)
			adminHandler := handlers.NewAdminHandler(adminService, fileService, userService, folderService)

			router := gin.New()
			router.GET("/admin/stats", adminHandler.GetSystemStats)

			req, _ := http.NewRequest("GET", "/admin/stats", nil)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			assert.Equal(t, tt.expectedStatus, recorder.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "total_users")
				assert.Contains(t, response, "total_files")
				assert.Contains(t, response, "unique_files")
				assert.Contains(t, response, "total_storage_bytes")
				assert.Contains(t, response, "unique_storage_bytes")
				assert.Contains(t, response, "savings_bytes")
				assert.Contains(t, response, "savings_percentage")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestAdminHandler_GetAllFiles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		queryParams    string
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:        "successful file list",
			queryParams: "?page=1&limit=10",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock count query
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))

				// Mock files query
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}).
						AddRow(1, "test1.txt", 1024, "text/plain", false, "2023-01-01T00:00:00Z", 0, "user1").
						AddRow(2, "test2.txt", 2048, "text/plain", true, "2023-01-02T00:00:00Z", 5, "user2"))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:        "empty file list",
			queryParams: "?page=1&limit=10",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock count query
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM files").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

				// Mock files query
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username").
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username"}))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			adminService := services.NewAdminService(db)
			fileService := services.NewFileService(db, "/tmp")
			userService := services.NewUserService(db)
			folderService := services.NewFolderService(db)
			adminHandler := handlers.NewAdminHandler(adminService, fileService, userService, folderService)

			router := gin.New()
			router.GET("/admin/files", adminHandler.GetAllFiles)

			req, _ := http.NewRequest("GET", "/admin/files"+tt.queryParams, nil)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			assert.Equal(t, tt.expectedStatus, recorder.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "files")
				assert.Contains(t, response, "total")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
