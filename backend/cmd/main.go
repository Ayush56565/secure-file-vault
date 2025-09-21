package main

import (
	"log"
	"net/http"
	"os"

	"filevault/internal/handlers"
	"filevault/internal/services"
	"filevault/internal/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	// Connect to database
	db, err := utils.ConnectDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Run migrations
	err = utils.RunMigrations(db)
	if err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Get upload directory from environment
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}

	// Ensure upload directory exists
	err = utils.EnsureDir(uploadDir)
	if err != nil {
		log.Fatal("Failed to create upload directory:", err)
	}

	// Initialize services
	userService := services.NewUserService(db)
	fileService := services.NewFileService(db, uploadDir)
	folderService := services.NewFolderService(db)
	adminService := services.NewAdminService(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService)
	fileHandler := handlers.NewFileHandler(fileService)
	folderHandler := handlers.NewFolderHandler(folderService)
	adminHandler := handlers.NewAdminHandler(adminService, fileService, userService, folderService)

	// Setup Gin router
	r := gin.Default()

	// Set file size limits (100MB max for production)
	r.MaxMultipartMemory = 100 << 20 // 100 MB

	// Add CORS middleware
	r.Use(handlers.CORSMiddleware())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "secure-file-vault-backend",
			"version": "1.0.0",
		})
	})

	// Public routes
	r.POST("/api/auth/register", authHandler.Register)
	r.POST("/api/auth/login", authHandler.Login)
	r.POST("/api/auth/create-admin", authHandler.CreateAdminUser)
	r.GET("/api/files/public", fileHandler.GetPublicFiles)
	r.GET("/api/files/public/:id/download", fileHandler.DownloadPublicFile)
	r.GET("/ws", handlers.WSManager.HandleWebSocket)

	// Protected routes
	api := r.Group("/api")
	api.Use(handlers.AuthMiddleware())
	api.Use(handlers.RateLimitMiddleware())

	// Auth routes
	api.GET("/auth/profile", authHandler.GetProfile)
	api.GET("/auth/stats", authHandler.GetStats)
	api.GET("/auth/validate", authHandler.ValidateSession)

	// File routes
	api.POST("/files/upload", fileHandler.UploadFile)
	api.GET("/files", fileHandler.GetFiles)
	api.GET("/files/:id", fileHandler.GetFile)
	api.DELETE("/files/:id", fileHandler.DeleteFile)
	api.GET("/files/:id/download", fileHandler.DownloadFile)
	api.PUT("/files/:id/share", fileHandler.ShareFile)
	api.GET("/files/storage/stats", fileHandler.GetStorageStats)
	api.GET("/files/storage/deduplication", fileHandler.GetDeduplicationStats)

	// Folder routes
	api.GET("/folders", folderHandler.GetFolders)
	api.GET("/folders/:id", folderHandler.GetFolder)
	api.POST("/folders", folderHandler.CreateFolder)
	api.PUT("/folders/:id", folderHandler.UpdateFolder)
	api.DELETE("/folders/:id", folderHandler.DeleteFolder)
	api.PUT("/folders/:id/share", folderHandler.ShareFolder)
	api.GET("/folders/shared", folderHandler.GetSharedFolders)
	api.GET("/folders/stats", folderHandler.GetFolderStats)

	// Admin routes
	admin := api.Group("/admin")
	admin.Use(handlers.AdminMiddleware())
	admin.GET("/users", authHandler.GetAllUsers)
	admin.GET("/files", adminHandler.GetAllFiles)
	admin.GET("/files/:id", adminHandler.GetFileDetails)
	admin.DELETE("/files/:id", adminHandler.DeleteFile)
	admin.POST("/files/:id/share", adminHandler.ShareFileWithUser)
	admin.GET("/files/:id/shares", adminHandler.GetFileShares)
	admin.GET("/stats", adminHandler.GetSystemStats)
	admin.GET("/users/stats", adminHandler.GetUserStats)
	admin.GET("/files/top", adminHandler.GetTopFiles)
	admin.GET("/activity", adminHandler.GetRecentActivity)
	admin.PUT("/users/quota", authHandler.UpdateQuota)
	admin.GET("/files/stats", fileHandler.GetFileStats)
	admin.GET("/files/search", fileHandler.GlobalSearch)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(r.Run(":" + port))
}
