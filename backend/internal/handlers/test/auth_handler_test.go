package test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"filevault/internal/handlers"
	"filevault/internal/services"
)

func TestAuthHandler_Register(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "successful registration",
			requestBody: map[string]interface{}{
				"username": "testuser",
				"password": "password123",
				"email":    "test@example.com",
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Check if username or email already exists
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM users WHERE username = \\$1 OR email = \\$2").
					WithArgs("testuser", "test@example.com").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

				// Insert user with RETURNING clause
				testTime := time.Now()
				mock.ExpectQuery("INSERT INTO users \\(username, email, password_hash, storage_quota_mb\\) VALUES \\(\\$1, \\$2, \\$3, \\$4\\) RETURNING id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at").
					WithArgs("testuser", "test@example.com", sqlmock.AnyArg(), 10).
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "email", "password_hash", "is_admin", "storage_quota_mb", "created_at", "updated_at"}).
						AddRow(1, "testuser", "test@example.com", "hashedpassword", false, 10, testTime, testTime))
			},
			expectedStatus: http.StatusCreated,
			expectedError:  false,
		},
		{
			name: "duplicate username",
			requestBody: map[string]interface{}{
				"username": "existinguser",
				"password": "password123",
				"email":    "test@example.com",
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Check if username or email already exists - return count > 0
				mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM users WHERE username = \\$1 OR email = \\$2").
					WithArgs("existinguser", "test@example.com").
					WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
		{
			name: "invalid request body",
			requestBody: map[string]interface{}{
				"username": "",
				"password": "",
			},
			mockSetup:      func(mock sqlmock.Sqlmock) {},
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

			userService := services.NewUserService(db)
			authHandler := handlers.NewAuthHandler(userService)

			router := gin.New()
			router.POST("/register", authHandler.Register)

			jsonBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "message")
				assert.Contains(t, response, "user")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestAuthHandler_Login(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		mockSetup      func(sqlmock.Sqlmock)
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "successful login",
			requestBody: map[string]interface{}{
				"username": "testuser",
				"password": "password123",
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				// Generate a real bcrypt hash for the password "password123"
				hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
				mock.ExpectQuery("SELECT id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at FROM users WHERE username = \\$1").
					WithArgs("testuser").
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "email", "password_hash", "is_admin", "storage_quota_mb", "created_at", "updated_at"}).
						AddRow(1, "testuser", "test@example.com", string(hashedPassword), false, 10, time.Now(), time.Now()))
			},
			expectedStatus: http.StatusOK,
			expectedError:  false,
		},
		{
			name: "invalid credentials",
			requestBody: map[string]interface{}{
				"username": "testuser",
				"password": "wrongpassword",
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at FROM users WHERE username = \\$1").
					WithArgs("testuser").
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "email", "password_hash", "is_admin", "storage_quota_mb", "created_at", "updated_at"}).
						AddRow(1, "testuser", "test@example.com", "$2a$10$hashedpassword", false, 10, time.Now(), time.Now()))
			},
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
		{
			name: "user not found",
			requestBody: map[string]interface{}{
				"username": "nonexistent",
				"password": "password123",
			},
			mockSetup: func(mock sqlmock.Sqlmock) {
				mock.ExpectQuery("SELECT id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at FROM users WHERE username = \\$1").
					WithArgs("nonexistent").
					WillReturnRows(sqlmock.NewRows([]string{"id", "username", "email", "password_hash", "is_admin", "storage_quota_mb", "created_at", "updated_at"}))
			},
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

			userService := services.NewUserService(db)
			authHandler := handlers.NewAuthHandler(userService)

			router := gin.New()
			router.POST("/login", authHandler.Login)

			jsonBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			} else {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "token")
				assert.Contains(t, response, "user")
			}

			assert.NoError(t, mock.ExpectationsWereMet())
		})
	}
}
