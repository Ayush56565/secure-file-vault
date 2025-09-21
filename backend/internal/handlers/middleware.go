package handlers

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"filevault/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix if present
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := utils.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("is_admin", claims.IsAdmin)
		c.Next()
	}
}

func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.Next()
			return
		}

		// Remove "Bearer " prefix if present
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := utils.ValidateJWT(token)
		if err != nil {
			c.Next()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("is_admin", claims.IsAdmin)
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("is_admin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func RateLimitMiddleware() gin.HandlerFunc {
	// Simple in-memory rate limiter with proper synchronization
	// In production, use Redis or similar
	var (
		rateLimitMap = make(map[string]map[string]int)
		windowMap    = make(map[string]map[string]time.Time)
		mutex        = &sync.RWMutex{}
	)

	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		userIDStr := strconv.Itoa(userID.(int))
		endpoint := c.Request.URL.Path
		now := time.Now()

		mutex.Lock()
		// Initialize maps for user if not exists
		if rateLimitMap[userIDStr] == nil {
			rateLimitMap[userIDStr] = make(map[string]int)
			windowMap[userIDStr] = make(map[string]time.Time)
		}

		// Check if window has expired (1 second window)
		if now.Sub(windowMap[userIDStr][endpoint]) > time.Second {
			rateLimitMap[userIDStr][endpoint] = 0
			windowMap[userIDStr][endpoint] = now
		}

		// Check rate limit (2 requests per second)
		if rateLimitMap[userIDStr][endpoint] >= 2 {
			mutex.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
			c.Abort()
			return
		}

		// Increment counter
		rateLimitMap[userIDStr][endpoint]++
		mutex.Unlock()

		c.Next()
	}
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Allow specific origins for production
		allowedOrigins := []string{
			"https://secure-file-vault-frontend.onrender.com",
			"http://localhost:3000",
			"http://localhost:5173",
			"http://127.0.0.1:3000",
			"http://127.0.0.1:5173",
		}
		
		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}
		
		// If origin is allowed or it's a direct request (no origin header), set CORS headers
		if allowed || origin == "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			// Fallback to wildcard for development/testing
			c.Header("Access-Control-Allow-Origin", "*")
		}
		
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400") // 24 hours

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
