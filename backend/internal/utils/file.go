package utils

import (
	"crypto/sha256"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/h2non/filetype"
)

func CalculateFileHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

func ValidateMimeType(filePath string, declaredMimeType string) (bool, string, error) {
	// Get actual MIME type from file content
	file, err := os.Open(filePath)
	if err != nil {
		return false, "", err
	}
	defer file.Close()

	// Read first 512 bytes for MIME type detection
	head := make([]byte, 512)
	_, err = file.Read(head)
	if err != nil && err != io.EOF {
		return false, "", err
	}

	// Detect MIME type from content
	kind, err := filetype.Match(head)
	if err != nil {
		return false, "", err
	}

	actualMimeType := kind.MIME.Value

	// Also check extension-based MIME type
	ext := strings.ToLower(filepath.Ext(filePath))
	extMimeType := mime.TypeByExtension(ext)

	// Validate against declared MIME type
	isValid := actualMimeType == declaredMimeType || 
		(extMimeType != "" && extMimeType == declaredMimeType) ||
		strings.HasPrefix(actualMimeType, strings.Split(declaredMimeType, "/")[0])

	return isValid, actualMimeType, nil
}

func GetFileExtension(mimeType string) string {
	ext := mime.TypeByExtension("." + mimeType)
	if ext == "" {
		// Common MIME type mappings
		mimeMap := map[string]string{
			"image/jpeg": ".jpg",
			"image/png":  ".png",
			"image/gif":  ".gif",
			"image/webp": ".webp",
			"application/pdf": ".pdf",
			"text/plain": ".txt",
			"application/json": ".json",
			"text/html": ".html",
			"application/zip": ".zip",
		}
		if ext, exists := mimeMap[mimeType]; exists {
			return ext
		}
		return ".bin"
	}
	return ext
}

func EnsureDir(dirPath string) error {
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		return os.MkdirAll(dirPath, 0755)
	}
	return nil
}

func GetFileSize(filePath string) (int64, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return 0, err
	}

	return stat.Size(), nil
}

// CalculateHashFromData calculates SHA256 hash from byte data
func CalculateHashFromData(data []byte) (string, error) {
	hash := sha256.New()
	_, err := hash.Write(data)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

// DetectMimeTypeFromData detects MIME type from byte data
func DetectMimeTypeFromData(data []byte) string {
	// Read first 512 bytes for MIME type detection
	head := data
	if len(data) > 512 {
		head = data[:512]
	}

	// Detect MIME type from content
	kind, err := filetype.Match(head)
	if err != nil {
		// Fallback to http.DetectContentType
		return "application/octet-stream"
	}

	return kind.MIME.Value
}
