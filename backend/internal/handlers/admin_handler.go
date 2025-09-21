package handlers

import (
	"net/http"
	"strconv"

	"filevault/internal/services"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminService  *services.AdminService
	fileService   *services.FileService
	userService   *services.UserService
	folderService *services.FolderService
}

func NewAdminHandler(adminService *services.AdminService, fileService *services.FileService, userService *services.UserService, folderService *services.FolderService) *AdminHandler {
	return &AdminHandler{
		adminService:  adminService,
		fileService:   fileService,
		userService:   userService,
		folderService: folderService,
	}
}

// GetAllFiles returns all files in the system with uploader details
func (h *AdminHandler) GetAllFiles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	sortBy := c.Query("sort_by")
	sortOrder := c.Query("sort_order")

	files, total, err := h.adminService.GetAllFilesForAdmin(page, limit, search, sortBy, sortOrder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetFileDetails returns detailed information about a specific file
func (h *AdminHandler) GetFileDetails(c *gin.Context) {
	fileID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	file, err := h.fileService.GetFileDetailsForAdmin(fileID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"file": file})
}

// GetSystemStats returns comprehensive system statistics
func (h *AdminHandler) GetSystemStats(c *gin.Context) {
	stats, err := h.adminService.GetSystemStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// GetUserStats returns statistics for all users
func (h *AdminHandler) GetUserStats(c *gin.Context) {
	stats, err := h.adminService.GetAllUserStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": stats})
}

// GetTopFiles returns most downloaded files
func (h *AdminHandler) GetTopFiles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	files, err := h.adminService.GetTopDownloadedFiles(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"files": files})
}

// GetRecentActivity returns recent file uploads and downloads
func (h *AdminHandler) GetRecentActivity(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	activity, err := h.adminService.GetRecentActivity(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"activity": activity})
}

// DeleteFile allows admins to delete any file
func (h *AdminHandler) DeleteFile(c *gin.Context) {
	fileID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	err = h.fileService.DeleteFileAsAdmin(fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// ShareFileWithUser allows admins to share files with specific users
func (h *AdminHandler) ShareFileWithUser(c *gin.Context) {
	fileID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	var req struct {
		Username   string `json:"username" binding:"required"`
		Permission string `json:"permission" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.fileService.ShareFileWithUser(fileID, req.Username, req.Permission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File shared successfully"})
}

// GetFileShares returns all shares for a specific file
func (h *AdminHandler) GetFileShares(c *gin.Context) {
	fileID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	shares, err := h.fileService.GetFileShares(fileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shares": shares})
}
