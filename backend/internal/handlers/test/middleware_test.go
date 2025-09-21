package test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"filevault/internal/handlers"
)

func TestRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requests       int
		expectedStatus int
		expectedError  bool
	}{
		{
			name:           "within rate limit",
			requests:       5,
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:           "exceeds rate limit",
			requests:       15,
			expectedStatus: http.StatusTooManyRequests,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			// Mock any database calls if needed
			mock.ExpectQuery("SELECT").WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

			router := gin.New()
			router.Use(handlers.RateLimitMiddleware())
			router.GET("/test", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			// Make multiple requests
			for i := 0; i < tt.requests; i++ {
				req, _ := http.NewRequest("GET", "/test", nil)
				recorder := httptest.NewRecorder()
				router.ServeHTTP(recorder, req)

				if i < tt.requests-1 {
					// All requests except the last should succeed
					assert.Equal(t, http.StatusOK, recorder.Code)
				} else {
					// Last request should show the expected behavior
					assert.Equal(t, tt.expectedStatus, recorder.Code)

					if tt.expectedError {
						var response map[string]interface{}
						err := json.Unmarshal(recorder.Body.Bytes(), &response)
						require.NoError(t, err)
						assert.Contains(t, response, "error")
					}
				}

				// Small delay to ensure rate limiting works
				time.Sleep(10 * time.Millisecond)
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		authHeader     string
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:       "valid token",
			authHeader: "Bearer valid-token",
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT id, username, password_hash, email, is_admin, created_at FROM users WHERE id = \\$1").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "password_hash", "email", "is_admin", "created_at"}).
						AddRow(1, "testuser", "hashed", "test@example.com", false, "2023-01-01T00:00:00Z"))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:           "missing token",
			authHeader:     "",
			mockSetup:      func(mock sqlmock.Sqlmock) {},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
		{
			name:           "invalid token format",
			authHeader:     "InvalidFormat",
			mockSetup:      func(mock sqlmock.Sqlmock) {},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
		{
			name:           "invalid token",
			authHeader:     "Bearer invalid-token",
			mockSetup:      func(mock sqlmock.Sqlmock) {},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer db.Close()

			tt.mockSetup(mock)

			router := gin.New()
			router.Use(handlers.AuthMiddleware())
			router.GET("/protected", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			req, _ := http.NewRequest("GET", "/protected", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

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

func TestAdminMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		authHeader     string
		isAdmin        bool
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name:       "admin user",
			authHeader: "Bearer valid-token",
			isAdmin:    true,
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT id, username, password_hash, email, is_admin, created_at FROM users WHERE id = \\$1").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "password_hash", "email", "is_admin", "created_at"}).
						AddRow(1, "admin", "hashed", "admin@example.com", true, "2023-01-01T00:00:00Z"))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name:       "non-admin user",
			authHeader: "Bearer valid-token",
			isAdmin:    false,
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT id, username, password_hash, email, is_admin, created_at FROM users WHERE id = \\$1").
					WithArgs(1).
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "password_hash", "email", "is_admin", "created_at"}).
						AddRow(1, "user", "hashed", "user@example.com", false, "2023-01-01T00:00:00Z"))
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

			router := gin.New()
			router.Use(handlers.AuthMiddleware())
			router.Use(handlers.AdminMiddleware())
			router.GET("/admin", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "admin success"})
			})

			req, _ := http.NewRequest("GET", "/admin", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

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
