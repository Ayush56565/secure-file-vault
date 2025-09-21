package test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
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

func TestFileHandler_UploadFile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		fileContent    string
		fileName       string
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:        "successful upload",
			fileContent: "test file content",
			fileName:    "test.txt",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock file hash check
				mock.ExpectQuery("SELECT id FROM file_hashes WHERE hash = \\$1").
					WithArgs(sqlmock.AnyArg()).
					WillReturnRows(sqlmock.NewRows([]string{"id"}))

				// Mock file hash insert
				mock.ExpectExec("INSERT INTO file_hashes").
					WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
					WillReturnResult(sqlmock.NewResult(1, 1))

				// Mock file insert
				mock.ExpectExec("INSERT INTO files").
					WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedStatus: http.StatusCreated,
			expectedError:  false,
		},
		{
			name:        "duplicate file",
			fileContent: "duplicate content",
			fileName:    "duplicate.txt",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Mock file hash exists
				mock.ExpectQuery("SELECT id FROM file_hashes WHERE hash = \\$1").
					WithArgs(sqlmock.AnyArg()).
					WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

				// Mock file insert
				mock.ExpectExec("INSERT INTO files").
					WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedStatus: http.StatusCreated,
			expectedError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			// Create temporary upload directory
			uploadDir := t.TempDir()
			fileService := services.NewFileService(db, uploadDir)
			fileHandler := handlers.NewFileHandler(fileService)

			router := gin.New()
			router.POST("/upload", fileHandler.UploadFile)

			// Create multipart form
			var b bytes.Buffer
			w := multipart.NewWriter(&b)

			fw, err := w.CreateFormFile("file", tt.fileName)
			require.NoError(t, err)

			_, err = fw.Write([]byte(tt.fileContent))
			require.NoError(t, err)

			err = w.Close()
			require.NoError(t, err)

			req, _ := http.NewRequest("POST", "/upload", &b)
			req.Header.Set("Content-Type", w.FormDataContentType())

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
				assert.Contains(t, response, "message")
				assert.Contains(t, response, "file")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestFileHandler_GetFiles(t *testing.T) {
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
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

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

			uploadDir := t.TempDir()
			fileService := services.NewFileService(db, uploadDir)
			fileHandler := handlers.NewFileHandler(fileService)

			router := gin.New()
			router.GET("/files", fileHandler.GetFiles)

			req, _ := http.NewRequest("GET", "/files"+tt.queryParams, nil)
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

func TestFileHandler_DownloadFile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		fileID         string
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:   "successful download",
			fileID: "1",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username, fh\\.hash").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username", "hash"}).
						AddRow(1, "test.txt", 1024, "text/plain", false, "2023-01-01T00:00:00Z", 0, "user1", "testhash"))

				mock.ExpectExec("UPDATE files SET download_count = download_count \\+ 1 WHERE id = \\$1").
					WithArgs(1).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:   "file not found",
			fileID: "999",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username, fh\\.hash").
					WithArgs(999).
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username", "hash"}))
			},
			expectedStatus: http.StatusNotFound,
			expectedError:  true,
		},
		{
			name:   "invalid file ID",
			fileID: "invalid",
			mockSetup: func(mock sqlmock.Sqlmock) {
				// No database calls expected for invalid ID
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			uploadDir := t.TempDir()
			fileService := services.NewFileService(db, uploadDir)
			fileHandler := handlers.NewFileHandler(fileService)

			router := gin.New()
			router.GET("/files/:id/download", fileHandler.DownloadFile)

			req, _ := http.NewRequest("GET", "/files/"+tt.fileID+"/download", nil)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			assert.Equal(t, tt.expectedStatus, recorder.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestFileHandler_DownloadPublicFile(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		fileID         string
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:   "successful public download",
			fileID: "1",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username, fh\\.hash").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username", "hash"}).
						AddRow(1, "public.txt", 1024, "text/plain", true, "2023-01-01T00:00:00Z", 0, "user1", "publichash"))

				mock.ExpectExec("UPDATE files SET download_count = download_count \\+ 1 WHERE id = \\$1").
					WithArgs(1).
					WillReturnResult(sqlmock.NewResult(1, 1))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:   "private file access denied",
			fileID: "2",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT f\\.id, f\\.original_name, f\\.file_size, f\\.mime_type, f\\.is_public, f\\.created_at, f\\.download_count, u\\.username, fh\\.hash").
					WithArgs(2).
					WillReturnRows(sqlmock.NewRows([]string{"id", "original_name", "file_size", "mime_type", "is_public", "created_at", "download_count", "username", "hash"}).
						AddRow(2, "private.txt", 1024, "text/plain", false, "2023-01-01T00:00:00Z", 0, "user1", "privatehash"))
			},
			expectedStatus: http.StatusForbidden,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			uploadDir := t.TempDir()
			fileService := services.NewFileService(db, uploadDir)
			fileHandler := handlers.NewFileHandler(fileService)

			router := gin.New()
			router.GET("/files/public/:id/download", fileHandler.DownloadPublicFile)

			req, _ := http.NewRequest("GET", "/files/public/"+tt.fileID+"/download", nil)
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, req)

			assert.Equal(t, tt.expectedStatus, recorder.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(recorder.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
