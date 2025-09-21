package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"filevault/internal/models"
	"filevault/internal/services"

	"github.com/gin-gonic/gin"
)

type FileHandler struct {
	fileService *services.FileService
}

func NewFileHandler(fileService *services.FileService) *FileHandler {
	return &FileHandler{fileService: fileService}
}

func (h *FileHandler) UploadFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse form data
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("Multipart form error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form data: " + err.Error()})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	// Validate file count
	if len(files) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 10 files allowed per upload"})
		return
	}

	var uploadReq models.FileUploadRequest
	uploadReq.IsPublic = c.PostForm("is_public") == "true"
	uploadReq.Tags = c.PostFormArray("tags")

	// Clean and validate tags
	var cleanTags []string
	for _, tag := range uploadReq.Tags {
		cleanTag := strings.TrimSpace(tag)
		if cleanTag != "" && len(cleanTag) <= 50 {
			cleanTags = append(cleanTags, cleanTag)
		}
	}
	uploadReq.Tags = cleanTags

	if folderIDStr := c.PostForm("folder_id"); folderIDStr != "" {
		if folderID, err := strconv.Atoi(folderIDStr); err == nil {
			uploadReq.FolderID = &folderID
		}
	}

	log.Printf("Uploading %d files for user %d", len(files), userID)

	var uploadedFiles []models.File
	var errors []string

	for _, fileHeader := range files {
		// Validate file size (100MB max)
		if fileHeader.Size > 100*1024*1024 {
			errors = append(errors, "File '"+fileHeader.Filename+"' exceeds 100MB limit")
			continue
		}

		// Validate filename
		if len(fileHeader.Filename) > 255 {
			errors = append(errors, "File '"+fileHeader.Filename+"' has filename too long")
			continue
		}

		file, err := h.fileService.UploadFile(userID.(int), fileHeader, uploadReq)
		if err != nil {
			log.Printf("Upload error for file %s: %v", fileHeader.Filename, err)
			errors = append(errors, "Failed to upload '"+fileHeader.Filename+"': "+err.Error())
			continue
		}
		uploadedFiles = append(uploadedFiles, *file)
	}

	if len(uploadedFiles) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "No files were uploaded successfully",
			"details": errors,
		})
		return
	}

	response := gin.H{
		"message": "Files uploaded successfully",
		"files":   uploadedFiles,
		"count":   len(uploadedFiles),
	}

	if len(errors) > 0 {
		response["warnings"] = errors
	}

	// Broadcast real-time update
	if WSManager != nil {
		WSManager.Broadcast(WebSocketMessage{
			Type: "file_uploaded",
			Data: gin.H{
				"user_id": userID,
				"files":   uploadedFiles,
				"count":   len(uploadedFiles),
			},
		})
	}

	c.JSON(http.StatusCreated, response)
}

func (h *FileHandler) GetFiles(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var searchReq models.FileSearchRequest
	searchReq.Query = c.Query("search")
	if searchReq.Query == "" {
		searchReq.Query = c.Query("query") // Fallback for backward compatibility
	}
	fmt.Printf("DEBUG: search query = '%s'\n", searchReq.Query)
	searchReq.MimeType = c.Query("mime_type")
	searchReq.Uploader = c.Query("uploader")
	searchReq.StartDate = c.Query("start_date")
	searchReq.EndDate = c.Query("end_date")
	searchReq.SortBy = c.Query("sort_by")
	searchReq.SortOrder = c.Query("sort_order")

	// Debug all query parameters
	fmt.Printf("DEBUG: All query parameters: %+v\n", c.Request.URL.Query())

	if minSizeStr := c.Query("min_size"); minSizeStr != "" {
		if minSize, err := strconv.ParseInt(minSizeStr, 10, 64); err == nil {
			searchReq.MinSize = &minSize
		}
	}

	if maxSizeStr := c.Query("max_size"); maxSizeStr != "" {
		if maxSize, err := strconv.ParseInt(maxSizeStr, 10, 64); err == nil {
			searchReq.MaxSize = &maxSize
		}
	}

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			searchReq.Page = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			searchReq.Limit = limit
		} else {
			searchReq.Limit = 20 // Default limit
		}
	} else {
		searchReq.Limit = 20
	}

	if tags := c.QueryArray("tags"); len(tags) > 0 {
		searchReq.Tags = tags
	}

	if folderIDStr := c.Query("folder_id"); folderIDStr != "" {
		if folderID, err := strconv.Atoi(folderIDStr); err == nil {
			searchReq.FolderID = &folderID
			fmt.Printf("DEBUG: folder_id parameter received: %s, parsed: %d\n", folderIDStr, folderID)
		} else {
			fmt.Printf("DEBUG: failed to parse folder_id: %s, error: %v\n", folderIDStr, err)
		}
	} else {
		fmt.Printf("DEBUG: no folder_id parameter received\n")
	}

	files, err := h.fileService.GetFiles(userID.(int), searchReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"total": len(files),
		"page":  searchReq.Page,
		"limit": searchReq.Limit,
	})
}

func (h *FileHandler) GetFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.Atoi(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	file, err := h.fileService.GetFileByID(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.JSON(http.StatusOK, file)
}

func (h *FileHandler) DeleteFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileIDStr := c.Param("id")
	fileID, err := strconv.Atoi(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	err = h.fileService.DeleteFile(fileID, userID.(int))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Broadcast real-time update
	if WSManager != nil {
		WSManager.Broadcast(WebSocketMessage{
			Type: "file_deleted",
			Data: gin.H{
				"user_id": userID,
				"file_id": fileID,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

func (h *FileHandler) ShareFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileIDStr := c.Param("id")
	fileID, err := strconv.Atoi(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	var req struct {
		IsPublic    bool     `json:"is_public"`
		SharedUsers []string `json:"shared_users"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.fileService.ShareFile(fileID, userID.(int), req.IsPublic, req.SharedUsers)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File sharing updated successfully"})
}

func (h *FileHandler) DownloadFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.Atoi(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	fileData, originalName, err := h.fileService.DownloadFile(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Get file info for headers
	file, err := h.fileService.GetFileByID(fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file info"})
		return
	}

	// Set headers for file download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+originalName)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.Itoa(len(fileData)))

	// Broadcast real-time update for download
	if WSManager != nil {
		WSManager.Broadcast(WebSocketMessage{
			Type: "file_downloaded",
			Data: gin.H{
				"file_id": fileID,
				"file":    file,
			},
		})
	}

	// Write file data to response
	c.Data(http.StatusOK, file.MimeType, fileData)
}

func (h *FileHandler) GetPublicFiles(c *gin.Context) {
	files, err := h.fileService.GetPublicFiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"total": len(files),
	})
}

func (h *FileHandler) DownloadPublicFile(c *gin.Context) {
	fileIDStr := c.Param("id")
	fileID, err := strconv.Atoi(fileIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Get file info first to check if it's public
	file, err := h.fileService.GetFileByID(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Check if file is public
	if !file.IsPublic {
		c.JSON(http.StatusForbidden, gin.H{"error": "File is not public"})
		return
	}

	fileData, originalName, err := h.fileService.DownloadFile(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Set headers for file download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+originalName)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Length", strconv.Itoa(len(fileData)))

	// Broadcast real-time update for download
	if WSManager != nil {
		WSManager.Broadcast(WebSocketMessage{
			Type: "file_downloaded",
			Data: gin.H{
				"file_id": fileID,
				"file":    file,
			},
		})
	}

	// Write file data to response
	c.Data(http.StatusOK, file.MimeType, fileData)
}

func (h *FileHandler) GetFileStats(c *gin.Context) {
	// Check if user is admin
	isAdmin, exists := c.Get("is_admin")
	if !exists || !isAdmin.(bool) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Get all files with download counts
	files, err := h.fileService.GetPublicFiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var totalDownloads int
	var totalSize int64
	for _, file := range files {
		totalDownloads += file.DownloadCount
		totalSize += file.FileSize
	}

	c.JSON(http.StatusOK, gin.H{
		"total_files":      len(files),
		"total_downloads":  totalDownloads,
		"total_size_bytes": totalSize,
		"files":            files,
	})
}

func (h *FileHandler) GetStorageStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	stats, err := h.fileService.GetStorageStats(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *FileHandler) GetDeduplicationStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	stats, err := h.fileService.GetDeduplicationStats(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *FileHandler) GlobalSearch(c *gin.Context) {
	// Check if user is admin
	isAdmin, exists := c.Get("is_admin")
	if !exists || !isAdmin.(bool) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var searchReq models.FileSearchRequest
	if err := c.ShouldBindQuery(&searchReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default pagination
	if searchReq.Limit == 0 {
		searchReq.Limit = 50
	}
	if searchReq.Page == 0 {
		searchReq.Page = 1
	}

	files, err := h.fileService.GlobalSearch(searchReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"total": len(files),
		"page":  searchReq.Page,
		"limit": searchReq.Limit,
	})
}
