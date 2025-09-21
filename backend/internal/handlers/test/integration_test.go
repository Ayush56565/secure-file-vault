package test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"filevault/internal/handlers"
	"filevault/internal/services"
	"filevault/internal/utils"
)

func TestAuthHandler_RegisterIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a real database connection for integration test
	db, err := utils.ConnectDB()
	if err != nil {
		t.Skip("Database not available for integration test")
	}
	defer db.Close()

	userService := services.NewUserService(db)
	authHandler := handlers.NewAuthHandler(userService)

	router := gin.New()
	router.POST("/register", authHandler.Register)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "invalid request body",
			requestBody: map[string]interface{}{
				"username": "",
				"password": "",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
		{
			name: "missing required fields",
			requestBody: map[string]interface{}{
				"username": "testuser",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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
			}
		})
	}
}

func TestAuthHandler_LoginIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a real database connection for integration test
	db, err := utils.ConnectDB()
	if err != nil {
		t.Skip("Database not available for integration test")
	}
	defer db.Close()

	userService := services.NewUserService(db)
	authHandler := handlers.NewAuthHandler(userService)

	router := gin.New()
	router.POST("/login", authHandler.Login)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  bool
	}{
		{
			name: "missing credentials",
			requestBody: map[string]interface{}{
				"username": "",
				"password": "",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
		{
			name: "missing username",
			requestBody: map[string]interface{}{
				"password": "password123",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
		{
			name: "missing password",
			requestBody: map[string]interface{}{
				"username": "testuser",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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
			}
		})
	}
}

func TestFileHandler_GetPublicFilesIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a real database connection for integration test
	db, err := utils.ConnectDB()
	if err != nil {
		t.Skip("Database not available for integration test")
	}
	defer db.Close()

	fileService := services.NewFileService(db, "/tmp")
	fileHandler := handlers.NewFileHandler(fileService)

	router := gin.New()
	router.GET("/files/public", fileHandler.GetPublicFiles)

	req, _ := http.NewRequest("GET", "/files/public", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 even if no files exist
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response, "files")
	assert.Contains(t, response, "total")
}

func TestMiddleware_RateLimitIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(handlers.RateLimitMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Test that the endpoint works
	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "success", response["message"])
}

func TestMiddleware_AuthIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(handlers.AuthMiddleware())
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectedError  bool
	}{
		{
			name:           "missing token",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
		{
			name:           "invalid token format",
			authHeader:     "InvalidFormat",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
		{
			name:           "invalid token",
			authHeader:     "Bearer invalid-token",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/protected", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			}
		})
	}
}
